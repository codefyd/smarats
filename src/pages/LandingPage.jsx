import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import BrandMark from '../components/BrandMark'

// ============================================================
// Smarats — سماراتس | Landing Page
// منصة إدارة محتوى شاشات العرض الذكية
// تصميم: عربي RTL، خلفية داكنة، أسلوب SaaS تسويقي فاخر
// ============================================================

// --- تحميل شعارات العملاء تلقائياً من مجلد src/images ---
const customerLogoModules = import.meta.glob(
  '../images/*.{png,jpg,jpeg,svg,webp,avif}',
  { eager: true, import: 'default' }
)
const customerLogos = Object.values(customerLogoModules)

// --- ألوان الهوية ---
const C = {
  primary: '#0284c7',
  accent: '#38bdf8',
  bg: '#0a1628',
  bgDeep: '#081420',
  text: '#e8f4fd',
  muted: '#94b8d4',
  faint: '#607a90'
}

export default function LandingPage() {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: `linear-gradient(160deg, ${C.bg} 0%, #0d1f3c 50%, ${C.bgDeep} 100%)`,
        color: C.text,
        fontFamily: 'Thmanyah Sans, Tajawal, system-ui, sans-serif',
        overflowX: 'hidden'
      }}
    >
      <FontFace />
      <GridOverlay />
      <Header />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <FeaturesSection />
      <SectorsSection />
      <CustomersSection />
      <HowItWorksSection />
      <PlansSection />
      <FinalCTA />
      <Footer />
    </div>
  )
}

// ---- تعريف خط ثمانية ----
function FontFace() {
  return (
    <style>{`
      @font-face {
        font-family: 'Thmanyah Sans';
        src: url('/src/assets/fonts/thmanyahsans/thmanyahsans-Light.woff2') format('woff2');
        font-weight: 300; font-style: normal; font-display: swap;
      }
      @font-face {
        font-family: 'Thmanyah Sans';
        src: url('/src/assets/fonts/thmanyahsans/thmanyahsans-Regular.woff2') format('woff2');
        font-weight: 400; font-style: normal; font-display: swap;
      }
      @font-face {
        font-family: 'Thmanyah Sans';
        src: url('/src/assets/fonts/thmanyahsans/thmanyahsans-Medium.woff2') format('woff2');
        font-weight: 500; font-style: normal; font-display: swap;
      }
      @font-face {
        font-family: 'Thmanyah Sans';
        src: url('/src/assets/fonts/thmanyahsans/thmanyahsans-Bold.woff2') format('woff2');
        font-weight: 700; font-style: normal; font-display: swap;
      }
      @font-face {
        font-family: 'Thmanyah Sans';
        src: url('/src/assets/fonts/thmanyahsans/thmanyahsans-Black.woff2') format('woff2');
        font-weight: 900; font-style: normal; font-display: swap;
      }
      @keyframes smaratsFloat {
        0%, 100% { transform: translateY(0) }
        50% { transform: translateY(-6px) }
      }
      @keyframes smaratsPulse {
        0%, 100% { opacity: 0.6 }
        50% { opacity: 1 }
      }
      .smarats-logo-tile:hover {
        transform: translateY(-4px) scale(1.05);
        background: rgba(2,132,199,0.18) !important;
        border-color: rgba(56,189,248,0.5) !important;
      }
      .smarats-nav-link:hover { color: ${C.accent} !important; }
      .smarats-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 36px rgba(2,132,199,0.55) !important;
      }
      .smarats-btn-ghost:hover {
        background: rgba(2,132,199,0.18) !important;
        border-color: rgba(56,189,248,0.5) !important;
      }
      @media (max-width: 720px) {
        .smarats-nav-links { display: none !important; }
      }
    `}</style>
  )
}

// ---- شبكة زخرفية في الخلفية ----
function GridOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
      backgroundImage: `
        linear-gradient(rgba(2,132,199,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(2,132,199,0.04) 1px, transparent 1px)
      `,
      backgroundSize: '60px 60px'
    }} />
  )
}

