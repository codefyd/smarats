import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import BrandMark from '../components/BrandMark'

// ============================================================
// Landing Page — تصميم Refined Dark
// لون الهوية #0284c7 محفوظ، خلفية عميقة، typography جريئة
// ============================================================

export default function LandingPage() {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0a1628 0%, #0d1f3c 50%, #081420 100%)',
        color: '#e8f4fd',
        fontFamily: 'Thmanyah Sans, Tajawal, system-ui, sans-serif',
        overflowX: 'hidden'
      }}
    >
      <GridOverlay />
      <Header />
      <Hero />
      <StatsBar />
      <Features />
      <HowItWorks />
      <Plans />
      <CTASection />
      <Footer />
    </div>
  )
}

// ---- شبكة زخرفية خفية في الخلفية ----
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

function Header() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: scrolled ? 'rgba(10,22,40,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(2,132,199,0.15)' : '1px solid transparent',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandMark size={34} />
          <span style={{ fontWeight: 900, fontSize: 20, color: '#fff', letterSpacing: '-0.5px' }}>سماراتس</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/login" style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            color: '#93c5fd', background: 'transparent', border: '1px solid rgba(147,197,253,0.3)',
            textDecoration: 'none', transition: 'all 0.2s'
          }}>
            دخول
          </Link>
          <Link to="/register" style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 700,
            color: '#fff', background: '#0284c7', border: 'none',
            textDecoration: 'none', boxShadow: '0 4px 16px rgba(2,132,199,0.35)'
          }}>
            سجّل جهتك
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 80) }, [])

  return (
    <section style={{
      position: 'relative', zIndex: 1,
      maxWidth: 900, margin: '0 auto', padding: '90px 24px 70px',
      textAlign: 'center'
    }}>
      {/* Badge */}
      <FadeIn delay={0} visible={visible}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(2,132,199,0.12)', border: '1px solid rgba(2,132,199,0.3)',
          borderRadius: 40, padding: '6px 16px', marginBottom: 32
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: '#0284c7',
            display: 'inline-block', boxShadow: '0 0 8px #0284c7'
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#60b3e8', letterSpacing: 0.5 }}>
            نظام عرض محتوى للشاشات الذكية
          </span>
        </div>
      </FadeIn>

      {/* Headline */}
      <FadeIn delay={80} visible={visible}>
        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 68px)',
          fontWeight: 900,
          lineHeight: 1.15,
          marginBottom: 24,
          color: '#fff',
          letterSpacing: '-1.5px'
        }}>
          شغّل شاشاتك<br />
          <span style={{
            background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            برابط واحد
          </span>
        </h1>
      </FadeIn>

      {/* Sub */}
      <FadeIn delay={160} visible={visible}>
        <p style={{
          fontSize: 18, lineHeight: 1.75, color: '#94b8d4',
          maxWidth: 600, margin: '0 auto 40px', fontWeight: 400
        }}>
          إدارة محتوى شاشات العرض بدون برامج أو تقنيين — الصق روابط
          الصور والفيديوهات، وشاشاتك تبدأ العرض تلقائياً بعد أي إطفاء.
        </p>
      </FadeIn>

      {/* CTA Buttons */}
      <FadeIn delay={240} visible={visible}>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" style={{
            padding: '14px 32px', borderRadius: 12, fontSize: 16, fontWeight: 700,
            color: '#fff', background: '#0284c7', textDecoration: 'none',
            boxShadow: '0 8px 24px rgba(2,132,199,0.4)',
            transition: 'transform 0.2s'
          }}>
            ابدأ مجاناً ←
          </Link>
          <Link to="/login" style={{
            padding: '14px 28px', borderRadius: 12, fontSize: 16, fontWeight: 600,
            color: '#93c5fd', background: 'rgba(2,132,199,0.1)',
            border: '1px solid rgba(2,132,199,0.25)', textDecoration: 'none'
          }}>
            دخول الحساب
          </Link>
        </div>
      </FadeIn>

      {/* Mockup Screen */}
      <FadeIn delay={360} visible={visible}>
        <div style={{ marginTop: 64, position: 'relative', display: 'inline-block' }}>
          {/* Glow */}
          <div style={{
            position: 'absolute', inset: -40, borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(2,132,199,0.18) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          {/* Screen Frame */}
          <div style={{
            background: 'linear-gradient(145deg, #1a2d4a, #0f1e35)',
            border: '1px solid rgba(2,132,199,0.25)',
            borderRadius: 20,
            padding: 3,
            boxShadow: '0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
            maxWidth: 720, width: '100%'
          }}>
            {/* Window Bar */}
            <div style={{
              background: 'rgba(8,18,32,0.9)',
              borderRadius: '17px 17px 0 0',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderBottom: '1px solid rgba(2,132,199,0.1)'
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
              </div>
              <div style={{
                flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 6,
                padding: '4px 12px', fontSize: 11, color: '#4a7a9b', textAlign: 'left', direction: 'ltr'
              }}>
                smarats.app/s/<span style={{ color: '#38bdf8' }}>Ab3Xm2Kp</span>
              </div>
            </div>
            {/* Screen Content */}
            <div style={{
              background: '#000', borderRadius: '0 0 17px 17px',
              aspectRatio: '16/7', overflow: 'hidden',
              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ScreenMockup />
            </div>
          </div>
          {/* Stand */}
          <div style={{
            width: 80, height: 6, background: 'rgba(2,132,199,0.3)',
            margin: '0 auto', borderRadius: '0 0 4px 4px'
          }} />
        </div>
      </FadeIn>
    </section>
  )
}

function ScreenMockup() {
  const [slide, setSlide] = useState(0)
  const slides = [
    {
      bg: 'linear-gradient(135deg, #0c2340 0%, #0a4880 100%)',
      text: 'مؤتمر الابتكار 2025',
      sub: 'القاعة الرئيسية — الطابق الأول',
      icon: '🏢'
    },
    {
      bg: 'linear-gradient(135deg, #1a0a2e 0%, #0a2040 100%)',
      text: 'رمضان مبارك',
      sub: 'جمعية البر الخيرية',
      icon: '🌙'
    },
    {
      bg: 'linear-gradient(135deg, #0a2010 0%, #0a3a18 100%)',
      text: 'عروض اليوم',
      sub: 'تخفيضات تصل إلى ٥٠٪',
      icon: '🛍️'
    }
  ]

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % slides.length), 3000)
    return () => clearInterval(t)
  }, [])

  const s = slides[slide]
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: s.bg,
      transition: 'background 0.8s ease',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: 24
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{s.icon}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: -0.5 }}>{s.text}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{s.sub}</div>
      {/* Dots */}
      <div style={{ display: 'flex', gap: 6, marginTop: 20 }}>
        {slides.map((_, i) => (
          <div key={i} style={{
            width: i === slide ? 20 : 6, height: 6, borderRadius: 3,
            background: i === slide ? '#0284c7' : 'rgba(255,255,255,0.2)',
            transition: 'width 0.4s, background 0.4s'
          }} />
        ))}
      </div>
    </div>
  )
}

