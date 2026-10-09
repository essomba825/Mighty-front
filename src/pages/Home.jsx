import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { mediaUrl } from '../api/client'
import { useReveal } from '../hooks/useReveal'

const learningPhoto =
  'https://images.unsplash.com/photo-1758270705518-b61b40527e76?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=85&w=1400'

const USE_DB_PROJECTS = true

const staticProject = {
  title: 'Science Lab Renewal',
  description:
    'Help us equip the school science laboratory with essential materials, giving students practical experience in Physics, Chemistry and Biology.',
  amount_collected: 2400000,
  budget: 4000000,
  image: '',
  tag: 'Education',
  href: '#support',
}

const pillars = [
  {
    icon: 'community',
    number: '01',
    title: 'A connected community',
    copy: 'A private digital home where former classmates can reconnect, share opportunities and move forward together.',
    link: 'Explore member space',
  },
  {
    icon: 'heart',
    number: '02',
    title: 'Collective impact',
    copy: 'Visible, transparent projects that make it easy for members, partners and donors to support meaningful action.',
    link: 'View our projects',
  },
  {
    icon: 'science',
    number: '03',
    title: 'Education that lifts',
    copy: "Accessible science resources designed to help today's students prepare confidently for Cameroon GCE exams.",
    link: 'Visit learning hub',
  },
]

const subjects = [
  { symbol: '∑', name: 'Mathematics', count: 24 },
  { symbol: 'C', name: 'Chemistry', count: 18 },
  { symbol: 'φ', name: 'Physics', count: 21 },
  { symbol: '⌬', name: 'Biology', count: 16 },
]

// Slugs backend (matière + niveau) regroupés par discipline affichée ici.
const SUBJECT_SLUGS = {
  Mathematics: ['mathematics-ol', 'mathematiques-al'],
  Chemistry: ['chemistry-ol', 'chemistry-al'],
  Physics: ['physics-al', 'physique-ol'],
  Biology: ['biologie-al'],
}

// Valeurs de secours alignées sur la référence Figma.
const FALLBACK_STATS = { members: 7, projects: 6, students_reached: 3, years: 17 }

function Icon({ name, className = 'size-5' }) {
  const paths = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
      </>
    ),
    calendar: (
      <>
        <path d="M6 2v3M18 2v3M3 9h18" />
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M7 13h3v3H7z" />
      </>
    ),
    community: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5.5 20a6.5 6.5 0 0 1 13 0M4 10a2.5 2.5 0 0 0 0 5M20 10a2.5 2.5 0 0 1 0 5" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    people: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
      </>
    ),
    play: <path d="m9 6 9 6-9 6Z" />,
    science: (
      <>
        <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
        <path d="M8 15h8" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  )
}

function Logo({ light = false }) {
  return (
    <a className="logo" href="#top" aria-label="Mega Mighty Sixers home">
      <img
        className={`logo-mark ${light ? 'logo-mark-light' : ''}`}
        src={light ? '/brand/mega-mighty-sixers-pwa.png' : '/brand/mega-mighty-sixers-mark.png'}
        alt=""
      />
      <span className={`logo-copy ${light ? 'text-white' : ''}`}>
        <strong>Mega Mighty Sixers</strong>
        <small>Ex-Students Association</small>
      </span>
    </a>
  )
}

function ArrowLink({ children, href, light = false }) {
  return (
    <a className={`arrow-link ${light ? 'arrow-link-light' : ''}`} href={href}>
      {children}
      <Icon name="arrow" className="size-4" />
    </a>
  )
}

