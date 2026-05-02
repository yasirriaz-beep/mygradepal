'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import './landing.css'

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'What is the difference between O Level and IGCSE?',
    a: 'They are the same qualification. O Level is the traditional name most Pakistani parents grew up with. IGCSE is the current official name used by Cambridge. Both refer to the same Cambridge exams your child sits in Grade 10. MyGradePal covers both completely.',
  },
  {
    q: 'Which schools in Pakistan use Cambridge O Level / IGCSE?',
    a: 'Most private English-medium schools use Cambridge — Beaconhouse, City School, Lahore Grammar School, The Educators, and most schools in DHA, Gulberg, Bahria Town, and Clifton. If your child\'s school uses Cambridge exam codes like 0620 for Chemistry or 0580 for Mathematics, MyGradePal is built for them.',
  },
  {
    q: 'When do O Level / IGCSE exams take place?',
    a: 'Cambridge runs two exam sessions every year. May/June is the main session — most Pakistani students appear in this one in Grade 10. October/November is the resit session. MyGradePal prepares students for both sessions with past papers from every sitting.',
  },
  {
    q: 'How is MyGradePal different from a private tutor?',
    a: 'Private tutors come 3 times a week at most — and academies mean driving your child across the city every evening, sitting in traffic, waiting outside for hours. MyGradePal is available 24 hours a day, 7 days a week from your own home. No commute. No waiting. No cancelled sessions. And unlike a tutor or academy, you get a full report of exactly what your child studied — sent to your WhatsApp every Sunday evening.',
  },
  {
    q: 'Is there a real teacher involved or is it just software?',
    a: 'MyGradePal\'s tutoring system is built on the knowledge of experienced Cambridge O Level teachers and subject specialists. Every explanation and every mark scheme is grounded in real Cambridge marking standards. Our question bank is sourced directly from Cambridge past papers going back 15 years.',
  },
  {
    q: 'How does the expert marking work?',
    a: 'When your child submits an answer, our system marks it against the official Cambridge mark scheme — the same document Cambridge examiners use. It shows exactly which marks were awarded, which were missed, and why. This is more detailed feedback than most private tutors provide.',
  },
  {
    q: 'My child is weak in one subject. Can I subscribe to just that one?',
    a: 'Yes. MyGradePal is priced at Rs 5,000 per subject per month. You choose exactly which subjects your child needs. Start with one, add more whenever you are ready. No bundle required.',
  },
  {
    q: 'How do I know my child is actually studying and not just opening the app?',
    a: 'MyGradePal tracks active study time — questions attempted, answers submitted, tutor messages exchanged. Simply opening the app does not count. You see the real numbers every day on your parent dashboard and receive a WhatsApp report every Sunday evening.',
  },
  {
    q: 'Can I control when my child must study?',
    a: 'Yes. The session lock feature lets you set a daily study window — for example 7pm to 9pm. If your child does not complete their minimum session during that window, you receive a WhatsApp alert immediately. You have full visibility and control every single day.',
  },
  {
    q: 'Is it safe for my daughter to use?',
    a: 'Completely. MyGradePal is used entirely at home on your child\'s own device. There is no contact with any person, no video calls, no chat with strangers. It is as safe as a textbook — but far more effective.',
  },
  {
    q: 'Can my child use it in Urdu?',
    a: 'Yes. Your child can ask questions and receive explanations in Urdu, English, or a mix of both — whichever feels most natural to them. Many Pakistani students find complex Chemistry and Physics concepts easier to understand when explained in Urdu first.',
  },
  {
    q: 'What happens after the 7-day free trial?',
    a: 'After your free trial you choose which subjects to continue with at Rs 5,000 per subject per month. Contact us at hello@mygradepal.com or WhatsApp us and we activate your subscription within 2 hours. No automatic charges — you only pay when you decide to continue.',
  },
]

