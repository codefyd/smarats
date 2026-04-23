# دليل إعداد Supabase لمشروع سماراتس

اتبع الخطوات بالترتيب بالظبط.

## الخطوة 1: إنشاء مشروع Supabase

1. اذهب إلى https://supabase.com وسجل دخول
2. اضغط **New Project**
3. اختر اسم للمشروع: `smarats`
4. اختر كلمة سر قوية لقاعدة البيانات (احفظها)
5. اختر أقرب منطقة (Region) — للسعودية اختر `Frankfurt (eu-central-1)` أو `Mumbai`
6. اضغط **Create new project** وانتظر دقيقتين

## الخطوة 2: الحصول على مفاتيح API

بعد ما يجهز المشروع:

1. من القائمة الجانبية → **Project Settings** → **API**
2. انسخ القيمتين التاليتين (ستحتاجهما في ملف `.env` في الرد الثاني):
   - `Project URL` (مثال: `https://xxxxx.supabase.co`)
   - `anon public` key (المفتاح العام)

## الخطوة 3: تنفيذ ملفات SQL بالترتيب

اذهب إلى **SQL Editor** في القائمة الجانبية، ثم:

### 3.1 — تنفيذ `01_schema.sql`
- اضغط **+ New query**
- الصق محتوى `01_schema.sql` كامل
- اضغط **Run** (أو `Ctrl+Enter`)
- تأكد من ظهور `Success. No rows returned`

### 3.2 — تنفيذ `02_functions.sql`
- **+ New query**
- الصق محتوى `02_functions.sql` كامل
- اضغط **Run**

### 3.3 — تنفيذ `03_rls_policies.sql`
- **+ New query**
- الصق محتوى `03_rls_policies.sql` كامل
- اضغط **Run**

## الخطوة 4: إنشاء حساب السوبر أدمن

1. اذهب إلى **Authentication** → **Users**
2. اضغط **Add user** → **Create new user**
3. أدخل:
   - **Email**: `a3fa20@gmail.com`
   - **Password**: `112233Qq@@`
   - **Auto Confirm User**: ✅ (مهم — فعّل هذا الخيار)
4. اضغط **Create user**

ثم:

5. ارجع إلى **SQL Editor**
6. **+ New query**
7. الصق محتوى `04_seed_super_admin.sql` كامل
8. اضغط **Run**
9. يجب أن تشاهد رسالة: `Super admin role assigned to a3fa20@gmail.com`

## الخطوة 5: التحقق من الإعداد

في SQL Editor، شغّل الاستعلام التالي للتأكد:

```sql
select
  u.email,
  r.role,
  r.organization_id,
  r.created_at
from auth.users u
join public.user_roles r on r.user_id = u.id
where u.email = 'a3fa20@gmail.com';
```

يجب أن تشاهد صف واحد فيه `role = super_admin`.

## الخطوة 6: إعدادات Auth

اذهب إلى **Authentication** → **Providers** → **Email**:

- ✅ **Enable email provider**
- ❌ **Confirm email** — عطّل هذا الخيار (حتى لا يحتاج المستخدمون تأكيد البريد أثناء التطوير)
  - (يمكن تفعيله لاحقاً في الإنتاج)
- ✅ **Enable secure password change**

اذهب إلى **Authentication** → **URL Configuration**:

- **Site URL**: اكتب رابط موقعك على GitHub Pages (مثال: `https://USERNAME.github.io/smarats`)
  - أثناء التطوير المحلي: `http://localhost:5173`
- **Redirect URLs**: أضف نفس الرابط

---

## بنية الجداول — ملخص

| الجدول | الغرض |
|--------|-------|
| `organizations` | الجهات المسجلة (شركات/جمعيات) مع حالتها (pending/active/suspended) |
| `user_roles` | أدوار المستخدمين (super_admin / org_admin) وارتباطهم بجهة |
| `screens` | الشاشات الفعلية، مع `public_id` عشوائي للرابط العام |
| `playlists` | قوائم العرض (كل جهة تنشئ قوائمها) |
| `playlist_items` | عناصر قائمة العرض (صور/فيديوهات/روابط درايف) مع المدة والترتيب |

## الدوال العامة (RPC) — يستخدمها التطبيق

| الدالة | من يستدعيها | الغرض |
|--------|-------------|-------|
| `register_organization(name, type, contact)` | مستخدم جديد | إنشاء جهة + دور أدمن في معاملة واحدة |
| `approve_organization(org_id)` | السوبر أدمن | الموافقة على جهة |
| `set_organization_status(org_id, status)` | السوبر أدمن | تغيير حالة جهة |
| `get_public_screen(public_id)` | أي شخص (شاشة العرض) | جلب بيانات شاشة بالرابط |
| `get_public_playlist_items(public_id)` | أي شخص (شاشة العرض) | جلب عناصر قائمة عرض شاشة |
| `verify_screen_password(public_id, password)` | أي شخص | التحقق من كلمة سر شاشة |

## ملاحظات أمنية مهمة

- ✅ كل الجداول عليها RLS — مستحيل مستخدم يرى بيانات جهة أخرى
- ✅ الدوال العامة `get_public_*` تعيد فقط البيانات اللازمة (بدون password_hash أو معلومات حساسة)
- ✅ `public_id` طوله 32 حرف عشوائي hex — غير قابل للتخمين
- ✅ السوبر أدمن فقط يقدر يعتمد/يعلّق الجهات
- ✅ الجهة لازم تكون `active` قبل ما تقدر تضيف/تعدّل شاشات وقوائم
