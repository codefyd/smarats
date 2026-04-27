import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* الهيدر */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-lg">س</div>
            <span className="text-lg font-bold">سماراتس</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn btn-ghost">دخول</Link>
            <Link to="/register" className="btn btn-primary">تسجيل جهة</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="inline-block bg-brand-50 text-brand-700 text-sm px-4 py-1.5 rounded-full mb-6 font-medium">
          نظام عرض محتوى للشاشات الذكية
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-5 text-slate-900 leading-tight">
          شغّل شاشاتك برابط واحد<br />
          <span className="text-brand-600">يستأنف تلقائياً بعد الإطفاء</span>
        </h1>
        <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          نظام ويب خفيف وآمن لإدارة محتوى شاشات العرض في الشركات والجمعيات الخيرية — 
          يفتح برابط مباشر ويبدأ العرض تلقائياً بدون أي تدخل.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link to="/register" className="btn btn-primary text-base px-6 py-3">سجّل جهتك مجاناً</Link>
          <Link to="/login" className="btn btn-secondary text-base px-6 py-3">دخول الأدمن</Link>
        </div>
      </section>

      {/* المزايا */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-4">
          <FeatureCard icon="⚡" title="خفيف وسريع" desc="روابط فقط، لا رفع ملفات. قاعدة بيانات صغيرة وأداء عالٍ." />
          <FeatureCard icon="🔒" title="آمن ومعزول" desc="كل جهة ترى بياناتها فقط عبر صلاحيات صارمة على مستوى الصفوف." />
          <FeatureCard icon="🔄" title="استئناف تلقائي" desc="عند تشغيل الشاشة بعد الإطفاء، يبدأ العرض مباشرة بدون تدخل." />
          <FeatureCard icon="🔗" title="يدعم درايف ويوتيوب" desc="الصق الرابط، والنظام يكتشف النوع ويحوّله تلقائياً." />
        </div>
      </section>

      {/* كيف يعمل */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-10">3 خطوات وينطلق العرض</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Step n="1" title="سجّل جهتك" desc="تسجيل مجاني بانتظار موافقة الإدارة" />
          <Step n="2" title="أنشئ قائمة عرض" desc="الصق روابط الصور والفيديوهات" />
          <Step n="3" title="افتح الرابط على الشاشة" desc="وخلاص — العرض يشتغل تلقائياً" />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="card bg-brand-50 border-brand-100">
          <h3 className="text-xl font-bold mb-2">جاهز تبدأ؟</h3>
          <p className="text-slate-600 mb-5">مناسب للشركات والجمعيات والمؤسسات الحكومية</p>
          <Link to="/register" className="btn btn-primary">سجّل جهتك الآن</Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} سماراتس. جميع الحقوق محفوظة.
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="card">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
    </div>
  )
}

function Step({ n, title, desc }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-brand-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">{n}</div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-slate-600">{desc}</p>
    </div>
  )
}
