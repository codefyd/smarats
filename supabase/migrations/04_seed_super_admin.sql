-- ============================================================================
-- سماراتس — الملف 4 من 4: إضافة حساب السوبر أدمن (Seed)
-- ============================================================================
-- هذا الملف يُنفّذ مرة واحدة بعد إنشاء المستخدم عبر Supabase Auth
--
-- خطوات التنفيذ:
-- 1. اذهب إلى Supabase Dashboard → Authentication → Users → Add user
-- 2. أدخل:
--    Email:    a3****@gmail.com
--    Password: *********
-- 3. شغّل هذا الملف في SQL Editor
-- ============================================================================

-- إسناد دور سوبر أدمن للمستخدم *****@gmail.com
do $$
declare
  _user_id uuid;
begin
  select id into _user_id
  from auth.users
  where email = '*****@gmail.com'
  limit 1;

  if _user_id is null then
    raise exception 'User *******@gmail.com not found. Please create it in Authentication → Users first.';
  end if;

  -- إضافة الدور (إذا لم يكن موجوداً)
  insert into public.user_roles (user_id, role, organization_id)
  values (_user_id, 'super_admin', null)
  on conflict (user_id, role, organization_id) do nothing;

  raise notice 'Super admin role assigned to ******@gmail.com (user_id: %)', _user_id;
end;
$$;

-- ============================================================================
-- (اختياري) دالة مساعدة: محفز تلقائي لتحويل ******@gmail.com لسوبر أدمن
-- عند تسجيله مستقبلاً (إذا حذفت المستخدم وأعدت إنشاءه)
-- ============================================================================
create or replace function public.auto_assign_super_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email = '******@gmail.com' then
    insert into public.user_roles (user_id, role, organization_id)
    values (new.id, 'super_admin', null)
    on conflict (user_id, role, organization_id) do nothing;
  end if;
  return new;
end;
$$;

-- ربط المحفز بجدول auth.users
drop trigger if exists trg_auto_super_admin on auth.users;
create trigger trg_auto_super_admin
  after insert on auth.users
  for each row execute function public.auto_assign_super_admin();
