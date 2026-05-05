-- ============================================================================
-- سماراتس v3 — دعم ETag (البصمة) + RPC موحّد للشاشة
-- الملف 6 — يُنفّذ بعد الملفات 01..05
-- ============================================================================
-- الفكرة:
--   بدلاً من إرسال القائمة الكاملة (~50KB) كل 10 ثوانٍ، نرسل بصمة
--   صغيرة (~80 byte). إذا تطابقت بصمة العميل مع بصمة السيرفر،
--   لا نرجع شيئاً. إذا اختلفت، نرجع القائمة الكاملة.
--   النتيجة: توفير ~99٪ من Egress على Supabase.
-- ============================================================================

-- ============================================================================
-- (1) إضافة updated_at على playlist_items (لم يكن موجوداً)
--     ضروري لحساب البصمة بدقة عند تعديل عنصر
-- ============================================================================

-- نضيف العمود بدون DEFAULT NOT NULL مؤقتاً
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'playlist_items'
      and column_name = 'updated_at'
  ) then
    -- نضيف nullable أولاً
    alter table public.playlist_items add column updated_at timestamptz;
    -- نملأ القيم القديمة من created_at (يعكس وقت الإنشاء الفعلي)
    update public.playlist_items set updated_at = created_at where updated_at is null;
    -- ثم نقفل بـ NOT NULL + DEFAULT للسجلات الجديدة
    alter table public.playlist_items alter column updated_at set not null;
    alter table public.playlist_items alter column updated_at set default now();
  end if;
end $$;

-- محفز التحديث التلقائي
drop trigger if exists trg_playlist_items_updated_at on public.playlist_items;
create trigger trg_playlist_items_updated_at
  before update on public.playlist_items
  for each row execute function public.set_updated_at();

-- فهرس لتسريع حساب max(updated_at) ضمن قائمة
create index if not exists idx_playlist_items_pl_updated
  on public.playlist_items(playlist_id, updated_at desc);

-- ============================================================================
-- (2) دالة حساب بصمة قائمة العرض
--     التركيب: count:max_updated_at_epoch:order_hash
--     - count يكشف الإضافة/الحذف
--     - max_updated_at يكشف التعديل على عنصر موجود
--     - order_hash يكشف إعادة الترتيب (md5 من id||order_index لكل عنصر)
-- ============================================================================
create or replace function public.compute_playlist_fingerprint(_playlist_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select format(
        '%s:%s:%s',
        count(*)::text,
        coalesce(extract(epoch from max(pi.updated_at))::bigint, 0)::text,
        md5(string_agg(pi.id::text || ':' || pi.order_index::text, ','
                       order by pi.order_index, pi.id))
      )
      from public.playlist_items pi
      where pi.playlist_id = _playlist_id
    ),
    '0:0:empty'  -- قائمة فارغة أو غير موجودة
  );
$$;

grant execute on function public.compute_playlist_fingerprint(uuid)
  to anon, authenticated;

-- ============================================================================
-- (3) الدالة الموحّدة الكبرى للشاشة العامة
--     تجمع: حالة الشاشة + الجهة + الاشتراك + البصمة + (اختيارياً) العناصر
--     الإدخال:
--       _public_id: المعرف العام للشاشة
--       _client_fingerprint: بصمة الشاشة الحالية (null في أول استدعاء)
--     الإخراج JSON:
--       {
--         "screen": { id, name, is_active, has_password },
--         "org_active": bool,
--         "subscription_active": bool,
--         "subscription_end_date": date,
--         "fingerprint": "...",
--         "changed": bool,           -- true إذا اختلفت عن العميل
--         "items": [...] | null      -- null إذا لم تتغير
--       }
-- ============================================================================
create or replace function public.get_public_screen_state(
  _public_id text,
  _client_fingerprint text default null
)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _screen record;
  _org record;
  _fingerprint text;
  _changed boolean;
  _items json;
  _result json;
