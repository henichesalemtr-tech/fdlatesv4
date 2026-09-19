'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type LandingSettings = Record<string, string>

const DEFAULTS: LandingSettings = {
  landing_title: 'مؤسسة الفردوس',
  landing_subtitle: 'للتضامن والتربية والثقافة والتعليم',
  landing_description: '«لأنهم أمانة.. نُساندهم بعقيدةٍ راسخة، قرآنٍ يُنير دربهم، وعلومٍ تفتح أمامهم آفاق النجاح.»',
  landing_show_stats: 'true',
  landing_stat1_label: 'طالب مسجّل', landing_stat1_value: '350+',
  landing_stat2_label: 'معلم ', landing_stat2_value: '12',
  landing_stat3_label: 'فوج دراسي', landing_stat3_value: '12+',
  landing_feature1_title: 'التنشئة القرآنية والتربوية', landing_feature1_desc: 'العناية بتربية الأجيال على العقيدة السليمة و حفظ القرآن الكريم وتدبره، وتعزيز القيم والأخلاق الإسلامية والتربوية في المجتمع ', landing_feature1_icon: '📖',
  landing_feature2_title: 'التعليم وتطوير المهارات (اللغات والإعلام الآلي) ', landing_feature2_desc: 'تقديم دورات تدريبية وتأهيلية في اللغات الأجنبية وتقنيات الإعلام الآلي لمواكبة متطلبات العصر الرقمي', landing_feature2_icon: '🔬',
  landing_feature3_title: 'نشر الثقافة والعلوم', landing_feature3_desc: 'تنظيم نشاطات علمية وثقافية تهدف إلى توسيع آفاق الشباب والبراعم وتنمية الشغف بالمعرفة والابتكار', landing_feature3_icon: '💡',
  landing_feature4_title: 'التضامن والعمل الاجتماعي', landing_feature4_desc: 'المساهمة في المبادرات الاجتماعية والتضامنية لخدمة أهالي المنطقة وتعزيز روح التعاون والتكافل بين أفراد المجتمع', landing_feature4_icon: '🤝',
  landing_show_register_btn: 'true',
  landing_register_btn_text: 'طلب التسجيل',
  landing_login_btn_text: 'دخول المنصة',
  landing_footer_text: 'جميع الحقوق محفوظة',
  school_name: 'مؤسسة الفردوس - فرع الدبيلة',
  primary_color: '#0d5c3a',
  accent_gold: '#d4af37'
}

function useSettings() {
  const [s, setS] = useState<LandingSettings>(DEFAULTS)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    fetch('/api/landing')
      .then(r => r.json())
      .then((data: LandingSettings) => {
        setS({ ...DEFAULTS, ...data })
        setReady(true)
      })
      .catch(() => setReady(true))
  }, [])
  return { s, ready }
}

// Animated counter component
function Counter({ target }: { target: string }) {
  const num = parseInt(target.replace(/\D/g, '')) || 0
  const suffix = target.replace(/[\d]/g, '')
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  
  useEffect(() => {
    if (!num) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const dur = 1400
        const steps = 50
        const step = num / steps
        let cur = 0
        const timer = setInterval(() => {
          cur = Math.min(cur + step, num)
          setCount(Math.floor(cur))
          if (cur >= num) clearInterval(timer)
        }, dur / steps)
      }
    }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [num])
  
  return <span ref={ref}>{count}{suffix}</span>
}