export default function Home() {
  const [total, setTotal] = useState(0)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const subjects = [
    'Chemistry (0620)',
    'Physics (0625)',
    'Mathematics (0580)',
    'Biology (0610)',
    'English (0510)',
    'Pakistan Studies (0448)',
    'Islamiyat (0493)',
  ]

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible')
      })
    }, { threshold: 0.1 })
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))

    const handleScroll = () => {
      const nav = document.querySelector('nav') as HTMLElement | null
      if (nav) nav.style.boxShadow = window.scrollY > 50
        ? '0 4px 32px rgba(14,26,26,.08)' : 'none'
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSubjectChange = (checked: boolean) => {
    setTotal((prev) => (checked ? prev + 5000 : prev - 5000))
  }

  return (
    <main suppressHydrationWarning>
      <nav>
        <div className="nav-logo">
          <span className="my">My</span>Grade<span className="pal">Pal</span>
        </div>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#how">How it works</a></li>
        </ul>
        <div className="nav-cta">
          <Link href="/parent/login" className="btn-outline">Parent login</Link>
          <Link href="/login" className="btn-primary">Start free trial</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-bg">
          <Image
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1400"
            alt="University graduation"
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>
        <div className="hero-overlay" />
        <div className="hero-layout">
          <div className="hero-inner">
            <p className="hero-eyebrow">Pakistan&apos;s most advanced O Level / IGCSE tutoring platform</p>
            <h1 className="hero-title">
              Your child&apos;s
              <br />
              <span className="accent">academy</span> —
              <br />
              <span className="accent-orange">at home.</span>
            </h1>
            <p className="hero-subtitle">
              MyGradePal gives your child a 24/7 personal tutor for O Level / IGCSE —
              No academies. No commute. No cancelled sessions. Just results — with complete visibility into every minute your child studies.
            </p>
            <p className="hero-note">
              Our expert tutoring system is developed with qualified Cambridge O Level / IGCSE teachers
            </p>
            <div className="hero-actions">
              <Link href="/login" className="btn-hero">Start free 7-day trial →</Link>
              <a href="#how" className="btn-hero-secondary">See how it works</a>
            </div>
          </div>

          <div className="hero-mockup">
            <div className="mockup-header">
              <span className="mockup-badge">Chemistry 0620</span>
              <span className="mockup-streak">🔥 12 day streak</span>
            </div>
            <p className="mockup-title">Student Dashboard</p>
            <div className="mockup-card">
              <p className="mockup-label">Topic Progress</p>
              <div className="mockup-progress-track">
                <div className="mockup-progress-fill" />
              </div>
              <p className="mockup-progress-text">68% complete this week</p>
            </div>
            <div className="mockup-next">
              <p className="mockup-next-label">Next</p>
              <p className="mockup-next-topic">Electrochemistry</p>
            </div>
          </div>
        </div>
      </section>

      <section className="dream-section">
        <div className="section-label">Your child&apos;s future</div>
        <h2 className="section-title">Every parent has a dream for their child</h2>
        <p className="section-sub">MyGradePal helps make it real — one study session at a time.</p>
        <div className="dream-grid reveal">
          <div className="dream-card">
            <div className="dream-image-wrap">
              <Image
                src="https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=600"
                alt="Top universities"
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div className="dream-content">
              <div className="dream-caption">Top universities in Pakistan and abroad</div>
              <p className="dream-text">LUMS, NUST, Aga Khan, IBA — and beyond. Strong O Level / IGCSE grades open every door.</p>
            </div>
          </div>
          <div className="dream-card">
            <div className="dream-image-wrap">
              <Image
                src="https://images.unsplash.com/photo-1627556704302-624286467c65?w=600"
                alt="Graduation ceremony"
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div className="dream-content">
              <div className="dream-caption">The moment every parent lives for</div>
              <p className="dream-text">Picture your child in that graduation gown. It starts with the grades they earn today.</p>
            </div>
          </div>
          <div className="dream-card">
            <div className="dream-image-wrap">
              <Image
                src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600"
                alt="Bright career"
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div className="dream-content">
              <div className="dream-caption">A future without limits</div>
              <p className="dream-text">Medicine, engineering, business, law. Every career your child dreams of begins here.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="stats-bar">
        <div className="stats-grid">
          <div className="stat"><div className="stat-value">5,200+</div><div className="stat-label">Past paper questions</div></div>
          <div className="stat"><div className="stat-value">15 years</div><div className="stat-label">Cambridge data analysed</div></div>
          <div className="stat"><div className="stat-value">7</div><div className="stat-label">O Level / IGCSE subjects covered</div></div>
          <div className="stat"><div className="stat-value">24/7</div><div className="stat-label">Always available</div></div>
        </div>
      </div>

      <section className="pain-section" id="why">
        <div className="section-label">Why parents choose MyGradePal</div>
        <h2 className="section-title">We heard every concern about online tutoring</h2>
        <p className="section-sub">And built the answer into the product.</p>
        <div className="pain-grid reveal">
          {[
            { emoji: '😤', title: '"My child is not disciplined without someone next to them"', text: 'Physical tutors work because children cannot escape. MyGradePal is there every single day.', solution: 'Session lock forces study before screen time. You control it.' },
            { emoji: '🤷', title: '"I have no idea what my child studied with the tutor"', text: 'Tutors give zero data. Parents have no visibility into what was covered or understood.', solution: 'Real-time dashboard + WhatsApp report every Sunday.' },
            { emoji: '💸', title: '"I am spending Rs 20,000 a month and grades have not improved"', text: 'Private tutors charge Rs 8,000–25,000 per subject per month with no guarantee of results.', solution: 'Rs 5,000 per subject. Full visibility. Measurable results.' },
            { emoji: '🕐', title: '"The tutor cancelled again. Exams are in 6 weeks."', text: 'Human tutors get sick, have commitments, and take holidays. Your child\'s exam waits for no one.', solution: 'Available 24/7. Never cancels. Never has a bad day.' },
            { emoji: '🚗', title: '"Driving to academies every evening is exhausting — and worrying"', text: 'Evening traffic to DHA or Gulberg academies. Waiting outside for an hour. Rushing back for dinner. Pakistani parents spend 8-10 hours a week just transporting children to academies and tuition centres. And you still have no idea what they actually learned inside.', solution: '100% at home. No commute. No waiting. No traffic. No safety concerns.' },
            { emoji: '📊', title: '"I do not know if my child is ready for the exam"', text: 'Most parents only find out how prepared their child is when results arrive.', solution: 'Live readiness score and exam countdown every week.' },
          ].map((p, i) => (
            <div className="pain-card" key={i}>
              <span className="pain-emoji">{p.emoji}</span>
              <h3 className="pain-title">{p.title}</h3>
              <p className="pain-text">{p.text}</p>
              <div className="pain-solution">✓ {p.solution}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="section-label">What is included</div>
        <h2 className="section-title">Everything your child needs to excel at O Level / IGCSE</h2>
        <p className="section-sub">Built by experienced O Level / IGCSE teachers and subject experts from across Pakistan.</p>
        <div className="features-grid reveal">
          {[
            { icon: '🔒', title: 'Session lock and discipline', text: 'Set a daily study window. The system enforces it every day. You get a WhatsApp alert if the session is missed.' },
            { icon: '📱', title: 'Real-time parent dashboard', text: 'See exactly what your child studied, how long, how many questions answered, and their score — updated live.' },
            { icon: '📝', title: 'Cambridge past paper practice', text: '15 years of real Cambridge past papers. Expert marking on every answer with detailed feedback on exactly where marks were lost.' },
            { icon: '🎙️', title: 'Personal tutor in Urdu and English', text: 'Your child can ask questions in Urdu or English. Concepts explained simply with local Pakistani examples.' },
            { icon: '🔮', title: 'SmartPredict — exam prediction', text: 'Based on 15 years of Cambridge data, SmartPredict shows which topics are most likely in the upcoming exam.' },
            { icon: '📊', title: 'Weekly WhatsApp reports', text: 'Every Sunday evening you receive a complete progress report. Days studied, topics covered, weak areas, exam readiness.' },
          ].map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-text">{f.text}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="section-label">How it works</div>
        <h2 className="section-title">Simple for parents. Powerful for students.</h2>
        <p className="section-sub">From signup to your child&apos;s first session in under 10 minutes.</p>
        <div className="steps-grid reveal">
          {[
            { num: '1', title: 'Sign up as parent', text: 'Create your account. Add your child\'s name, grade and school. Takes 2 minutes.' },
            { num: '2', title: 'Set the schedule', text: 'Choose study days and time window. Set minimum session length. We do the rest.' },
            { num: '3', title: 'Child starts learning', text: 'Your child logs in, picks a subject, and begins. Past papers, concept explanations, practice questions.' },
            { num: '4', title: 'You see everything', text: 'Watch progress in real time. Get WhatsApp alerts. Receive a weekly report every Sunday evening.' },
          ].map((s, i) => (
            <div className="step" key={i}>
              <div className="step-num">{s.num}</div>
              <div className="step-title">{s.title}</div>
              <div className="step-text">{s.text}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="comparison-section">
        <div className="section-label">The honest comparison</div>
        <h2 className="section-title">More than a tutor. Less than you think.</h2>
        <div className="comparison-wrap reveal">
          <table>
            <thead>
              <tr>
                <th />
                <th className="private-head">Private Tutor / Academy</th>
                <th className="mgp-head">MyGradePal</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Cost per subject', 'Rs 8,000–25,000/month', 'Rs 5,000/month'],
                ['Availability', '3x per week', '24/7 — always'],
                ['Parent visibility', 'None', 'Complete — real time'],
                ['Cancellations', 'Common', 'Never'],
                ['Exam topic prediction', 'Sometimes', 'Always — SmartPredict'],
                ['Evening commute', '1-2 hours daily', 'Zero — study at home'],
                ['Waiting time', '30-60 min per session', 'None'],
                ['Safety', 'Unknown location', '100% at home'],
                ['Progress data', 'None', 'Real-time dashboard'],
                ['WhatsApp reports', 'None', 'Every Sunday'],
              ].map(([label, priv, mgp], i) => (
                <tr key={i}>
                  <td><strong>{label}</strong></td>
                  <td className="private-col">{priv}</td>
                  <td className="mgp-col"><b>✓ {mgp}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="logos-section">
        <div className="section-label" style={{ textAlign: 'center' }}>Your child&apos;s O Level / IGCSE grades open these doors</div>
        <div className="logo-strip">
          <div className="marquee">
            {['LUMS', 'NUST', 'Aga Khan University', 'IBA Karachi', 'COMSATS', 'University of London', 'University of Toronto', 'King\'s College London', 'University of Edinburgh', 'FAST NUCES', 'NED University', 'Lahore University',
              'LUMS', 'NUST', 'Aga Khan University', 'IBA Karachi', 'COMSATS', 'University of London', 'University of Toronto', 'King\'s College London', 'University of Edinburgh', 'FAST NUCES', 'NED University', 'Lahore University'
            ].map((u, i) => (
              <span className="logo-pill" key={i}>{u}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div style={{ textAlign: 'center' }}>
          <div className="section-label">Simple transparent pricing</div>
          <h2 className="section-title">Rs 5,000 per subject per month</h2>
          <p className="section-sub" style={{ margin: '0 auto 44px' }}>Choose exactly what your child needs. No bundles. No hidden fees.</p>
        </div>
        <div className="pricing-center">
          <div className="pricing-box reveal">
            <div className="price-main">Rs 5,000</div>
            <div className="price-sub">per subject / per month</div>
            <div className="subject-title">Choose your subjects:</div>
            <div className="subject-list">
              {subjects.map((s, i) => (
                <div className="subject-item" key={i}>
                  <input
                    type="checkbox"
                    id={`s${i}`}
                    onChange={(e) => handleSubjectChange(e.target.checked)}
                  />
                  <label htmlFor={`s${i}`}>{s} — Rs 5,000/month</label>
                </div>
              ))}
            </div>
            <div className="total-line">
              Your total: <strong>Rs {total.toLocaleString()}/month</strong>
            </div>
            <div className="price-cta">
              <Link href="/login" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px' }}>
                Start free 7-day trial
              </Link>
            </div>
            <div className="price-foot">✓ 7 days free &nbsp; ✓ Cancel anytime &nbsp; ✓ No credit card needed</div>
            <div className="referral-banner">
              <div className="referral-title">🎁 Refer a friend — you both get Rs 1,000 off next month</div>
              <Link href="/referral" className="referral-btn">Get your referral link →</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="testimonials-section">
        <div className="section-label" style={{ textAlign: 'center' }}>What parents say</div>
        <h2 className="section-title" style={{ textAlign: 'center' }}>Real results from Lahore families</h2>
        <div className="testimonials-grid reveal">
          {[
            { text: '"Ahmed got a B in Chemistry last year. After 3 months on MyGradePal he got an A* in his mocks. I cried when I saw the results. This platform changed everything."', author: 'Mrs. Fatima Siddiqui', detail: 'Mother of Grade 10 student · DHA Lahore' },
            { text: '"We were spending 2 hours every evening driving to the academy and back. My daughter was exhausted before she even started studying. With MyGradePal she opens her laptop at home and I can see exactly what she is doing. Her grades improved and we got our evenings back."', author: 'Mr. Tariq Mahmood', detail: 'Father · DHA Lahore' },
            { text: '"We could not afford three separate tutors. MyGradePal gave our son the same quality at a fraction of the cost. He is now aiming for LUMS. We never thought that was possible."', author: 'Mrs. Amina Butt', detail: 'Mother of Grade 10 student · Gulberg' },
          ].map((t, i) => (
            <div className="testimonial" key={i}>
              <div className="testi-stars">★★★★★</div>
              <div className="testimonial-text">{t.text}</div>
              <div className="testimonial-author">{t.author}</div>
              <div style={{ fontSize: '12px', color: 'var(--ink-300)', marginTop: '3px' }}>{t.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="faq-inner reveal">
          <div className="section-label">Frequently asked questions</div>
          <h2 className="section-title">Everything parents ask before signing up</h2>
          <div className="faq-accordion">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaqIndex === index
              return (
                <div key={item.q} className={`faq-item${isOpen ? ' faq-item-open' : ''}`}>
                  <button
                    type="button"
                    className="faq-question"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  >
                    <span>{item.q}</span>
                    <span className="faq-arrow" aria-hidden>
                      ▼
                    </span>
                  </button>
                  <div className="faq-answer-wrap">
                    <div className="faq-answer-inner">
                      <div className="faq-answer">{item.a}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="vision-section">
        <div className="section-label">Our vision</div>
        <h2 className="section-title" style={{ color: 'white' }}>Building the future of education in Pakistan</h2>
        <p className="section-sub" style={{ color: 'var(--teal-200)' }}>Starting with O Level / IGCSE. Growing into something much bigger.</p>
        <div className="vision-grid reveal">
          {[
            { year: 'Today · 2025', title: 'O Level / IGCSE excellence from home', text: 'Grade 9-10 students across Pakistan get world-class exam preparation at home. Chemistry, Physics, Mathematics, Biology, English, Pakistan Studies, Islamiyat.' },
            { year: 'Next · 2026', title: 'Complete secondary education', text: 'Grade 6-8 Lower Secondary curriculum. Quran learning and Tajweed. A Level preparation. Every subject a Pakistani student needs.' },
            { year: 'Vision · 2027+', title: 'Pakistan\'s home education platform', text: 'Homeschooling support for parents who want full control. Available in every city across Pakistan. Affordable enough for every family.' },
          ].map((v, i) => (
            <div className="vision-card" key={i}>
              <div className="vision-year">{v.year}</div>
              <div className="vision-title">{v.title}</div>
              <div className="vision-text">{v.text}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-bg">
          <Image
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1400"
            alt="Graduation ceremony"
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div className="cta-overlay" />
        <div className="cta-card reveal">
          <h2>Your child&apos;s future starts today</h2>
          <p>Join the parents who chose action over hope</p>
          <div className="hero-actions" style={{ justifyContent: 'center' }}>
            <Link href="/login" className="btn-hero">Start free trial — 7 days free</Link>
            <Link href="/parent/login" className="btn-hero-secondary">Parent login →</Link>
          </div>
          <div className="cta-meta">
            🎓 Trusted by families across Lahore
            <br />
            📚 Built on 15 years of Cambridge expertise
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-grid">
          <div>
            <div className="nav-logo" style={{ marginBottom: '14px' }}>
              <span className="my">My</span>Grade<span className="pal">Pal</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--teal-300)', lineHeight: '1.7', maxWidth: '260px', marginBottom: '16px' }}>
              Expert-backed O Level / IGCSE tutoring system with complete parent accountability. Your child&apos;s academy — at home.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--teal-300)' }}>hello@mygradepal.com<br />Lahore, Pakistan</p>
          </div>
          <div>
            <div className="footer-col-title">Product</div>
            <ul className="footer-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#how">How it works</a></li>
              <li><Link href="/login">Student login</Link></li>
              <li><Link href="/parent/login">Parent login</Link></li>
              <li><Link href="/referral">Referral programme</Link></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Subjects</div>
            <ul className="footer-links">
              <li><Link href="/login">Chemistry O Level / IGCSE</Link></li>
              <li><Link href="/login">Physics O Level / IGCSE</Link></li>
              <li><Link href="/login">Mathematics O Level / IGCSE</Link></li>
              <li><Link href="/login">Biology O Level / IGCSE</Link></li>
              <li><Link href="/login">Pakistan Studies</Link></li>
              <li><Link href="/login">Islamiyat</Link></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Grades</div>
            <ul className="footer-links">
              <li><a href="#">Grade 6</a></li>
              <li><a href="#">Grade 7</a></li>
              <li><a href="#">Grade 8</a></li>
              <li><a href="#">Grade 9</a></li>
              <li><a href="#">Grade 10 — O Level / IGCSE</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div style={{ fontSize: '12px', color: 'var(--ink-300)' }}>© 2025 MyGradePal. All rights reserved.</div>
          <div style={{ fontSize: '12px', color: 'var(--teal-500)', fontStyle: 'italic' }}>&quot;Your child&apos;s smartest study companion&quot;</div>
        </div>
        <div
          style={{
            marginTop: "20px",
            paddingTop: "16px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            textAlign: "center",
            fontSize: "12px",
            color: "var(--ink-300)",
          }}
        >
          <Link href="/terms" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "2px" }}>
            Terms of Service
          </Link>
          <span style={{ margin: "0 8px", opacity: 0.6 }}>|</span>
          <Link
            href="/terms#privacy-summary"
            style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "2px" }}
          >
            Privacy Policy
          </Link>
        </div>
      </footer>
    </main>
  )
}