// ============================================================
// 1) Header — ثابت/لاصق
// ============================================================
function Header() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLink = {
    color: C.muted, textDecoration: 'none',
    fontSize: 14, fontWeight: 600, transition: 'color 0.2s'
  }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: scrolled ? 'rgba(10,22,40,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(14px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(2,132,199,0.18)' : '1px solid transparent',
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandMark size={34} />
          <span style={{ fontWeight: 900, fontSize: 20, color: '#fff', letterSpacing: '-0.5px' }}>
            سماراتس
          </span>
        </div>

        <nav className="smarats-nav-links" style={{ display: 'flex', gap: 28 }}>
          <a href="#solution" className="smarats-nav-link" style={navLink}>الحل</a>
          <a href="#features" className="smarats-nav-link" style={navLink}>المزايا</a>
          <a href="#sectors" className="smarats-nav-link" style={navLink}>القطاعات</a>
          <a href="#plans" className="smarats-nav-link" style={navLink}>الباقات</a>
        </nav>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/login" style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            color: '#93c5fd', background: 'transparent',
            border: '1px solid rgba(147,197,253,0.3)', textDecoration: 'none'
          }}>
            دخول
          </Link>
          <Link to="/register" className="smarats-btn-primary" style={{
            padding: '9px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700,
            color: '#fff', background: C.primary, textDecoration: 'none',
            boxShadow: '0 6px 20px rgba(2,132,199,0.4)',
            transition: 'all 0.25s'
          }}>
            سجّل جهتك
          </Link>
        </div>
      </div>
    </header>
  )
}