export default function LandingPage() {
  const { s, ready } = useSettings()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const primaryColor = s.primary_color || '#0d5c3a'
  const goldColor = s.accent_gold || '#d4af37'

  const features = [
    { title: s.landing_feature1_title, desc: s.landing_feature1_desc, icon: s.landing_feature1_icon },
    { title: s.landing_feature2_title, desc: s.landing_feature2_desc, icon: s.landing_feature2_icon },
    { title: s.landing_feature3_title, desc: s.landing_feature3_desc, icon: s.landing_feature3_icon },
    { title: s.landing_feature4_title, desc: s.landing_feature4_desc, icon: s.landing_feature4_icon },
  ]
  const stats = [
    { label: s.landing_stat1_label, value: s.landing_stat1_value },
    { label: s.landing_stat2_label, value: s.landing_stat2_value },
    { label: s.landing_stat3_label, value: s.landing_stat3_value },
  ]

  // بنود النظام الداخلي للمؤسسة
  const rules = [
    {
      icon: '⏰',
      title: 'الالتزام بالأوقات والإنضباط',
      desc: 'الالتزام بمواعيد الحضور والمغادرة المحددة للحلقات والدروس، والحفاظ على الهدوء والنظام داخل أروقة المؤسسة.'
    },
    {
      icon: '👔',
      title: 'الهندام والمظهر العام',
      desc: 'الالتزام بالزي المحتشم واللائق بالحرم التعليمي والتربوي للمؤسسة، والعناية بالنظافة الشخصية.'
    },
    {
      icon: '📜',
      title: 'احترام التأطير والإدارة',
      desc: 'احترام الأساتذة والمسيرين والزملاء، وتجنب السلوكيات غير التربوية أو المعرقلة للسير الحسن للدروس.'
    },
    {
      icon: '🏫',
      title: 'المحافظة على التجهيزات',
      desc: 'المحافظة على الأثاث، الوسائل التعليمية، والمرافق العامة للمؤسسة، والتبليغ الفوري عن أي تلف غير مقصود.'
    },
    {
      icon: '📱',
      title: 'استخدام الهواتف والأجهزة',
      desc: 'يُمنع استخدام الهواتف والأجهزة الإلكترونية أثناء الأوقات الدراسية إلا بطلب أو إذن صريح من الأستاذ.'
    },
    {
      icon: '📝',
      title: 'المتابعة والتقييم الدوري',
      desc: 'التزام ولي الأمر بمتابعة نتائج وحضور ابنه عبر المنصة الرقمية، والتعاون مع الإدارة لما فيه مصلحة الطالب.'
    }
  ]

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: primaryColor }} />
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen relative text-gray-800 antialiased selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden font-sans bg-[#fbfdfb]">

      {/* ── Background Elements (Blobs & Mesh) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '-10%', right: '-10%',
          width: 'clamp(300px, 50vw, 650px)', height: 'clamp(300px, 50vw, 650px)', borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryColor}18 0%, transparent 70%)`,
          filter: 'blur(70px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', left: '-5%',
          width: 'clamp(250px, 45vw, 550px)', height: 'clamp(250px, 45vw, 550px)', borderRadius: '50%',
          background: `radial-gradient(circle, ${goldColor}20 0%, transparent 70%)`,
          filter: 'blur(80px)',
        }} />
      </div>

      {/* ══════════════════ NAVBAR ══════════════════ */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-gray-100 shadow-sm transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          
          {/* Logo & Institution Name */}
          <Link href="/" className="flex items-center gap-3 text-right group">
            <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-emerald-800 via-amber-400 to-emerald-600 shadow-sm transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                <Image src="/logo.png" alt="شعار مؤسسة الفردوس" width={42} height={42} className="object-contain" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg sm:text-xl text-emerald-950 tracking-tight leading-snug">
                {s.landing_title}
              </span>
              <span className="text-[10px] sm:text-xs text-amber-600 font-semibold tracking-wide">
                {s.school_name}
              </span>
            </div>
          </Link>

          {/* Desktop Links & CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <a href="#rules-section" className="text-sm font-semibold text-gray-600 hover:text-emerald-800 transition-colors">
              النظام الداخلي
            </a>
            {s.landing_show_register_btn === 'true' && (
              <Link href="/register"
                className="px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-200"
                style={{ borderColor: goldColor, color: '#7a5a00' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${goldColor}15`)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {s.landing_register_btn_text}
              </Link>
            )}
            <Link href="/login"
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              {s.landing_login_btn_text}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-emerald-900 hover:bg-emerald-50 focus:outline-none"
            aria-label="Toggle Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-gray-100 bg-white/95 backdrop-blur-lg px-4 pt-3 pb-5 flex flex-col gap-2 shadow-lg animate-fadeIn">
            <a 
              href="#rules-section" 
              className="w-full text-center py-2.5 text-sm font-semibold text-gray-700 hover:bg-emerald-50 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              النظام الداخلي للمؤسسة
            </a>
            <Link href="/login"
              className="w-full text-center py-3 rounded-xl text-sm font-bold text-white shadow"
              style={{ backgroundColor: primaryColor }}
              onClick={() => setMobileMenuOpen(false)}
            >
              {s.landing_login_btn_text}
            </Link>
            {s.landing_show_register_btn === 'true' && (
              <Link href="/register"
                className="w-full text-center py-3 rounded-xl text-sm font-bold border-2"
                style={{ borderColor: goldColor, color: '#7a5a00' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {s.landing_register_btn_text}
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* ══════════════════ HERO SECTION ══════════════════ */}
      <section className="relative z-10 pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 text-center max-w-4xl mx-auto">
        
        {/* Subtitle Badge */}
        <div 
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs sm:text-sm font-bold shadow-sm"
          style={{ backgroundColor: `${primaryColor}10`, border: `1px solid ${primaryColor}30`, color: primaryColor }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: goldColor }} />
          <span>{s.landing_subtitle}</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-emerald-950 tracking-tight leading-tight sm:leading-tight mb-6">
          {s.landing_title}
          <span className="block text-2xl sm:text-4xl md:text-5xl mt-2 font-bold" style={{ color: primaryColor }}>
للتضامن والتربية والثقافة والتعليم 
          </span>
        </h1>

        {/* Description */}
        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          {s.landing_description}
        </p>

        {/* Call-To-Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            style={{ backgroundColor: primaryColor, boxShadow: `0 8px 25px ${primaryColor}35` }}
          >
            {s.landing_login_btn_text} ←
          </Link>

          {s.landing_show_register_btn === 'true' && (
            <Link href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold bg-white text-gray-700 border border-gray-200 shadow-sm hover:border-amber-400 hover:text-emerald-900 transition-all duration-200 hover:-translate-y-0.5"
            >
              {s.landing_register_btn_text}
            </Link>
          )}
        </div>
      </section>

      {/* ══════════════════ STATS SECTION ══════════════════ */}
      {s.landing_show_stats === 'true' && (
        <section className="relative z-10 px-4 sm:px-6 pb-16 sm:pb-24">
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {stats.map((st, i) => (
              <div key={i} 
                className="bg-white/80 backdrop-blur-md border border-emerald-900/10 rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-600 to-amber-400 opacity-80" />
                <div className="text-3xl sm:text-4xl font-extrabold mb-2" style={{ color: primaryColor }}>
                  <Counter target={st.value} />
                </div>
                <div className="text-xs sm:text-sm font-semibold text-gray-500">{st.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════ FEATURES SECTION ══════════════════ */}
      <section className="relative z-10 px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-emerald-950 mb-4">
              المحاور الأساسية لنشاط  <span style={{ color: primaryColor }}>المؤسسة</span>
            </h2>
            <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: goldColor }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i}
                className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-emerald-200 flex flex-col items-start text-right group"
              >
                <div 
                  className="w-14 h-14 rounded-xl mb-5 flex items-center justify-center text-2xl transition-transform group-hover:scale-110 shadow-inner"
                  style={{ backgroundColor: `${primaryColor}12` }}
                >
                  {f.icon}
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-emerald-800 transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ RULES SECTION (النظام الداخلي) ══════════════════ */}
      <section id="rules-section" className="relative z-10 px-4 sm:px-6 pb-20 sm:pb-28 scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-12 sm:mb-16">
            <div 
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full mb-3 text-xs font-bold"
              style={{ backgroundColor: `${goldColor}20`, color: '#8a6500' }}
            >
              📋 ضوابط وإرشادات
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-emerald-950 mb-4">
              النظام الداخلي <span style={{ color: primaryColor }}>للمؤسسة</span>
            </h2>
            <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto mb-4">
              قواعد وضوابط عامة تهدف لضمان سير العملية التربوية والتعليمية في أفضل الظروف
            </p>
            <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: goldColor }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rules.map((rule, idx) => (
              <div 
                key={idx}
                className="bg-white/80 backdrop-blur-md border border-emerald-900/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 relative"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: `${primaryColor}10` }}
                  >
                    {rule.icon}
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-emerald-950">
                    {rule.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {rule.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════ CTA BANNER ══════════════════ */}
      <section className="relative z-10 px-4 sm:px-6 pb-20">
        <div 
          className="max-w-4xl mx-auto rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl"
          style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #062b1a 100%)` }}
        >
          {/* Subtle Golden Glow / Ring Accent */}
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full border-[20px] border-amber-400/10 pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full border-[20px] border-white/5 pointer-events-none" />

          <div className="relative z-10">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full p-1 bg-white/10 backdrop-blur-sm border border-amber-400/30 flex items-center justify-center shadow-lg">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                <Image 
                  src="/logo.png" 
                  alt="شعار مؤسسة الفردوس" 
                  width={80} 
                  height={80} 
                  className="object-contain p-1" 
                />
              </div>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4">
              مرحباً بكم في منصة الفردوس
            </h2>
            <p className="text-white/80 text-sm sm:text-base max-w-md mx-auto mb-8 leading-relaxed">
              سجّل دخولك الآن لمتابعة أبنائك.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login"
                className="px-8 py-3.5 rounded-xl text-sm font-bold bg-white transition-transform duration-200 hover:scale-105 shadow-md"
                style={{ color: primaryColor }}
              >
                {s.landing_login_btn_text} ←
              </Link>
              {s.landing_show_register_btn === 'true' && (
                <Link href="/register"
                  className="px-8 py-3.5 rounded-xl text-sm font-bold text-white border border-white/30 hover:bg-white/10 transition-colors"
                >
                  {s.landing_register_btn_text}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className="relative z-10 border-t border-gray-200/60 bg-white/60 backdrop-blur-md py-8 text-center px-4">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full overflow-hidden p-0.5 bg-emerald-700">
            <Image src="/logo.png" alt="شعار" width={28} height={28} className="object-contain bg-white rounded-full" />
          </div>
          <span className="font-bold text-gray-800 text-sm sm:text-base">{s.landing_title}</span>
        </div>
        <p className="text-xs text-gray-500">
          {s.landing_footer_text} — {s.school_name} © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}
