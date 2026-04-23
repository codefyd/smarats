-- ============================================================================
-- سماراتس — الملف 3 من 4: سياسات RLS (Row Level Security)
-- ============================================================================
-- كل جهة ترى بياناتها فقط، والسوبر أدمن يرى كل شيء
-- ============================================================================

-- تفعيل RLS على كل الجداول
alter table public.organizations enable row level security;
alter table public.user_roles    enable row level security;
alter table public.playlists     enable row level security;
alter table public.playlist_items enable row level security;
alter table public.screens       enable row level security;

-- ============================================================================
-- سياسات جدول organizations
-- ============================================================================

-- السوبر أدمن يرى الكل
create policy "super_admin_read_all_orgs"
  on public.organizations for select
  to authenticated
  using (public.is_super_admin(auth.uid()));

-- المستخدم يرى جهته فقط
create policy "user_read_own_org"
  on public.organizations for select
  to authenticated
  using (public.is_org_admin(auth.uid(), id));

-- السوبر أدمن فقط يعدّل الجهات (حالة، تعليق، إلخ)
create policy "super_admin_update_orgs"
  on public.organizations for update
  to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- أدمن الجهة يقدر يحدّث بيانات جهته (اسم، شعار، معلومات تواصل)
-- لكن ليس الحالة — الحالة يتحكم فيها السوبر أدمن فقط
create policy "org_admin_update_own_org"
  on public.organizations for update
  to authenticated
  using (
    public.is_org_admin(auth.uid(), id)
    and status = 'active'
  )
  with check (
    public.is_org_admin(auth.uid(), id)
    and status = (select status from public.organizations where id = organizations.id)
  );

-- لا نسمح بإنشاء مباشر — فقط عبر دالة register_organization
-- ولا نسمح بالحذف من قبل غير السوبر أدمن
create policy "super_admin_delete_orgs"
  on public.organizations for delete
  to authenticated
  using (public.is_super_admin(auth.uid()));

-- ============================================================================
-- سياسات جدول user_roles
-- ============================================================================

-- السوبر أدمن يرى الكل
create policy "super_admin_read_all_roles"
  on public.user_roles for select
  to authenticated
  using (public.is_super_admin(auth.uid()));

-- المستخدم يرى أدواره فقط
create policy "user_read_own_roles"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

-- السوبر أدمن فقط يدير الأدوار مباشرة
create policy "super_admin_manage_roles"
  on public.user_roles for all
  to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- ============================================================================
-- سياسات جدول screens
-- ============================================================================

-- السوبر أدمن يرى الكل
create policy "super_admin_read_all_screens"
  on public.screens for select
  to authenticated
  using (public.is_super_admin(auth.uid()));

-- أدمن الجهة يرى شاشاته فقط
create policy "org_admin_read_own_screens"
  on public.screens for select
  to authenticated
  using (public.is_org_admin(auth.uid(), organization_id));

-- أدمن الجهة ينشئ شاشات لجهته فقط (ويجب أن تكون الجهة نشطة)
create policy "org_admin_insert_screens"
  on public.screens for insert
  to authenticated
  with check (
    public.is_org_admin(auth.uid(), organization_id)
    and public.is_org_active(organization_id)
  );

-- أدمن الجهة يعدّل شاشات جهته فقط
create policy "org_admin_update_screens"
  on public.screens for update
  to authenticated
  using (
    public.is_org_admin(auth.uid(), organization_id)
    and public.is_org_active(organization_id)
  )
  with check (public.is_org_admin(auth.uid(), organization_id));

-- أدمن الجهة يحذف شاشات جهته فقط
create policy "org_admin_delete_screens"
  on public.screens for delete
  to authenticated
  using (public.is_org_admin(auth.uid(), organization_id));

-- ============================================================================
-- سياسات جدول playlists
-- ============================================================================

create policy "super_admin_read_all_playlists"
  on public.playlists for select
  to authenticated
  using (public.is_super_admin(auth.uid()));

create policy "org_admin_read_own_playlists"
  on public.playlists for select
  to authenticated
  using (public.is_org_admin(auth.uid(), organization_id));

create policy "org_admin_insert_playlists"
  on public.playlists for insert
  to authenticated
  with check (
    public.is_org_admin(auth.uid(), organization_id)
    and public.is_org_active(organization_id)
  );

create policy "org_admin_update_playlists"
  on public.playlists for update
  to authenticated
  using (
    public.is_org_admin(auth.uid(), organization_id)
    and public.is_org_active(organization_id)
  )
  with check (public.is_org_admin(auth.uid(), organization_id));

create policy "org_admin_delete_playlists"
  on public.playlists for delete
  to authenticated
  using (public.is_org_admin(auth.uid(), organization_id));

-- ============================================================================
-- سياسات جدول playlist_items
-- ============================================================================

-- للقراءة: نحتاج join مع playlists للتحقق من ownership
create policy "super_admin_read_all_items"
  on public.playlist_items for select
  to authenticated
  using (public.is_super_admin(auth.uid()));

create policy "org_admin_read_own_items"
  on public.playlist_items for select
  to authenticated
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_items.playlist_id
        and public.is_org_admin(auth.uid(), p.organization_id)
    )
  );

create policy "org_admin_insert_items"
  on public.playlist_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_items.playlist_id
        and public.is_org_admin(auth.uid(), p.organization_id)
        and public.is_org_active(p.organization_id)
    )
  );

create policy "org_admin_update_items"
  on public.playlist_items for update
  to authenticated
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_items.playlist_id
        and public.is_org_admin(auth.uid(), p.organization_id)
        and public.is_org_active(p.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_items.playlist_id
        and public.is_org_admin(auth.uid(), p.organization_id)
    )
  );

create policy "org_admin_delete_items"
  on public.playlist_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_items.playlist_id
        and public.is_org_admin(auth.uid(), p.organization_id)
    )
  );
