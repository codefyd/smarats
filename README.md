# سماراتس (Smarats) 📺

نظام ويب خفيف وآمن لإدارة محتوى شاشات العرض الذكية في الشركات والجمعيات — يفتح برابط مباشر ويستأنف العرض تلقائياً بعد إطفاء الشاشة.

## ✨ المزايا

- **خفيف وسريع** — روابط فقط (لا رفع ملفات)
- **متعدد الجهات** — كل جهة تدير شاشاتها ومحتواها بشكل مستقل
- **استئناف تلقائي** — فتح الرابط بعد الإطفاء يشغّل العرض من البداية
- **دعم متنوع** — صور مباشرة، روابط Google Drive، فيديوهات YouTube، MP4
- **حماية اختيارية** — كلمة سر لكل شاشة
- **Wake Lock** — منع شاشة التوقف تلقائياً
- **إعادة تحميل دورية** — كل ساعة لجلب التحديثات

## 🛠️ البنية التقنية

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **النشر**: GitHub Pages

---

## 🚀 التثبيت والتشغيل المحلي

```bash
# 1) تثبيت الاعتمادات
npm install

# 2) نسخ ملف البيئة
cp .env.example .env

# 3) تشغيل التطوير
npm run dev
```

افتح http://localhost:5173

---

## ☁️ إعداد Supabase

اتبع ملف `supabase/SETUP.md` بالتفصيل. الخطوات المختصرة:

1. أنشئ مشروع على [supabase.com](https://supabase.com)
2. انسخ `Project URL` و `anon public key` من Settings → API إلى `.env`
3. نفّذ ملفات SQL في SQL Editor بالترتيب:
   - `supabase/migrations/01_schema.sql`
   - `supabase/migrations/02_functions.sql`
   - `supabase/migrations/03_rls_policies.sql`
4. أنشئ حساب السوبر أدمن من Authentication → Users:
   - Email: `a3fa20@gmail.com`
   - Password: `112233Qq@@`
   - ✅ Auto Confirm User
5. نفّذ `supabase/migrations/04_seed_super_admin.sql`

---

## 📤 النشر على GitHub Pages

### الخطوة 1: رفع المشروع إلى GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/smarats.git
git push -u origin main
```

### الخطوة 2: إعداد GitHub Secrets

اذهب إلى **Settings → Secrets and variables → Actions** وأضف:

| Secret | القيمة |
|--------|---------|
| `VITE_SUPABASE_URL` | رابط مشروع Supabase |
| `VITE_SUPABASE_ANON_KEY` | المفتاح العام |

### الخطوة 3: تفعيل GitHub Pages

اذهب إلى **Settings → Pages**:
- **Source**: GitHub Actions

بعد push لفرع `main`، ستجد الموقع على:
```
https://USERNAME.github.io/smarats/
```

### الخطوة 4: تحديث إعدادات Supabase Auth

اذهب إلى **Authentication → URL Configuration** في Supabase:
- **Site URL**: `https://USERNAME.github.io/smarats/`
- **Redirect URLs**: أضف نفس الرابط

---

## 📱 استخدام النظام

### للسوبر أدمن (أنت)
1. ادخل من `/login` بحساب `a3fa20@gmail.com`
2. اذهب لـ `/admin`
3. وافق على الجهات الجديدة

### للجهات
1. سجل من `/register`
2. انتظر الموافقة
3. أنشئ قائمة عرض وأضف روابط
4. أنشئ شاشة واربطها بقائمة العرض
5. انسخ الرابط وافتحه على الشاشة الذكية

### على الشاشة الذكية
1. افتح متصفح
2. الصق رابط الشاشة
3. العرض يبدأ تلقائياً

**مهم**: بعد إطفاء الشاشة، التلفزيون سيفتح نفس الرابط — والعرض سيبدأ مباشرة من أول القائمة.

---

## 🗂️ هيكل المشروع

```
smarats/
├── src/
│   ├── pages/              صفحات التطبيق
│   │   ├── LandingPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── ScreensPage.jsx
│   │   ├── PlaylistsPage.jsx
│   │   ├── PlaylistEditorPage.jsx
│   │   ├── SettingsPage.jsx
│   │   ├── AdminPage.jsx
│   │   ├── PlayerPage.jsx       ⭐ شاشة العرض
│   │   └── PlayerUnlockPage.jsx
│   ├── components/
│   │   └── DashboardLayout.jsx
│   ├── contexts/
│   │   └── AuthContext.jsx      إدارة المصادقة
│   ├── lib/
│   │   ├── supabase.js
│   │   └── urlUtils.js          اكتشاف وتحويل الروابط
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
│   ├── favicon.svg
│   └── 404.html                 لدعم SPA routing
├── supabase/
│   ├── migrations/              4 ملفات SQL
│   └── SETUP.md                 دليل الإعداد
├── .github/workflows/
│   └── deploy.yml               النشر التلقائي
├── package.json
├── vite.config.js
├── tailwind.config.js
└── index.html
```

---

## 🔐 الأمان

- **RLS (Row Level Security)** على كل الجداول — مستحيل مستخدم يشوف بيانات جهة أخرى
- **public_id عشوائي** — 32 حرف hex لكل شاشة، غير قابل للتخمين
- **دوال SECURITY DEFINER** — للعمليات الحرجة فقط
- **الجهة لازم تكون `active`** قبل أي إضافة/تعديل
- **كلمة سر اختيارية** على مستوى الشاشة

---

## 📝 ملاحظات

- الاختصار `VITE_` مطلوب لـ Vite (وليس `NEXT_PUBLIC_` الخاص بـ Next.js)
- عند النشر على GitHub Pages، `VITE_BASE_PATH` يُضبط تلقائياً في workflow
- للنطاق المخصص (custom domain)، غيّر `VITE_BASE_PATH=/` في Secrets

---

## 🐛 استكشاف الأخطاء

### "الشاشة غير موجودة"
- تأكد من صحة `public_id` في الرابط
- تأكد من أن الشاشة مفعلة (`is_active = true`)
- تأكد من أن الجهة نشطة (`status = 'active'`)

### "لا توجد عناصر في قائمة العرض"
- تأكد من ربط الشاشة بقائمة عرض
- تأكد من وجود عناصر في القائمة

### فيديو درايف لا يشتغل
- تأكد من أن الملف مشارك: "أي شخص لديه الرابط يمكنه العرض"

### YouTube لا يبدأ تلقائياً
- المتصفحات تمنع autoplay إلا مع mute — النظام يُفعّل mute تلقائياً
- بعض الشاشات الذكية القديمة قد تحتاج تفاعل أولي

---

## 📄 الترخيص

هذا المشروع مفتوح المصدر ومتاح للاستخدام الحر.

---

**تم تطويره بـ ❤️ للشركات والجمعيات الخيرية العربية**
