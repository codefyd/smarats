-- ============================================================================
-- سماراتس (Smarats) — مخطط قاعدة البيانات
-- الملف 1 من 4: الجداول الأساسية والأنواع
-- ============================================================================

-- تفعيل الامتدادات اللازمة
create extension if not exists "pgcrypto" with schema "public";

-- ============================================================================
-- الأنواع المخصصة (ENUMs)
-- ============================================================================

-- حالة الجهة
create type public.org_status as enum ('pending', 'active', 'suspended');

-- نوع الجهة
create type public.org_type as enum ('company', 'charity', 'government', 'other');

-- الأدوار
create type public.app_role as enum ('super_admin', 'org_admin');

-- نوع عنصر العرض
create type public.item_type as enum ('image', 'youtube', 'drive_image', 'drive_video', 'mp4');

-- ============================================================================
-- جدول الجهات (organizations)
-- ============================================================================
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  org_type    public.org_type not null default 'other',
  logo_url    text,
  contact_info text,
  status      public.org_status not null default 'pending',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_organizations_status on public.organizations(status);
create index idx_organizations_created_by on public.organizations(created_by);

-- ============================================================================
-- جدول أدوار المستخدمين (user_roles)
-- ============================================================================
create table public.user_roles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            public.app_role not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (user_id, role, organization_id)
);

create index idx_user_roles_user_id on public.user_roles(user_id);
create index idx_user_roles_organization_id on public.user_roles(organization_id);

-- ============================================================================
-- جدول قوائم العرض (playlists)
-- ============================================================================
create table public.playlists (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_playlists_organization_id on public.playlists(organization_id);

-- ============================================================================
-- جدول عناصر قائمة العرض (playlist_items)
-- ============================================================================
create table public.playlist_items (
  id               uuid primary key default gen_random_uuid(),
  playlist_id      uuid not null references public.playlists(id) on delete cascade,
  title            text,
  original_url     text not null,
  resolved_url     text not null,
  item_type        public.item_type not null,
  duration_seconds integer not null default 10 check (duration_seconds between 3 and 300),
  order_index      integer not null default 0,
  created_at       timestamptz not null default now()
);

create index idx_playlist_items_playlist_id on public.playlist_items(playlist_id);
create index idx_playlist_items_order on public.playlist_items(playlist_id, order_index);

-- ============================================================================
-- جدول الشاشات (screens)
-- ============================================================================
create table public.screens (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  playlist_id     uuid references public.playlists(id) on delete set null,
  name            text not null,
  -- المعرف العام المستخدم في الرابط /s/:public_id (طويل وعشوائي)
  public_id       text not null unique default encode(gen_random_bytes(16), 'hex'),
  is_active       boolean not null default true,
  -- حماية اختيارية بكلمة سر (hash)
  password_hash   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_screens_organization_id on public.screens(organization_id);
create index idx_screens_public_id on public.screens(public_id);
create index idx_screens_playlist_id on public.screens(playlist_id);

-- ============================================================================
-- جدول طلبات التسجيل المعلقة (للسوبر أدمن لرؤيتها)
-- (ملاحظة: في هذا التصميم، الجهة تُنشأ مباشرة بحالة pending
-- ثم السوبر أدمن يغير حالتها إلى active. لا نحتاج جدول منفصل.)
-- ============================================================================

-- ============================================================================
-- محفزات تحديث updated_at تلقائياً
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger trg_playlists_updated_at
  before update on public.playlists
  for each row execute function public.set_updated_at();

create trigger trg_screens_updated_at
  before update on public.screens
  for each row execute function public.set_updated_at();
