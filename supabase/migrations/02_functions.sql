-- ============================================================================
-- سماراتس — الملف 2 من 4: دوال الصلاحيات (SECURITY DEFINER)
-- ============================================================================
-- هذه الدوال تُستخدم في سياسات RLS لتجنب الـ recursive policies
-- ============================================================================

-- هل المستخدم الحالي هو سوبر أدمن؟
create or replace function public.is_super_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = 'super_admin'
  );
$$;

-- هل المستخدم الحالي أدمن للجهة المحددة؟
create or replace function public.is_org_admin(_user_id uuid, _org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = 'org_admin'
      and organization_id = _org_id
  );
$$;

-- جلب جهة المستخدم (إذا كان أدمن جهة)
create or replace function public.get_user_org(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.user_roles
  where user_id = _user_id
    and role = 'org_admin'
  limit 1;
$$;

-- هل الجهة نشطة؟ (نحتاجها للتحقق قبل السماح بأي عمليات)
create or replace function public.is_org_active(_org_id uuid)
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
  );
$$;

-- ============================================================================
-- دالة مساعدة: إنشاء جهة + دور أدمن في معاملة واحدة (تُستدعى من التطبيق)
-- ============================================================================
create or replace function public.register_organization(
  _name text,
  _org_type public.org_type,
  _contact_info text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _org_id uuid;
  _user_id uuid;
begin
  _user_id := auth.uid();
  if _user_id is null then
    raise exception 'Must be authenticated';
  end if;

  -- منع تسجيل المستخدم لأكثر من جهة
  if exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = 'org_admin'
  ) then
    raise exception 'User already has an organization';
  end if;

  -- إنشاء الجهة بحالة pending
  insert into public.organizations (name, org_type, contact_info, created_by, status)
  values (_name, _org_type, _contact_info, _user_id, 'pending')
  returning id into _org_id;

  -- إسناد دور أدمن الجهة للمستخدم
  insert into public.user_roles (user_id, role, organization_id)
  values (_user_id, 'org_admin', _org_id);

  return _org_id;
end;
$$;

-- ============================================================================
-- دالة: الموافقة على جهة (للسوبر أدمن فقط)
-- ============================================================================
create or replace function public.approve_organization(_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admin can approve organizations';
  end if;

  update public.organizations
  set status = 'active'
  where id = _org_id;
end;
$$;

-- ============================================================================
-- دالة: تعليق / رفض جهة (للسوبر أدمن فقط)
-- ============================================================================
create or replace function public.set_organization_status(
  _org_id uuid,
  _status public.org_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admin can change organization status';
  end if;

  update public.organizations
  set status = _status
  where id = _org_id;
end;
$$;

-- ============================================================================
-- دالة عامة: جلب شاشة بواسطة public_id (بدون مصادقة، للاعب)
-- تعيد فقط البيانات اللازمة للعرض (بدون password_hash)
-- ============================================================================
create or replace function public.get_public_screen(_public_id text)
returns table (
  id uuid,
  name text,
  is_active boolean,
  has_password boolean,
  playlist_id uuid,
  organization_active boolean
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
    (o.status = 'active') as organization_active
  from public.screens s
  join public.organizations o on o.id = s.organization_id
  where s.public_id = _public_id;
$$;

-- ============================================================================
-- دالة عامة: جلب عناصر قائمة العرض لشاشة (بدون مصادقة)
-- تتحقق أن الشاشة مفعلة والجهة نشطة
-- ============================================================================
create or replace function public.get_public_playlist_items(_public_id text)
returns table (
  id uuid,
  title text,
  resolved_url text,
  item_type public.item_type,
  duration_seconds integer,
  order_index integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pi.id,
    pi.title,
    pi.resolved_url,
    pi.item_type,
    pi.duration_seconds,
    pi.order_index
  from public.playlist_items pi
  join public.screens s on s.playlist_id = pi.playlist_id
  join public.organizations o on o.id = s.organization_id
  where s.public_id = _public_id
    and s.is_active = true
    and o.status = 'active'
  order by pi.order_index asc;
$$;

-- ============================================================================
-- دالة عامة: التحقق من كلمة سر الشاشة (بدون مصادقة)
-- ============================================================================
create or replace function public.verify_screen_password(
  _public_id text,
  _password text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _hash text;
begin
  select password_hash into _hash
  from public.screens
  where public_id = _public_id;

  if _hash is null then
    return true;  -- لا توجد حماية بكلمة سر
  end if;

  return _hash = crypt(_password, _hash);
end;
$$;

-- ============================================================================
-- منح صلاحيات تنفيذ الدوال
-- ============================================================================
grant execute on function public.is_super_admin(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid, uuid) to authenticated;
grant execute on function public.get_user_org(uuid) to authenticated;
grant execute on function public.is_org_active(uuid) to authenticated;
grant execute on function public.register_organization(text, public.org_type, text) to authenticated;
grant execute on function public.approve_organization(uuid) to authenticated;
grant execute on function public.set_organization_status(uuid, public.org_status) to authenticated;

-- الدوال العامة (للاعب بدون تسجيل دخول)
grant execute on function public.get_public_screen(text) to anon, authenticated;
grant execute on function public.get_public_playlist_items(text) to anon, authenticated;
grant execute on function public.verify_screen_password(text, text) to anon, authenticated;