function SectionHeading({ eyebrow, title, copy, centered = false, reveal = true }) {
  return (
    <div className={`section-heading${centered ? ' text-center' : ''}${reveal ? ' reveal' : ''}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {copy && <p className="section-copy">{copy}</p>}
    </div>
  )
}

function money(value) {
  if (value >= 1000000) return `FCFA ${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`
  if (value >= 1000) return `FCFA ${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`
  return `FCFA ${Number(value || 0).toLocaleString('en-GB')}`
}

/* Compteur animé : compte de 0 vers la valeur dès que l'élément entre
   dans le champ de vision (IntersectionObserver + requestAnimationFrame). */
function CountUp({ value, suffix = '' }) {
  const [display, setDisplay] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || value == null) return undefined

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      if (reduce) {
        setDisplay(value)
        return
      }
      const start = performance.now()
      const step = (now) => {
        const p = Math.min((now - start) / 1650, 1)
        const eased = 1 - Math.pow(1 - p, 4)
        setDisplay(Math.round(value * eased))
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, { threshold: 0.35 })
    io.observe(el)

    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value])

  return <span ref={ref}>{display == null ? '—' : `${display.toLocaleString('en-GB')}${suffix}`}</span>
}

export default function Home() {
  const [project, setProject] = useState(USE_DB_PROJECTS ? null : staticProject)
  const [projectLoading, setProjectLoading] = useState(USE_DB_PROJECTS)
  const [projectLoadError, setProjectLoadError] = useState(false)
  const [stats, setStats] = useState(null)
  const [statsFailed, setStatsFailed] = useState(false)
  const revealRef = useReveal()

  useEffect(() => {
    if (!USE_DB_PROJECTS) return

    api.get('/projects/')
      .then(({ data }) => {
        const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
        const firstProject = list.find((item) => item.status === 'active')

        setProject(firstProject ? {
          ...firstProject,
          tag: 'Education',
          href: `/contribuer/${firstProject.id}`,
        } : null)
      })
      .catch(() => {
        setProjectLoadError(true)
      })
      .finally(() => {
        setProjectLoading(false)
      })
  }, [])

  useEffect(() => {
    api.get('/highlights/')
      .then(({ data }) => setStats(data))
      .catch(() => setStatsFailed(true))
  }, [])

  // Chiffres réels du backend ; valeurs statiques de secours si injoignable.
  const live = stats ?? (statsFailed ? FALLBACK_STATS : null)

  const impact = [
    { value: live?.members, suffix: '+', label: 'Batch members' },
    { value: live?.projects, suffix: '', label: 'Community projects' },
    { value: live?.students_reached, suffix: '+', label: 'Students reached' },
    { value: live?.years, suffix: ' yrs', label: 'Shared history' },
  ]

  // Nombre de leçons publiées par discipline (fusion des matières FR/EN).
  const subjectCounts = {}
  if (live?.subjects) {
    live.subjects.forEach((s) => {
      const key = Object.keys(SUBJECT_SLUGS).find((n) => SUBJECT_SLUGS[n].includes(s.slug))
      if (key) subjectCounts[key] = (subjectCounts[key] || 0) + s.count
    })
  }
  const subjectValue = (subject) => {
    if (stats) return subjectCounts[subject.name] ?? 0
    if (statsFailed) return subject.count
    return null
  }

  const percent = project?.budget > 0
    ? Math.min(Math.round(((project.amount_collected || 0) / project.budget) * 100), 100)
    : 0

  return (
    <main id="top" className="landing-page" ref={revealRef}>
      <div className="announcement">
        <p>
          <span>New</span> The Mega Mighty Sixers digital community is taking shape.
        </p>
        <a href="#vision">Discover our vision <Icon name="arrow" className="size-3-5" /></a>
      </div>

      <header>
        <Logo />
        <nav aria-label="Main navigation">
          <a href="#about">About</a>
          <a href="#projects">Projects</a>
          <a href="#learning">Learning Hub</a>
          <a href="#events">Events</a>
        </nav>
        <div className="header-actions">
          <a className="text-link" href="#support">Support us</a>
          <a className="button button-dark button-small" href="/espace-membre">
            Member area
          </a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-orbit hero-orbit-one" />
        <div className="hero-orbit hero-orbit-two" />
        <div className="hero-content">
          <p className="hero-kicker"><span /> United by our past. Building the future.</p>
          <h1>
            One batch.
            <br />
            <em>One mighty legacy.</em>
          </h1>
          <p className="hero-copy">
            We are former students brought together by shared history and a common purpose:
            to connect, preserve, support and create opportunities for the next generation.
          </p>
          <div className="hero-actions">
            <a className="button button-gold" href="/inscription">
              Join the community <Icon name="arrow" />
            </a>
            <a className="button button-ghost" href="#learning">
              <Icon name="play" /> Explore tutorials
            </a>
          </div>
        </div>

        <div className="hero-visual" aria-label="Mega Mighty Sixers community illustration">
          <img
            className="hero-logo"
            src="/brand/mega-mighty-sixers-pwa.png"
            alt="Mega Mighty Sixers emblem"
          />
          <div className="hero-card card-members">
            <span className="avatar-stack">
              <i>AM</i><i>FE</i><i>JN</i>
            </span>
            <span><strong><CountUp value={live?.members} suffix="+" /></strong><small>members united</small></span>
          </div>
          <div className="hero-card card-impact">
            <span className="card-icon"><Icon name="heart" /></span>
            <span><strong>Giving back</strong><small>to our community</small></span>
          </div>
          <div className="star star-one" />
          <div className="star star-two" />
        </div>
      </section>

      <section className="quick-actions reveal" id="members">
        <a href="/espace-membre">
          <span className="quick-icon"><Icon name="people" /></span>
          <span><small>For ex-students</small><strong>Access member area</strong></span>
          <Icon name="arrow" />
        </a>
        <a href="#projects">
          <span className="quick-icon"><Icon name="target" /></span>
          <span><small>Make an impact</small><strong>Support a project</strong></span>
          <Icon name="arrow" />
        </a>
        <a href="#learning">
          <span className="quick-icon"><Icon name="book" /></span>
          <span><small>Prepare for GCE</small><strong>Access free tutorials</strong></span>
          <Icon name="arrow" />
        </a>
      </section>

      <section className="story section-shell" id="about">
        <div className="story-art reveal">
          <div className="story-frame">
            <span className="story-year">20<span>09</span></span>
            <p>Where our story began</p>
          </div>
          <div className="story-badge"><strong><CountUp value={live?.years} /></strong><span>years of<br />brotherhood<br />& sisterhood</span></div>
        </div>
        <div className="story-copy reveal" style={{ transitionDelay: '.18s' }}>
          <SectionHeading
            reveal={false}
            eyebrow="Our story"
            title={<>More than classmates.<br /><em>Family for life.</em></>}
          />
          <p>
            Mega Mighty Sixers is a single batch of former students bound by the memories
            we made, the values we learned and the belief that together, we can do more.
          </p>
          <p>
            Today, we channel our collective experience into strengthening our community,
            preserving our history and opening doors for students who follow in our footsteps.
          </p>
          <ArrowLink href="#vision">Discover who we are</ArrowLink>
        </div>
      </section>

      <section className="vision" id="vision">
        <div className="section-shell">
          <SectionHeading
            centered
            eyebrow="Why we exist"
            title={<>A platform built around<br /><em>three powerful missions</em></>}
            copy="Not just another association website, a practical digital home designed to connect people and turn shared purpose into measurable progress."
          />
          <div className="pillar-grid">
            {pillars.map((pillar, i) => (
              <article
                className="pillar-card reveal"
                key={pillar.number}
                style={{ transitionDelay: `${i * 0.14}s` }}
              >
                <span className="pillar-number">{pillar.number}</span>
                <span className="pillar-icon"><Icon name={pillar.icon} /></span>
                <h3>{pillar.title}</h3>
                <p>{pillar.copy}</p>
                <ArrowLink href={pillar.number === '03' ? '#learning' : '#projects'}>{pillar.link}</ArrowLink>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="projects section-shell" id="projects">
        <div className="projects-heading reveal">
          <SectionHeading
            reveal={false}
            eyebrow="Featured initiative"
            title={<>Small actions.<br /><em>Lasting change.</em></>}
            copy="Our initiatives respond to real needs, from equipping classrooms to mentoring young learners."
          />
          <ArrowLink href="/projets">View all projects</ArrowLink>
        </div>
        {project ? <div className="project-card">
          <div className={`project-visual ${project.image ? 'project-visual-photo' : ''}`}>
            {project.image ? (
              <img src={mediaUrl(project.image)} alt={project.title} />
            ) : (
              <div className="project-pattern">
                <Icon name="book" className="size-16" />
                <span>Tools to learn.<br />Room to dream.</span>
              </div>
            )}
            <span className="project-tag">{project.tag || 'Education'}</span>
          </div>
          <div className="project-content">
            <p className="eyebrow">Current project</p>
            <h3>{project.title}</h3>
            <p>{project.description}</p>
            <div className="progress-meta">
              <span><strong>{money(project.amount_collected)}</strong> raised</span>
              <span>{percent}% of goal</span>
            </div>
            <div className="progress"><span style={{ width: `${percent}%` }} /></div>
            <div className="project-footer">
              <a className="button button-dark" href={project.href}>Support this project <Icon name="arrow" /></a>
              <span><Icon name="shield" /> Secure & transparent</span>
            </div>
          </div>
        </div> : (
          <p className="section-copy">
            {projectLoading
              ? 'Loading current project...'
              : projectLoadError
                ? 'Projects are temporarily unavailable.'
                : 'There are no active projects at the moment.'}
          </p>
        )}
      </section>

      <section className="learning" id="learning">
        <div className="learning-photo reveal">
          <Link className="learning-photo-link" to="/education" aria-label="Open the learning hub">
            <img
              src={learningPhoto}
              alt="Students collaborating around a laptop"
            />
            <span className="photo-credit">Photo by Vitaly Gariev · Unsplash</span>
            <div className="learning-photo-card">
              <Icon name="play" />
              <span><strong>Learn at your pace</strong><small>Video, notes, quizzes & more</small></span>
            </div>
          </Link>
        </div>
        <div className="learning-content reveal" style={{ transitionDelay: '.18s' }}>
          <SectionHeading
            reveal={false}
            eyebrow="GCE Science Learning Hub"
            title={<>The next generation<br /><em>deserves every chance.</em></>}
            copy="Free, focused learning resources for Cameroon GCE Ordinary and Advanced Level students, created and curated by educators who care."
          />
          <div className="subject-grid">
            {subjects.map((subject) => {
              const n = subjectValue(subject)
              return (
                <Link to="/education" key={subject.name}>
                  <span>{subject.symbol}</span>
                  <span>
                    <strong>{subject.name}</strong>
                    <small>{n == null ? '…' : `${n} lesson${n === 1 ? '' : 's'}`}</small>
                  </span>
                  <Icon name="arrow" className="size-4" />
                </Link>
              )
            })}
          </div>
          <Link className="button button-gold" to="/education">Start learning for free <Icon name="arrow" /></Link>
        </div>
      </section>

      <section className="impact section-shell">
        <SectionHeading
          centered
          eyebrow="Growing together"
          title={<>Our community in <em>numbers</em></>}
        />
        <div className="impact-grid">
          {impact.map((item, i) => (
            <div key={item.label} className="reveal" style={{ transitionDelay: `${i * 0.13}s` }}>
              <strong><CountUp value={item.value} suffix={item.suffix} /></strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="events" id="events">
        <div className="section-shell events-inner">
          <div className="reveal">
            <SectionHeading
              reveal={false}
              eyebrow="Coming together"
              title={<>Moments that keep<br /><em>us connected.</em></>}
              copy="From reunions to community service, every gathering is a chance to strengthen the bonds we share."
            />
            <ArrowLink href="/evenements" light>See all events</ArrowLink>
          </div>
          <article className="event-card reveal" style={{ transitionDelay: '.18s' }}>
            <div className="event-date"><strong>24</strong><span>AUG</span></div>
            <div className="event-info">
              <span>Featured event</span>
              <h3>Annual Sixers Homecoming</h3>
              <p><Icon name="calendar" /> Saturday, 24 August · 10:00 AM</p>
              <p>Campus Main Hall, Cameroon</p>
            </div>
            <a href="/evenements" aria-label="View annual homecoming event"><Icon name="arrow" /></a>
          </article>
        </div>
      </section>

      <section className="support section-shell" id="support">
        <div className="support-card reveal">
          <div>
            <p className="eyebrow">Be part of the legacy</p>
            <h2>Your support can<br /><em>move us forward.</em></h2>
          </div>
          <div>
            <p>
              Whether you are an ex-student, partner or friend, there is a place for
              you in this story. Help us build, educate and create lasting impact.
            </p>
            <div className="support-actions">
              <a className="button button-gold" href="#projects">Support a project <Icon name="heart" /></a>
              <a className="button button-ghost" href="mailto:hello@megamightysixers.org">Become a partner <Icon name="arrow" /></a>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-main section-shell">
          <div className="footer-brand">
            <Logo light />
            <p>United by our past.<br />Building the future.</p>
            <span>A PettyCash SAS supported initiative.</span>
          </div>
          <div className="footer-links">
            <div><strong>Explore</strong><a href="#about">Our story</a><a href="#projects">Projects</a><a href="#events">Events</a></div>
            <div><strong>Community</strong><a href="#members">Member area</a><a href="#learning">Learning Hub</a><a href="#support">Support us</a></div>
            <div><strong>Get in touch</strong><a href="mailto:hello@megamightysixers.org">hello@megamightysixers.org</a><a href="#support">Partnership enquiries</a></div>
          </div>
        </div>
        <div className="footer-bottom section-shell">
          <span>© 2025 Mega Mighty Sixers Ex-Students Association</span>
          <span>Made with purpose in Cameroon</span>
        </div>
      </footer>
    </main>
  )
}
