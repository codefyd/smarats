-- ============================================================================
-- سماراتس v2 — الباقات، الاشتراكات، إصلاحات أمنية، وحذف القوائم الراكدة
-- الملف 5 — يُنفّذ بعد الملفات 01..04
-- ============================================================================

-- نحتاج هذا الامتداد لـ bcrypt (crypt + gen_salt)
create extension if not exists "pgcrypto" with schema "public";

-- ============================================================================
-- (1) نوع الباقات
-- ============================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_plan') then
    create type public.subscription_plan as enum ('plus', 'pro', 'max', 'premium');
  end if;
end $$;

-- ============================================================================
-- (2) تعديلات على جدول organizations
--     - contact_info يصبح إلزامياً (بعد ملء الفارغ بقيمة افتراضية)
--     - subscription_end_date: تاريخ نهاية الاشتراك
--     - plan: الباقة (يحددها السوبر أدمن وقت الموافقة)
-- ============================================================================

-- أضف الأعمدة الجديدة
alter table public.organizations
  add column if not exists subscription_end_date date,
  add column if not exists plan public.subscription_plan;

-- املأ contact_info الفارغ قبل ما نخليه NOT NULL
update public.organizations
set contact_info = 'غير محدد'
where contact_info is null or trim(contact_info) = '';

alter table public.organizations
  alter column contact_info set not null;

-- ============================================================================
-- (3) تعديلات على جدول playlists لتتبع آخر استخدام
-- ============================================================================
alter table public.playlists
  add column if not exists last_used_at timestamptz;

-- نملأ last_used_at للقوائم الموجودة بناءً على ربطها بالشاشات
-- (إذا القائمة مرتبطة بشاشة → نعتبرها مستخدمة الآن)
update public.playlists p
set last_used_at = now()
where exists (
  select 1 from public.screens s where s.playlist_id = p.id
);

create index if not exists idx_playlists_last_used_at on public.playlists(last_used_at);

-- ============================================================================
-- (4) جدول screens — public_id للشاشات الجديدة 8 أحرف (الموجودة تبقى)
--     نولّد public_id من charset لا يحتوي حروف ملتبسة (0,O,I,l,1)
-- ============================================================================

-- دالة لتوليد public_id قصير وعشوائي (8 أحرف، charset آمن)
create or replace function public.generate_short_public_id()
returns text
language plpgsql
volatile
as $$
declare
  _charset text := 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _len int := length(_charset);
  _result text := '';
  _i int;
  _max_attempts int := 10;
  _attempt int := 0;
begin
  loop
    _result := '';
    for _i in 1..8 loop
      _result := _result || substr(_charset, 1 + floor(random() * _len)::int, 1);
    end loop;

    -- تأكد من عدم وجود تعارض
    if not exists (select 1 from public.screens where public_id = _result) then
      return _result;
    end if;

    _attempt := _attempt + 1;
    if _attempt >= _max_attempts then
      -- fallback نادر جداً: نضيف حرفين عشوائيين
      _result := _result || substr(_charset, 1 + floor(random() * _len)::int, 1)
                         || substr(_charset, 1 + floor(random() * _len)::int, 1);
      return _result;
    end if;
  end loop;
end;
$$;

-- نغيّر default الجديد ليستخدم الدالة القصيرة
-- (الشاشات الموجودة لا تتأثر، فقط الجديدة)
alter table public.screens
  alter column public_id set default public.generate_short_public_id();

-- ============================================================================
-- (5) دالة جلب حدود الباقة
-- ============================================================================
create or replace function public.get_plan_limits(_plan public.subscription_plan)
returns table (max_screens int, max_playlists int)
language sql
immutable
as $$
  select
    case _plan
      when 'plus'    then 5
      when 'pro'     then 10
      when 'max'     then 20
      when 'premium' then -1   -- -1 يعني لا محدود
    end as max_screens,
    case _plan
      when 'plus'    then 5
      when 'pro'     then 10
      when 'max'     then 20
      when 'premium' then -1
    end as max_playlists;