begin
  -- جلب الشاشة + الجهة في استعلام واحد
  select
    s.id, s.name, s.is_active, s.playlist_id,
    (s.password_hash is not null) as has_password,
    o.id as org_id, o.status as org_status, o.subscription_end_date
  into _screen
  from public.screens s
  join public.organizations o on o.id = s.organization_id
  where s.public_id = _public_id;

  -- شاشة غير موجودة
  if not found then
    return json_build_object(
      'error', 'not_found',
      'changed', false,
      'fingerprint', null,
      'items', null
    );
  end if;

  -- حساب الحالات
  _result := json_build_object(
    'screen', json_build_object(
      'id', _screen.id,
      'name', _screen.name,
      'is_active', _screen.is_active,
      'has_password', _screen.has_password,
      'playlist_id', _screen.playlist_id
    ),
    'org_active', (_screen.org_status = 'active'),
    'subscription_active', (
      _screen.org_status = 'active'
      and _screen.subscription_end_date is not null
      and _screen.subscription_end_date >= current_date
    ),
    'subscription_end_date', _screen.subscription_end_date
  );

  -- إذا الشاشة معطّلة أو الجهة معلّقة أو الاشتراك منتهي → لا داعي لجلب العناصر
  if not _screen.is_active
     or _screen.org_status != 'active'
     or _screen.subscription_end_date is null
     or _screen.subscription_end_date < current_date
     or _screen.playlist_id is null then
    return _result::jsonb || jsonb_build_object(
      'fingerprint', '0:0:disabled',
      'changed', (_client_fingerprint is distinct from '0:0:disabled'),
      'items', null
    );
  end if;

  -- حساب البصمة الحالية للقائمة
  _fingerprint := public.compute_playlist_fingerprint(_screen.playlist_id);
  _changed := (_client_fingerprint is null
               or _client_fingerprint is distinct from _fingerprint);

  -- إذا لم تتغير → لا نجلب العناصر (التوفير الكبير هنا)
  if not _changed then
    return _result::jsonb || jsonb_build_object(
      'fingerprint', _fingerprint,
      'changed', false,
      'items', null
    );
  end if;

  -- تغيرت → نجلب العناصر كاملة
  select json_agg(
    json_build_object(
      'id', pi.id,
      'title', pi.title,
      'original_url', pi.original_url,
      'resolved_url', pi.resolved_url,
      'item_type', pi.item_type,
      'duration_seconds', pi.duration_seconds,
      'order_index', pi.order_index
    )
    order by pi.order_index, pi.id
  )
  into _items
  from public.playlist_items pi
  where pi.playlist_id = _screen.playlist_id;

  -- تحديث last_used_at (best effort)
  begin
    update public.playlists
    set last_used_at = now()
    where id = _screen.playlist_id;
  exception when others then
    null;
  end;

  return _result::jsonb || jsonb_build_object(
    'fingerprint', _fingerprint,
    'changed', true,
    'items', coalesce(_items, '[]'::json)
  );
end;
$$;

grant execute on function public.get_public_screen_state(text, text)
  to anon, authenticated;

-- ============================================================================
-- (4) ملاحظة: نُبقي الدوال القديمة (get_public_screen, get_public_playlist_items)
--     لتوافق رجعي. PlayerPage الجديد يستخدم get_public_screen_state فقط.
--     يمكن حذف القديم لاحقاً بعد التأكد من نشر الواجهة.
-- ============================================================================

-- ============================================================================
-- انتهى
-- اختبار سريع بعد التنفيذ:
--   select public.get_public_screen_state('PUBLIC_ID_HERE', null);
--   select public.get_public_screen_state('PUBLIC_ID_HERE', 'wrong_fingerprint');
--   (الأول يرجع items، الثاني أيضاً لأن البصمة لا تطابق)
--   ثم انسخ fingerprint من النتيجة وأعد الاستدعاء بها → يجب أن يعطي changed:false
-- ============================================================================