// ============================================================
// 2) Hero
// ============================================================
function Hero() {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t) }, [])

  return (
    <section style={{
      position: 'relative', zIndex: 1,
      maxWidth: 1100, margin: '0 auto',
      padding: '80px 24px 60px',
      textAlign: 'center'
    }}>
      <FadeIn delay={0} visible={visible}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(2,132,199,0.12)', border: '1px solid rgba(2,132,199,0.3)',
          borderRadius: 40, padding: '6px 16px', marginBottom: 28
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: C.primary,
            boxShadow: `0 0 10px ${C.primary}`,
            animation: 'smaratsPulse 2s ease-in-out infinite'
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.accent, letterSpacing: 0.4 }}>
            منصة عربية لإدارة شاشات العرض الذكية
          </span>
        </div>
      </FadeIn>

      <FadeIn delay={100} visible={visible}>
        <h1 style={{
          fontSize: 'clamp(34px, 5.5vw, 60px)',
          fontWeight: 900, lineHeight: 1.2,
          marginBottom: 22, color: '#fff', letterSpacing: '-1.2px'
        }}>
          شاشاتك التسويقية تعمل تلقائيًا…
          <br />
          <span style={{
            background: `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            حتى بعد الإطفـاء
                </span>
        </h1>
      </FadeIn>

      <FadeIn delay={180} visible={visible}>
        <p style={{
          fontSize: 18, lineHeight: 1.85, color: C.muted,
          maxWidth: 720, margin: '0 auto 36px', fontWeight: 400
        }}>
          سماراتس منصة سهلة لإدارة شاشات العرض للجهات والشركات والجمعيات.
          أضف روابط الصور والفيديوهات، واربطها بالشاشة،
          ودع العرض يعمل تلقائيًا كل مرة تفتح فيها الشاشة.
        </p>
      </FadeIn>

      <FadeIn delay={260} visible={visible}>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
          <Link to="/register" className="smarats-btn-primary" style={{
            padding: '14px 32px', borderRadius: 12, fontSize: 16, fontWeight: 700,
            color: '#fff', background: C.primary, textDecoration: 'none',
            boxShadow: '0 8px 28px rgba(2,132,199,0.45)',
            transition: 'all 0.25s'
          }}>
            سجّل جهتك الآن ←
          </Link>
          <Link to="/login" className="smarats-btn-ghost" style={{
            padding: '14px 28px', borderRadius: 12, fontSize: 16, fontWeight: 600,
            color: '#93c5fd', background: 'rgba(2,132,199,0.08)',
            border: '1px solid rgba(2,132,199,0.3)', textDecoration: 'none',
            transition: 'all 0.25s'
          }}>
            دخول الحساب
          </Link>
        </div>
      </FadeIn>

      <FadeIn delay={360} visible={visible}>
        <HeroMockup />
      </FadeIn>
    </section>
  )
}

// ---- شاشة الـ Mockup مع محتوى تسويقي يتبدل ----
function HeroMockup() {
  const slides = [
    {
      bg: 'linear-gradient(135deg, #0c2340 0%, #0a4880 100%)',
      tag: 'حملة',
      title: 'حملة الجمعة البيضاء',
      sub: 'خصومات حتى ٧٠٪ — اليوم فقط',
      icon: '🎯'
    },
    {
      bg: 'linear-gradient(135deg, #1a0a2e 0%, #0a2040 100%)',
      tag: 'إعلان',
      title: 'مؤتمر الابتكار 2026',
      sub: 'القاعة الرئيسية — الطابق الأول',
      icon: '📢'
    },
    {
      bg: 'linear-gradient(135deg, #2a0a1a 0%, #401224 100%)',
      tag: 'تنبيه',
      title: 'صلاة الجمعة بعد ١٥ دقيقة',
      sub: 'الرجاء التهيؤ والتوجه للمسجد',
      icon: '⏰'
    },
    {
      bg: 'linear-gradient(135deg, #0a2010 0%, #0a3a18 100%)',
      tag: 'عرض',
      title: 'افتتاح الفرع الجديد',
      sub: 'حي الياسمين — الرياض',
      icon: '✨'
    }
  ]
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI(s => (s + 1) % slides.length), 2800)
    return () => clearInterval(t)
  }, [])
  const s = slides[i]

  return (
    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
      <div style={{
        position: 'absolute', inset: -40, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(2,132,199,0.22) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        background: 'linear-gradient(145deg, #1a2d4a, #0f1e35)',
        border: '1px solid rgba(2,132,199,0.3)',
        borderRadius: 22, padding: 4,
        boxShadow: '0 30px 90px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
        maxWidth: 820, width: '100%',
        animation: 'smaratsFloat 6s ease-in-out infinite'
      }}>
        <div style={{
          background: 'rgba(8,18,32,0.92)',
          borderRadius: '18px 18px 0 0',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid rgba(2,132,199,0.12)'
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Dot color="#ff5f57" /><Dot color="#febc2e" /><Dot color="#28c840" />
          </div>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 6,
            padding: '4px 12px', fontSize: 11, color: '#4a7a9b',
            textAlign: 'left', direction: 'ltr'
          }}>
            smarats.app/s/<span style={{ color: C.accent }}>Ab3Xm2Kp</span>
          </div>
        </div>
        <div style={{
          background: '#000', borderRadius: '0 0 18px 18px',
          aspectRatio: '16/8', overflow: 'hidden', position: 'relative'
        }}>
          <div style={{
            position: 'absolute', inset: 0, background: s.bg,
            transition: 'background 0.8s ease',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', padding: 28
          }}>
            <div style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 20, padding: '4px 14px',
              fontSize: 12, fontWeight: 700, color: '#fff',
              marginBottom: 16, letterSpacing: 0.5
            }}>
              {s.tag}
            </div>
            <div style={{ fontSize: 44, marginBottom: 12 }}>{s.icon}</div>
            <div style={{
              fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 900,
              color: '#fff', marginBottom: 8, letterSpacing: -0.5
            }}>
              {s.title}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{s.sub}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 22 }}>
              {slides.map((_, k) => (
                <div key={k} style={{
                  width: k === i ? 22 : 6, height: 6, borderRadius: 3,
                  background: k === i ? C.accent : 'rgba(255,255,255,0.25)',
                  transition: 'all 0.4s'
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{
        width: 90, height: 7, background: 'rgba(2,132,199,0.3)',
        margin: '0 auto', borderRadius: '0 0 4px 4px'
      }} />
    </div>
  )
}

const Dot = ({ color }) => (
  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
)

// ============================================================
// 3) قسم المشكلة
// ============================================================
function ProblemSection() {
  const items = [
    { icon: '🔌', title: 'الشاشة تنطفئ ثم لا تعود', desc: 'بعد كل انقطاع كهرباء أو إعادة تشغيل، يفقد العرض حالته ولا يعود تلقائيًا.' },
    { icon: '💾', title: 'تحديث المحتوى يحتاج فلاش', desc: 'كل تعديل يتطلب شخصًا تقنيًا، أو فلاش، أو الحضور بنفسك للشاشة.' },
    { icon: '🖥️', title: 'صعوبة إدارة عدة شاشات', desc: 'بدون لوحة موحدة، إدارة أكثر من شاشة تتحول إلى فوضى وعشوائية.' },
    { icon: '📂', title: 'محتوى مشتت بدون تنظيم', desc: 'روابط ومقاطع وصور موزعة في مجلدات وواتساب ودرايف بدون ترتيب.' }
  ]
  return (
    <Section maxWidth={1100}>
      <SectionTitle
        badge="المشكلة"
        title="المشكلة ليست في الشاشة… المشكلة في تشغيل المحتوى كل مرة"
      />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 18, marginTop: 48
      }}>
        {items.map((it, k) => (
          <div key={k} style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, padding: '24px 22px',
            transition: 'all 0.25s'
          }}>
            <div style={{ fontSize: 28, marginBottom: 14 }}>{it.icon}</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{it.title}</h3>
            <p style={{ fontSize: 13.5, lineHeight: 1.75, color: C.faint, margin: 0 }}>{it.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ============================================================
// 4) قسم الحل
// ============================================================
function SolutionSection() {
  const points = [
    { icon: <IconLink />, title: 'رابط مستقل لكل شاشة', desc: 'كل شاشة تحصل على رابط فريد قصير — افتحه ويبدأ العرض تلقائيًا.' },
    { icon: <IconList />, title: 'قوائم عرض مرنة', desc: 'رتّب المحتوى حسب الحاجة، وغيّره في أي وقت من لوحة التحكم.' },
    { icon: <IconMedia />, title: 'صور، فيديو، يوتيوب، درايف، MP4', desc: 'الصق أي رابط — النظام يكتشف نوعه ويعرضه بالشكل الصحيح.' },
    { icon: <IconLock />, title: 'حماية اختيارية بكلمة مرور', desc: 'أمّن شاشاتك الحساسة بكلمة سر — اختيارية لكل شاشة.' },
    { icon: <IconShield />, title: 'عزل كامل بين الجهات', desc: 'كل جهة ترى بياناتها فقط — أمان على مستوى قاعدة البيانات.' },
    { icon: <IconSpark />, title: 'مناسب لكل مناسبة', desc: 'حملات، عروض، تنبيهات، فعاليات — كل شيء من نفس اللوحة.' }
  ]
  return (
    <section id="solution" style={{
      position: 'relative', zIndex: 1,
      background: 'rgba(0,0,0,0.22)',
      borderTop: '1px solid rgba(2,132,199,0.12)',
      borderBottom: '1px solid rgba(2,132,199,0.12)',
      padding: '90px 24px'
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionTitle
          badge="الحل"
          title="سماراتس يجعل الشاشة قناة عرض جاهزة دائمًا"
        />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: 20, marginTop: 52
        }}>
          {points.map((p, k) => (
            <ValueCard key={k} {...p} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ValueCard({ icon, title, desc }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(2,132,199,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? 'rgba(2,132,199,0.4)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 16, padding: '28px 24px',
        transition: 'all 0.25s'
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'rgba(2,132,199,0.15)',
        border: '1px solid rgba(2,132,199,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 18, color: C.accent
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 10 }}>{title}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.75, color: C.faint, margin: 0 }}>{desc}</p>
    </div>
  )
}

// ============================================================
// 5) قسم المزايا
// ============================================================
function FeaturesSection() {
  const features = [
    { icon: '⚡', title: 'تشغيل تلقائي بعد الإطفاء', desc: 'الشاشة تعود لعرضها مباشرة بعد أي انقطاع — بدون تدخل يدوي.' },
    { icon: '🎛️', title: 'إدارة كل الشاشات من لوحة واحدة', desc: 'تحكّم بكل شاشاتك من مكان واحد — تعديل، إيقاف، استبدال.' },
    { icon: '🪄', title: 'تحديث بدون لمس الشاشة', desc: 'حدّث المحتوى من جوالك أو حاسبك — التغيير ينعكس فورًا على الشاشة.' },
    { icon: '🔐', title: 'روابط آمنة وغير قابلة للتخمين', desc: 'كل رابط شاشة فريد ومشفّر — لا يمكن تخمينه أو الوصول إليه عشوائيًا.' },
    { icon: '📺', title: 'يدعم التلفاز الذكي وFully Kiosk', desc: 'يعمل على شاشات Smart TV، Android TV، Fully Kiosk، وأي متصفح حديث.' },
    { icon: '🪶', title: 'تجربة خفيفة وسريعة', desc: 'لا رفع ملفات ثقيلة — روابط فقط، أداء عالٍ، وتحميل سريع.' }
  ]
  return (
    <section id="features">
      <Section maxWidth={1100}>
        <SectionTitle badge="المزايا" title="كل ما تحتاجه لإدارة شاشاتك باحتراف" />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20, marginTop: 48
        }}>
          {features.map((f, k) => (
            <div key={k} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: '26px 24px',
              transition: 'all 0.25s'
            }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.75, color: C.faint, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>
    </section>
  )
}

// ============================================================
// 6) قسم القطاعات
// ============================================================
function SectorsSection() {
  const sectors = [
    { icon: '🤲', title: 'الجمعيات الخيرية', desc: 'حملات تبرع، إعلانات، أوقات الصلاة، أرقام الحملات النشطة.' },
    { icon: '🏪', title: 'الشركات والمتاجر', desc: 'عروض، منتجات، تخفيضات، إعلانات للزوار في نقاط البيع.' },
    { icon: '🏛️', title: 'الجهات الحكومية', desc: 'تنبيهات الموظفين، إرشادات المراجعين، رسائل رسمية.' },
    { icon: '🎓', title: 'المدارس والمراكز', desc: 'جداول، إعلانات، تنبيهات الطلاب وأولياء الأمور.' },
    { icon: '🎪', title: 'الفعاليات والمعارض', desc: 'برنامج الفعالية، ترحيب بالضيوف، عرض الرعاة.' },
    { icon: '🛎️', title: 'الفروع والاستقبال', desc: 'شاشات الترحيب، أرقام الانتظار، خدمات الفرع.' }
  ]
  return (
    <section id="sectors" style={{
      position: 'relative', zIndex: 1,
      background: 'rgba(0,0,0,0.18)',
      borderTop: '1px solid rgba(2,132,199,0.1)',
      borderBottom: '1px solid rgba(2,132,199,0.1)',
      padding: '90px 24px'
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionTitle
          badge="القطاعات"
          title="مصمم لكل جهة لديها شاشة تريد أن تقول شيئًا"
        />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 18, marginTop: 50
        }}>
          {sectors.map((s, k) => (
            <div key={k} style={{
              background: 'rgba(2,132,199,0.06)',
              border: '1px solid rgba(2,132,199,0.18)',
              borderRadius: 16, padding: '24px 22px',
              transition: 'all 0.25s'
            }}>
              <div style={{ fontSize: 30, marginBottom: 12 }}>{s.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.75, color: C.faint, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// 7) قسم تشاركنا النجاح — شعارات العملاء (Apple Watch grid)
// ============================================================
function CustomersSection() {
  if (!customerLogos.length) {
    return (
      <Section maxWidth={900}>
        <SectionTitle badge="عملاؤنا" title="تشاركنا النجاح" />
        <p style={{ textAlign: 'center', color: C.muted, marginTop: 18, fontSize: 16 }}>
          جهات وثقت بسماراتس لإدارة شاشاتها بطريقة أسهل وأسرع.
        </p>
        <div style={{
          marginTop: 48,
          textAlign: 'center',
          padding: '40px 24px',
          background: 'rgba(2,132,199,0.06)',
          border: '1px dashed rgba(2,132,199,0.25)',
          borderRadius: 18,
          color: C.faint, fontSize: 14
        }}>
          قريبًا — قائمة من الجهات الموثوقة
        </div>
      </Section>
    )
  }

  return (
    <Section maxWidth={1000}>
      <SectionTitle badge="عملاؤنا" title="تشاركنا النجاح" />
      <p style={{ textAlign: 'center', color: C.muted, marginTop: 16, fontSize: 16, maxWidth: 600, marginInline: 'auto' }}>
        جهات وثقت بسماراتس لإدارة شاشاتها بطريقة أسهل وأسرع.
      </p>

      <div style={{
        marginTop: 56,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))',
        gap: 18,
        justifyItems: 'center',
        maxWidth: 760, marginInline: 'auto'
      }}>
        {customerLogos.map((src, k) => {
          // أحجام متفاوتة بسيطة لإحساس Apple Watch
          const variants = [80, 92, 86, 96, 82, 90]
          const size = variants[k % variants.length]
          return (
            <div
              key={k}
              className="smarats-logo-tile"
              style={{
                width: size, height: size,
                borderRadius: 22,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 12,
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)'
              }}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                style={{
                  maxWidth: '100%', maxHeight: '100%',
                  objectFit: 'contain',
                  filter: 'brightness(1.05)'
                }}
              />
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ============================================================
// 8) قسم خطوات العمل
// ============================================================
function HowItWorksSection() {
  const steps = [
    { n: '01', title: 'سجّل جهتك', desc: 'سجّل بياناتك بدقائق وانتظر تفعيل الإدارة.' },
    { n: '02', title: 'أنشئ قائمة عرض', desc: 'سمِّ القائمة وحدّد محتواها بالترتيب الذي تريد.' },
    { n: '03', title: 'أضف روابط الصور والفيديوهات', desc: 'الصق روابط درايف، يوتيوب، أو روابط مباشرة لـMP4 وصور.' },
    { n: '04', title: 'اربط القائمة بالشاشة', desc: 'كل شاشة لها رابط فريد — اربطه بقائمة العرض.' },
    { n: '05', title: 'افتح الرابط على الشاشة', desc: 'العرض يبدأ تلقائيًا — وكل تحديث لاحق ينعكس فورًا.' }
  ]
  return (
    <Section maxWidth={1100}>
      <SectionTitle
        badge="طريقة العمل"
        title="من لوحة التحكم إلى الشاشة خلال دقائق"
      />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: 24, marginTop: 52
      }}>
        {steps.map((s, k) => (
          <div key={k} style={{ position: 'relative' }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12,
              background: 'rgba(2,132,199,0.18)',
              border: '1px solid rgba(2,132,199,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16, color: C.accent,
              fontSize: 14, fontWeight: 900, fontFamily: 'monospace', letterSpacing: -0.5
            }}>
              {s.n}
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{s.title}</h3>
            <p style={{ fontSize: 13.5, lineHeight: 1.75, color: C.faint, margin: 0 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ============================================================
// 9) قسم الباقات
// ============================================================
function PlansSection() {
  const plans = [
    {
      name: 'بلس', en: 'Plus',
      screens: 5, playlists: 5, highlight: false,
      features: ['٥ شاشات نشطة', '٥ قوائم عرض', 'حماية بكلمة سر', 'روابط قصيرة آمنة', 'دعم كل أنواع المحتوى']
    },
    {
      name: 'برو', en: 'Pro',
      screens: 10, playlists: 10, highlight: true,
      features: ['١٠ شاشات نشطة', '١٠ قوائم عرض', 'حماية بكلمة سر', 'روابط قصيرة آمنة', 'دعم كل أنواع المحتوى']
    },
    {
      name: 'ماكس', en: 'Max',
      screens: 20, playlists: 20, highlight: false,
      features: ['٢٠ شاشة نشطة', '٢٠ قائمة عرض', 'حماية بكلمة سر', 'روابط قصيرة آمنة', 'دعم كل أنواع المحتوى']
    }
  ]
  return (
    <section id="plans">
      <Section maxWidth={1050}>
        <SectionTitle badge="الباقات" title="اختر الباقة المناسبة لجهتك" />
        <p style={{ textAlign: 'center', color: C.faint, fontSize: 14, marginTop: 10, marginBottom: 48 }}>
          الفرق بين الباقات في عدد الشاشات والقوائم — جميع المزايا مشتركة
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 20
        }}>
          {plans.map((p, k) => <PlanCard key={k} {...p} />)}
        </div>
      </Section>
    </section>
  )
}

function PlanCard({ name, en, screens, playlists, highlight, features }) {
  return (
    <div style={{
      position: 'relative',
      background: highlight ? 'rgba(2,132,199,0.14)' : 'rgba(255,255,255,0.03)',
      border: highlight ? '1px solid rgba(2,132,199,0.5)' : '1px solid rgba(255,255,255,0.07)',
      borderRadius: 20, padding: '30px 26px',
      boxShadow: highlight ? '0 12px 40px rgba(2,132,199,0.25)' : 'none',
      transform: highlight ? 'translateY(-6px)' : 'none'
    }}>
      {highlight && (
        <div style={{
          position: 'absolute', top: -12, right: 24,
          background: C.primary, color: '#fff',
          fontSize: 11, fontWeight: 700, padding: '4px 14px',
          borderRadius: 20, letterSpacing: 0.5,
          boxShadow: '0 6px 18px rgba(2,132,199,0.5)'
        }}>
          الأكثر طلبًا
        </div>
      )}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <h3 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: 0 }}>{name}</h3>
          <span style={{ fontSize: 13, color: C.faint, fontWeight: 600 }}>{en}</span>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 13, color: highlight ? C.accent : C.faint }}>
          <span>📺 {screens} شاشات</span>
          <span>📋 {playlists} قوائم</span>
        </div>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 26px' }}>
        {features.map((f, i) => (
          <li key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 14, color: C.muted, marginBottom: 10
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: '50%',
              background: highlight ? C.primary : 'rgba(2,132,199,0.2)',
              color: '#fff', fontSize: 11, fontWeight: 900,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <Link to="/register" className="smarats-btn-primary" style={{
        display: 'block', textAlign: 'center',
        padding: '12px 20px', borderRadius: 11, fontSize: 14, fontWeight: 700,
        textDecoration: 'none',
        background: highlight ? C.primary : 'rgba(2,132,199,0.18)',
        color: '#fff',
        border: highlight ? 'none' : '1px solid rgba(2,132,199,0.35)',
        boxShadow: highlight ? '0 6px 20px rgba(2,132,199,0.4)' : 'none',
        transition: 'all 0.25s'
      }}>
        ابدأ الآن ←
      </Link>
    </div>
  )
}

// ============================================================
// 10) CTA نهائي
// ============================================================
function FinalCTA() {
  return (
    <section style={{
      position: 'relative', zIndex: 1,
      maxWidth: 900, margin: '0 auto', padding: '70px 24px 100px',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, rgba(2,132,199,0.18), rgba(2,132,199,0.05))',
        border: '1px solid rgba(2,132,199,0.3)',
        borderRadius: 26, padding: '56px 40px',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: -80, left: -80,
          width: 240, height: 240, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2,132,199,0.3), transparent)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: -60, right: -60,
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.18), transparent)',
          pointerEvents: 'none'
        }} />
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 900,
          color: '#fff', marginBottom: 16, letterSpacing: -0.6,
          position: 'relative'
        }}>
          خلّ شاشاتك تعمل لصالحك كل يوم
        </h2>
        <p style={{
          fontSize: 16, color: C.muted, marginBottom: 36,
          lineHeight: 1.85, maxWidth: 600, marginInline: 'auto', position: 'relative'
        }}>
          ابدأ بتنظيم محتوى شاشاتك من رابط واحد،
          وقلّل الاعتماد على الفلاشات والأجهزة والضبط اليدوي.
        </p>
        <Link to="/register" className="smarats-btn-primary" style={{
          display: 'inline-block', position: 'relative',
          padding: '16px 38px', borderRadius: 13, fontSize: 16, fontWeight: 800,
          color: '#fff', background: C.primary,
          textDecoration: 'none',
          boxShadow: '0 10px 36px rgba(2,132,199,0.5)',
          transition: 'all 0.25s'
        }}>
          سجّل جهتك الآن ←
        </Link>
      </div>
    </section>
  )
}

// ============================================================
// 11) Footer
// ============================================================
function Footer() {
  return (
    <footer style={{
      position: 'relative', zIndex: 1,
      borderTop: '1px solid rgba(2,132,199,0.12)',
      padding: '36px 24px 28px',
      textAlign: 'center'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, marginBottom: 12
      }}>
        <BrandMark size={26} />
        <span style={{ fontWeight: 800, color: C.text, fontSize: 16 }}>سماراتس</span>
      </div>
      <p style={{
        color: C.muted, fontSize: 14, margin: '0 0 16px',
        maxWidth: 500, marginInline: 'auto', lineHeight: 1.7
      }}>
        منصة عربية لإدارة شاشات العرض الذكية.
      </p>
      <div style={{ color: '#3d5a6e', fontSize: 13 }}>
        © {new Date().getFullYear()} سماراتس — Smarats. جميع الحقوق محفوظة.
      </div>
    </footer>
  )
}

// ============================================================
// مساعدات عامة
// ============================================================
function Section({ children, maxWidth = 1100 }) {
  return (
    <section style={{
      position: 'relative', zIndex: 1,
      maxWidth, margin: '0 auto', padding: '90px 24px'
    }}>
      {children}
    </section>
  )
}

function SectionTitle({ badge, title }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <span style={{
        display: 'inline-block',
        background: 'rgba(2,132,199,0.14)',
        border: '1px solid rgba(2,132,199,0.3)',
        borderRadius: 20, padding: '5px 16px',
        fontSize: 12, fontWeight: 700, color: C.accent,
        letterSpacing: 0.8, marginBottom: 18
      }}>
        {badge}
      </span>
      <h2 style={{
        fontSize: 'clamp(26px, 4vw, 40px)',
        fontWeight: 900, color: C.text,
        letterSpacing: -0.8, margin: 0, lineHeight: 1.3,
        maxWidth: 800, marginInline: 'auto'
      }}>
        {title}
      </h2>
    </div>
  )
}

function FadeIn({ children, delay = 0, visible }) {
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`
    }}>
      {children}
    </div>
  )
}

// ============================================================
// أيقونات SVG خفيفة
// ============================================================
function IconLink() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}
function IconList() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}
function IconMedia() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  )
}
function IconLock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
function IconSpark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 6.4L21 11l-6.6 2.6L12 20l-2.4-6.4L3 11l6.6-2.6L12 2z" />
    </svg>
  )
}