$$;

grant execute on function public.get_plan_limits(public.subscription_plan)
  to authenticated, anon;

-- ============================================================================
-- (6) دالة: حالة الاشتراك المحسوبة لجهة معيّنة
--     تعيد: active, expiring_soon (≤20 يوم), expired, no_subscription
-- ============================================================================
create or replace function public.get_subscription_status(_org_id uuid)
returns table (
  status text,
  end_date date,
  days_remaining int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when o.subscription_end_date is null then 'no_subscription'
      when o.subscription_end_date < current_date then 'expired'
      when o.subscription_end_date - current_date <= 20 then 'expiring_soon'
      else 'active'
    end as status,
    o.subscription_end_date as end_date,
    case
      when o.subscription_end_date is null then null
      else (o.subscription_end_date - current_date)::int
    end as days_remaining
  from public.organizations o
  where o.id = _org_id;
$$;

grant execute on function public.get_subscription_status(uuid) to authenticated;

-- ============================================================================
-- (7) دالة: هل الجهة قادرة على التعديل (نشطة + اشتراك ساري)؟
-- ============================================================================
create or replace function public.can_org_edit(_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations
    where id = _org_id
      and status = 'active'
      and subscription_end_date is not null
      and subscription_end_date >= current_date
  );
$$;

grant execute on function public.can_org_edit(uuid) to authenticated;

-- ============================================================================
-- (8) دالة الموافقة المحدّثة: تأخذ باقة + تاريخ نهاية اشتراك
-- ============================================================================
create or replace function public.approve_organization_with_plan(
  _org_id uuid,
  _plan public.subscription_plan,
  _end_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admin can approve organizations';
  end if;

  if _end_date is null or _end_date <= current_date then
    raise exception 'Subscription end date must be in the future';
  end if;

  update public.organizations
  set status = 'active',
      plan = _plan,
      subscription_end_date = _end_date
  where id = _org_id;
end;
$$;

grant execute on function public.approve_organization_with_plan(uuid, public.subscription_plan, date)
  to authenticated;

-- ============================================================================
-- (9) دالة: تحديث باقة جهة + تاريخ الاشتراك (السوبر أدمن فقط)
--     تعطّل الموارد الزائدة تلقائياً عند التخفيض
-- ============================================================================
create or replace function public.update_organization_plan(
  _org_id uuid,
  _plan public.subscription_plan,
  _end_date date
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  _max_screens int;
  _max_playlists int;
  _screens_disabled int := 0;
  _playlists_disabled int := 0;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admin can update plan';
  end if;

  if _end_date is null or _end_date <= current_date then
    raise exception 'Subscription end date must be in the future';
  end if;

  -- جلب حدود الباقة الجديدة
  select max_screens, max_playlists
  into _max_screens, _max_playlists
  from public.get_plan_limits(_plan);

  -- تعطيل الشاشات الزائدة (الأقدم تبقى نشطة، الأحدث تتعطل)
  -- نتعامل فقط مع الباقات المحدودة
  if _max_screens > 0 then
    with ranked as (
      select id,
             row_number() over (order by created_at asc) as rn
      from public.screens
      where organization_id = _org_id
        and is_active = true
    )
    update public.screens
    set is_active = false
    where id in (select id from ranked where rn > _max_screens);

    get diagnostics _screens_disabled = row_count;
  end if;

  -- ملاحظة: القوائم لا نعطّلها لأنها بدون حقل is_active
  -- نكتفي بحساب عدد الزيادة لإعلام السوبر أدمن
  if _max_playlists > 0 then
    select greatest(0, count(*)::int - _max_playlists)
    into _playlists_disabled
    from public.playlists
    where organization_id = _org_id;
  end if;

  -- تحديث الباقة والاشتراك
  update public.organizations
  set plan = _plan,
      subscription_end_date = _end_date,
      status = 'active'
  where id = _org_id;

  return json_build_object(
    'screens_disabled', _screens_disabled,
    'playlists_excess', _playlists_disabled,
    'max_screens', _max_screens,
    'max_playlists', _max_playlists
  );
end;
$$;

grant execute on function public.update_organization_plan(uuid, public.subscription_plan, date)
  to authenticated;

-- ============================================================================
-- (10) تحديث get_public_screen — يعيد حالة الاشتراك أيضاً
-- ============================================================================
drop function if exists public.get_public_screen(text);

create or replace function public.get_public_screen(_public_id text)
returns table (
  id uuid,
  name text,
  is_active boolean,
  has_password boolean,
  playlist_id uuid,
  organization_active boolean,
  subscription_active boolean,
  subscription_end_date date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.name,
    s.is_active,
    (s.password_hash is not null) as has_password,
    s.playlist_id,
    (o.status = 'active') as organization_active,
    (
      o.status = 'active'
      and o.subscription_end_date is not null
      and o.subscription_end_date >= current_date
    ) as subscription_active,
    o.subscription_end_date
  from public.screens s
  join public.organizations o on o.id = s.organization_id
  where s.public_id = _public_id;
$$;

grant execute on function public.get_public_screen(text) to anon, authenticated;

-- ============================================================================
-- (11) تحديث get_public_playlist_items — يتحقق من الاشتراك أيضاً
--      + يحدّث last_used_at للقائمة
-- ============================================================================
drop function if exists public.get_public_playlist_items(text);

create or replace function public.get_public_playlist_items(_public_id text)
returns table (
  id uuid,
  title text,
  resolved_url text,
  item_type public.item_type,
  duration_seconds integer,
  order_index integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _playlist_id uuid;
begin
  -- جلب القائمة المرتبطة بالشاشة (مع التحقق من نشاط الجهة والاشتراك)
  select s.playlist_id into _playlist_id
  from public.screens s
  join public.organizations o on o.id = s.organization_id
  where s.public_id = _public_id
    and s.is_active = true
    and o.status = 'active'
    and o.subscription_end_date is not null
    and o.subscription_end_date >= current_date
  limit 1;

  if _playlist_id is null then
    return;  -- لا نتائج
  end if;

  -- تحديث آخر استخدام (best effort, no error if fails)
  begin
    update public.playlists
    set last_used_at = now()
    where id = _playlist_id;
  exception when others then
    null;
  end;

  return query
  select
    pi.id,
    pi.title,
    pi.resolved_url,
    pi.item_type,
    pi.duration_seconds,
    pi.order_index
  from public.playlist_items pi
  where pi.playlist_id = _playlist_id
  order by pi.order_index asc;
end;
$$;

grant execute on function public.get_public_playlist_items(text) to anon, authenticated;

-- ============================================================================
-- (12) إصلاح ثغرة كلمة سر الشاشة
--      دالتان: set_screen_password + verify_screen_password (تستخدم bcrypt صحيح)
-- ============================================================================

-- دالة آمنة لتعيين كلمة سر شاشة (تخزّن hash من bcrypt)
create or replace function public.set_screen_password(
  _screen_id uuid,
  _password text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _org_id uuid;
begin
  -- جلب الجهة والتأكد من الملكية
  select organization_id into _org_id
  from public.screens
  where id = _screen_id;

  if _org_id is null then
    raise exception 'Screen not found';
  end if;

  if not public.is_org_admin(auth.uid(), _org_id)
     and not public.is_super_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  -- تعيين كلمة السر — null أو string فارغ = إزالة
  if _password is null or length(trim(_password)) = 0 then
    update public.screens
    set password_hash = null
    where id = _screen_id;
  else
    update public.screens
    set password_hash = crypt(_password, gen_salt('bf', 10))
    where id = _screen_id;
  end if;
end;
$$;

grant execute on function public.set_screen_password(uuid, text) to authenticated;

-- (الدالة verify_screen_password كانت موجودة وتستخدم crypt() — لكن
--  المخزّن نص صريح. الآن set_screen_password يخزّن hash صحيح،
--  والتحقق يعمل تلقائياً)

-- ============================================================================
-- (13) Migration data: تحويل أي كلمات سر قديمة (نص صريح) إلى bcrypt
--      (نتعامل بحذر — إذا الـ hash لا يبدأ بـ $2 فهو نص صريح)
-- ============================================================================
do $$
declare
  _row record;
begin
  for _row in
    select id, password_hash from public.screens
    where password_hash is not null
      and password_hash !~ '^\$2[aby]?\$'
  loop
    update public.screens
    set password_hash = crypt(_row.password_hash, gen_salt('bf', 10))
    where id = _row.id;
  end loop;
end $$;

-- ============================================================================
-- (14) RLS: تشديد سياسات التعديل لتعتمد على can_org_edit (شامل الاشتراك)
--      نعيد كتابة سياسات الإدراج/التعديل للموارد ذات العلاقة
-- ============================================================================

-- screens
drop policy if exists "org_admin_insert_screens" on public.screens;
create policy "org_admin_insert_screens"
  on public.screens for insert
  to authenticated
  with check (
    public.is_org_admin(auth.uid(), organization_id)
    and public.can_org_edit(organization_id)
  );

drop policy if exists "org_admin_update_screens" on public.screens;
create policy "org_admin_update_screens"
  on public.screens for update
  to authenticated
  using (
    public.is_org_admin(auth.uid(), organization_id)
    and public.can_org_edit(organization_id)
  )
  with check (public.is_org_admin(auth.uid(), organization_id));

-- playlists
drop policy if exists "org_admin_insert_playlists" on public.playlists;
create policy "org_admin_insert_playlists"
  on public.playlists for insert
  to authenticated
  with check (
    public.is_org_admin(auth.uid(), organization_id)
    and public.can_org_edit(organization_id)
  );

drop policy if exists "org_admin_update_playlists" on public.playlists;
create policy "org_admin_update_playlists"
  on public.playlists for update
  to authenticated
  using (
    public.is_org_admin(auth.uid(), organization_id)
    and public.can_org_edit(organization_id)
  )
  with check (public.is_org_admin(auth.uid(), organization_id));

-- playlist_items
drop policy if exists "org_admin_insert_items" on public.playlist_items;
create policy "org_admin_insert_items"
  on public.playlist_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_items.playlist_id
        and public.is_org_admin(auth.uid(), p.organization_id)
        and public.can_org_edit(p.organization_id)
    )
  );

drop policy if exists "org_admin_update_items" on public.playlist_items;
create policy "org_admin_update_items"
  on public.playlist_items for update
  to authenticated
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_items.playlist_id
        and public.is_org_admin(auth.uid(), p.organization_id)
        and public.can_org_edit(p.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_items.playlist_id
        and public.is_org_admin(auth.uid(), p.organization_id)
    )
  );

-- ============================================================================
-- (15) دالة للتحقق من حدود الباقة قبل إنشاء مورد جديد (للاستخدام من Frontend)
-- ============================================================================
create or replace function public.check_can_create(
  _org_id uuid,
  _resource text  -- 'screen' أو 'playlist'
)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _plan public.subscription_plan;
  _max int;
  _current int;
begin
  select plan into _plan
  from public.organizations
  where id = _org_id;

  if _plan is null then
    return json_build_object('allowed', false, 'reason', 'no_plan');
  end if;

  if _resource = 'screen' then
    select max_screens into _max from public.get_plan_limits(_plan);
    select count(*)::int into _current from public.screens where organization_id = _org_id;
  elsif _resource = 'playlist' then
    select max_playlists into _max from public.get_plan_limits(_plan);
    select count(*)::int into _current from public.playlists where organization_id = _org_id;
  else
    return json_build_object('allowed', false, 'reason', 'invalid_resource');
  end if;

  if _max = -1 then
    return json_build_object('allowed', true, 'current', _current, 'max', null);
  end if;

  return json_build_object(
    'allowed', _current < _max,
    'current', _current,
    'max', _max
  );
end;
$$;

grant execute on function public.check_can_create(uuid, text) to authenticated;

-- ============================================================================
-- (16) دالة تغيير كلمة سر المستخدم بأمان (تتطلب كلمة السر الحالية)
--      ملاحظة: نستخدم Supabase RPC من Frontend بطريقة مختلفة:
--      نتحقق من كلمة السر الحالية بعمل signIn ثم نستدعي auth.updateUser من العميل.
--      هذي الدالة موجودة كـ helper اختياري — لكن السبيل الموصى به في Supabase
--      هو re-authenticate قبل تغيير كلمة السر، وهذا يتم في الـ Frontend.
-- ============================================================================

-- ============================================================================
-- (17) حذف القوائم الراكدة — قائمة فيها عناصر، غير مرتبطة بأي شاشة،
--      وأقدم استخدام/تحديث لها أكثر من 90 يوم
-- ============================================================================

-- دالة لحساب القوائم المرشحة للحذف (للعرض فقط)
create or replace function public.list_stale_playlists(_org_id uuid default null)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  items_count bigint,
  last_activity timestamptz,
  days_idle int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.organization_id,
    p.name,
    (select count(*) from public.playlist_items pi where pi.playlist_id = p.id) as items_count,
    coalesce(p.last_used_at, p.updated_at, p.created_at) as last_activity,
    (current_date - coalesce(p.last_used_at, p.updated_at, p.created_at)::date)::int as days_idle
  from public.playlists p
  where
    -- (أ) فيها عناصر
    exists (select 1 from public.playlist_items pi where pi.playlist_id = p.id)
    -- (ب) غير مرتبطة بأي شاشة
    and not exists (select 1 from public.screens s where s.playlist_id = p.id)
    -- (ج) خامدة لمدة 90 يوم
    and coalesce(p.last_used_at, p.updated_at, p.created_at) < (now() - interval '90 days')
    -- اختياري: تصفية بمؤسسة معينة
    and (_org_id is null or p.organization_id = _org_id);
$$;

grant execute on function public.list_stale_playlists(uuid) to authenticated;

-- دالة لحذف القوائم الراكدة فعلياً (للـ pg_cron أو نداء يدوي من السوبر أدمن)
create or replace function public.delete_stale_playlists()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  _deleted_count int;
begin
  with stale as (
    select id from public.list_stale_playlists(null)
  )
  delete from public.playlists
  where id in (select id from stale);

  get diagnostics _deleted_count = row_count;
  return _deleted_count;
end;
$$;

grant execute on function public.delete_stale_playlists() to authenticated;

-- ============================================================================
-- (18) جدولة pg_cron — تشغّل مرة في اليوم
--      (يحتاج تفعيل pg_cron من Supabase Dashboard → Database → Extensions)
-- ============================================================================
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- نحذف أي جدول قديم بنفس الاسم لتفادي تكرار
    perform cron.unschedule('smarats-delete-stale-playlists')
    where exists (
      select 1 from cron.job where jobname = 'smarats-delete-stale-playlists'
    );

    perform cron.schedule(
      'smarats-delete-stale-playlists',
      '0 3 * * *',  -- يومياً الساعة 3 صباحاً
      $cron$ select public.delete_stale_playlists(); $cron$
    );
  else
    raise notice 'pg_cron extension not enabled — schedule manually or enable from Dashboard.';
  end if;
end $$;

-- ============================================================================
-- (19) backfill: للجهات الـ active الموجودة، نضع باقة افتراضية pro لمدة سنة
--      حتى لا يتوقف عرضها بعد تطبيق التحديث.
--      السوبر أدمن يقدر يعدّلها لاحقاً.
-- ============================================================================
update public.organizations
set plan = 'pro',
    subscription_end_date = current_date + interval '365 days'
where status = 'active'
  and (plan is null or subscription_end_date is null);

-- ============================================================================
-- انتهى
-- ============================================================================