function StatsBar() {
  return (
    <section style={{
      position: 'relative', zIndex: 1,
      borderTop: '1px solid rgba(2,132,199,0.15)',
      borderBottom: '1px solid rgba(2,132,199,0.15)',
      background: 'rgba(2,132,199,0.05)',
      padding: '28px 24px'
    }}>
      <div style={{
        maxWidth: 900, margin: '0 auto',
        display: 'flex', justifyContent: 'space-around',
        flexWrap: 'wrap', gap: 24
      }}>
        {[
          { num: '٨ أحرف', label: 'رابط الشاشة القصير' },
          { num: '٣ أنواع', label: 'محتوى مدعوم' },
          { num: 'صفر', label: 'برامج مطلوبة' },
          { num: '٢٤/٧', label: 'عرض مستمر' }
        ].map(({ num, label }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#38bdf8', marginBottom: 4 }}>{num}</div>
            <div style={{ fontSize: 13, color: '#607a90', fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Features() {
  const features = [
    {
      icon: <IconScreen />,
      title: 'رابط مباشر بلا تركيب',
      desc: 'افتح الرابط على أي متصفح — الشاشة تبدأ تلقائياً بعد كل إطفاء أو انقطاع في الكهرباء.'
    },
    {
      icon: <IconMedia />,
      title: 'دعم كامل لدرايف ويوتيوب',
      desc: 'الصق الرابط والنظام يكتشف النوع تلقائياً: صورة، فيديو، يوتيوب، Google Drive.'
    },
    {
      icon: <IconShield />,
      title: 'عزل كامل بين الجهات',
      desc: 'كل جهة ترى بياناتها فقط. صلاحيات صارمة على مستوى قاعدة البيانات.'
    },
    {
      icon: <IconSpeed />,
      title: 'خفيف وسريع',
      desc: 'لا رفع ملفات، لا سيرفرات مكلفة. روابط فقط وأداء عالٍ.'
    },
    {
      icon: <IconLock />,
      title: 'حماية الشاشات بكلمة سر',
      desc: 'خيار اختياري لتأمين شاشة بعينها من الدخول غير المصرّح به.'
    },
    {
      icon: <IconOrg />,
      title: 'مناسب لجميع القطاعات',
      desc: 'شركات، جمعيات خيرية، مؤسسات حكومية — نظام موحّد لكل الأنواع.'
    }
  ]

  return (
    <section style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
      <SectionTitle badge="المزايا" title="كل ما تحتاجه لشاشاتك" />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20, marginTop: 48
      }}>
        {features.map((f, i) => (
          <FeatureCard key={i} {...f} index={i} />
        ))}
      </div>
    </section>
  )
}

function FeatureCard({ icon, title, desc, index }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(2,132,199,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? 'rgba(2,132,199,0.35)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 16, padding: '28px 24px',
        transition: 'all 0.25s',
        cursor: 'default'
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'rgba(2,132,199,0.15)',
        border: '1px solid rgba(2,132,199,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 18, color: '#38bdf8'
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e8f4fd', marginBottom: 10 }}>{title}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: '#607a90' }}>{desc}</p>
    </div>
  )
}

function HowItWorks() {
  const steps = [
    { n: '01', title: 'سجّل جهتك', desc: 'تسجيل مجاني — تفعيل بعد موافقة الإدارة خلال وقت قصير.' },
    { n: '02', title: 'أنشئ قائمة عرض', desc: 'الصق روابط الصور والفيديوهات من درايف أو يوتيوب أو أي مصدر.' },
    { n: '03', title: 'ربط القائمة بالشاشة', desc: 'كل شاشة تحصل على رابط فريد قصير من 8 أحرف.' },
    { n: '04', title: 'شغّل الرابط على الشاشة', desc: 'افتح الرابط في متصفح الشاشة والعرض يبدأ تلقائياً — دون تدخل.' }
  ]

  return (
    <section style={{
      position: 'relative', zIndex: 1,
      background: 'rgba(0,0,0,0.2)',
      borderTop: '1px solid rgba(2,132,199,0.1)',
      borderBottom: '1px solid rgba(2,132,199,0.1)',
      padding: '80px 24px'
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionTitle badge="طريقة العمل" title="٤ خطوات وينطلق العرض" />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 32, marginTop: 52
        }}>
          {steps.map((s, i) => (
            <div key={i} style={{ position: 'relative' }}>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div style={{
                  position: 'absolute', top: 22, right: -16,
                  width: 32, height: 1,
                  background: 'linear-gradient(90deg, rgba(2,132,199,0.5), transparent)',
                  display: 'none' // only visible on desktop
                }} />
              )}
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(2,132,199,0.15)',
                border: '1px solid rgba(2,132,199,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16, color: '#38bdf8',
                fontSize: 14, fontWeight: 900, letterSpacing: -0.5,
                fontFamily: 'monospace'
              }}>
                {s.n}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e8f4fd', marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#607a90' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Plans() {
  const plans = [
    {
      name: 'بلس',
      en: 'Plus',
      screens: 5,
      playlists: 5,
      highlight: false,
      features: ['٥ شاشات نشطة', '٥ قوائم عرض', 'حماية بكلمة سر', 'روابط قصيرة', 'جميع أنواع المحتوى']
    },
    {
      name: 'برو',
      en: 'Pro',
      screens: 10,
      playlists: 10,
      highlight: true,
      features: ['١٠ شاشات نشطة', '١٠ قوائم عرض', 'حماية بكلمة سر', 'روابط قصيرة', 'جميع أنواع المحتوى']
    },
    {
      name: 'ماكس',
      en: 'Max',
      screens: 20,
      playlists: 20,
      highlight: false,
      features: ['٢٠ شاشة نشطة', '٢٠ قائمة عرض', 'حماية بكلمة سر', 'روابط قصيرة', 'جميع أنواع المحتوى']
    }
  ]

  return (
    <section style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '80px 24px' }}>
      <SectionTitle badge="الباقات" title="اختر الباقة المناسبة" />
      <p style={{ textAlign: 'center', color: '#607a90', fontSize: 14, marginTop: 8, marginBottom: 48 }}>
        جميع الباقات تشمل نفس المزايا — الفرق في عدد الشاشات والقوائم
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 20
      }}>
        {plans.map((p, i) => (
          <PlanCard key={i} {...p} />
        ))}
      </div>
      <p style={{
        textAlign: 'center', marginTop: 32, fontSize: 13, color: '#3d5a6e',
        padding: '14px 24px',
        background: 'rgba(2,132,199,0.05)',
        border: '1px solid rgba(2,132,199,0.1)',
        borderRadius: 12,
        maxWidth: 500, margin: '32px auto 0'
      }}>
        💬 للمؤسسات الكبيرة، تواصل معنا لمعرفة الباقة المخصصة
      </p>
    </section>
  )
}

function PlanCard({ name, screens, playlists, highlight, features }) {
  return (
    <div style={{
      position: 'relative',
      background: highlight ? 'rgba(2,132,199,0.12)' : 'rgba(255,255,255,0.03)',
      border: highlight ? '1px solid rgba(2,132,199,0.45)' : '1px solid rgba(255,255,255,0.07)',
      borderRadius: 18, padding: '28px 24px',
      boxShadow: highlight ? '0 8px 32px rgba(2,132,199,0.2)' : 'none'
    }}>
      {highlight && (
        <div style={{
          position: 'absolute', top: -12, right: 24,
          background: '#0284c7', color: '#fff',
          fontSize: 11, fontWeight: 700, padding: '3px 12px',
          borderRadius: 20, letterSpacing: 0.5
        }}>
          الأكثر طلباً
        </div>
      )}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 6 }}>{name}</h3>
        <div style={{
          display: 'flex', gap: 16, fontSize: 13,
          color: highlight ? '#38bdf8' : '#607a90'
        }}>
          <span>📺 {screens} شاشات</span>
          <span>📋 {playlists} قوائم</span>
        </div>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', spaceY: 8 }}>
        {features.map((f, i) => (
          <li key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 14, color: '#94b8d4', marginBottom: 8
          }}>
            <span style={{ color: '#0284c7', fontWeight: 900 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <Link to="/register" style={{
        display: 'block', textAlign: 'center',
        padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700,
        textDecoration: 'none',
        background: highlight ? '#0284c7' : 'rgba(2,132,199,0.15)',
        color: '#fff',
        border: highlight ? 'none' : '1px solid rgba(2,132,199,0.3)',
        boxShadow: highlight ? '0 4px 14px rgba(2,132,199,0.35)' : 'none'
      }}>
        ابدأ الآن ←
      </Link>
    </div>
  )
}

function CTASection() {
  return (
    <section style={{
      position: 'relative', zIndex: 1,
      maxWidth: 800, margin: '0 auto', padding: '60px 24px 100px',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, rgba(2,132,199,0.15), rgba(2,132,199,0.05))',
        border: '1px solid rgba(2,132,199,0.25)',
        borderRadius: 24, padding: '52px 40px',
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Glow corner */}
        <div style={{
          position: 'absolute', top: -60, left: -60,
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2,132,199,0.25), transparent)',
          pointerEvents: 'none'
        }} />
        <h2 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 14, letterSpacing: -0.5 }}>
          جاهز تبدأ؟
        </h2>
        <p style={{ fontSize: 16, color: '#94b8d4', marginBottom: 36, lineHeight: 1.7 }}>
          سجّل جهتك اليوم وسيتم التفعيل خلال وقت قصير
        </p>
        <Link to="/register" style={{
          display: 'inline-block',
          padding: '14px 36px', borderRadius: 12, fontSize: 16, fontWeight: 800,
          color: '#fff', background: '#0284c7',
          textDecoration: 'none',
          boxShadow: '0 8px 32px rgba(2,132,199,0.45)'
        }}>
          سجّل جهتك مجاناً
        </Link>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer style={{
      position: 'relative', zIndex: 1,
      borderTop: '1px solid rgba(2,132,199,0.1)',
      padding: '28px 24px',
      textAlign: 'center',
      color: '#3d5a6e', fontSize: 13
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
        <BrandMark size={22} />
        <span style={{ fontWeight: 700, color: '#607a90' }}>سماراتس</span>
      </div>
      © {new Date().getFullYear()} سماراتس. جميع الحقوق محفوظة.
    </footer>
  )
}

// ---- مساعدات ----
function SectionTitle({ badge, title }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <span style={{
        display: 'inline-block',
        background: 'rgba(2,132,199,0.12)',
        border: '1px solid rgba(2,132,199,0.25)',
        borderRadius: 20, padding: '4px 14px',
        fontSize: 12, fontWeight: 700, color: '#38bdf8',
        letterSpacing: 0.8, marginBottom: 16, textTransform: 'uppercase'
      }}>
        {badge}
      </span>
      <h2 style={{
        fontSize: 'clamp(26px, 4vw, 40px)',
        fontWeight: 900, color: '#e8f4fd',
        letterSpacing: -0.8, margin: 0
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
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`
    }}>
      {children}
    </div>
  )
}

// ---- أيقونات SVG خفيفة ----
function IconScreen() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}
function IconMedia() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  )
}
function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
function IconSpeed() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}
function IconLock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}
function IconOrg() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
