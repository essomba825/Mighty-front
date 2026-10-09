import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import { useLang } from './context/LangContext'
import { AuthProvider } from './context/AuthContext'
import { LangProvider } from './context/LangContext'
import { ProfileProvider } from './context/ProfileContext'
import Navbar from './components/Navbar'
import InstallPrompt from './components/InstallPrompt'
import PushPrompt from './components/PushPrompt'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import News from './pages/News'
import NewsDetail from './pages/NewsDetail'
import Events from './pages/Events'
import Archives from './pages/Archives'
import About from './pages/About'
import Login from './pages/Login'
import Register from './pages/Register'
import MemberSpace from './pages/MemberSpace'
import Profile from './pages/Profile'
import Directory from './pages/Directory'
import Projects from './pages/Projects'
import Contribute from './pages/Contribute'
import BecomePartner from './pages/BecomePartner'
import Notifications from './pages/Notifications'
import Education from './pages/Education'
import SubjectCurriculum from './pages/SubjectCurriculum'
import DailyReview from './pages/DailyReview'
import TutorContribute from './pages/TutorContribute'
import TutorValidation from './pages/TutorValidation'
import CourseDetail from './pages/CourseDetail'
import MyResults from './pages/MyResults'
import MemberCard from './pages/MemberCard'
import Mentorship from './pages/Mentorship'
import Stats from './pages/Stats'
import Contact from './pages/Contact'
import Gallery from './pages/Gallery'
import AdminLayout from './components/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminNews from './pages/admin/AdminNews'
import AdminEvents from './pages/admin/AdminEvents'
import AdminProjects from './pages/admin/AdminProjects'
import AdminContributions from './pages/admin/AdminContributions'
import AdminPartnerships from './pages/admin/AdminPartnerships'
import NotFound from './pages/NotFound'

/* Le pied de page est rendu dans App, donc hors des pages, mais il a besoin des
   traductions et du routeur. Ce composant isole cette dependance au lieu de
   disperser `t()` dans App. */

const SOCIAL_LINKS = [
  { icon: 'mdi-facebook', label: 'Facebook', href: 'https://facebook.com/megamightysixers' },
  { icon: 'mdi-twitter', label: 'X / Twitter', href: 'https://twitter.com/megamightysixers' },
  { icon: 'mdi-instagram', label: 'Instagram', href: 'https://instagram.com/megamightysixers' },
  { icon: 'mdi-youtube', label: 'YouTube', href: 'https://youtube.com/@megamightysixers' },
  { icon: 'mdi-whatsapp', label: 'WhatsApp', href: 'https://wa.me/237600000000' },
]

function LangBridge() {
  const { t } = useLang()
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <img src="/logo-mark.png" alt="Mega Mighty Sixers" onError={(e) => e.target.style.display = 'none'} />
            <span>Mega Mighty Sixers</span>
          </Link>
          <p className="footer-tagline">{t('footer.tagline')}</p>
          <p className="footer-copy">© {new Date().getFullYear()} — {t('app.tagline')}</p>
        </div>

        <nav className="footer-nav" aria-label="Liens de pied de page">
          <Link to="/a-propos">{t('nav.about')}</Link>
          <Link to="/archives">{t('nav.archives')}</Link>
          <Link to="/education">{t('nav.education')}</Link>
          <Link to="/partenaires">{t('nav.partners')}</Link>
          <Link to="/galerie">{t('nav.gallery')}</Link>
          <Link to="/contact">{t('nav.contact')}</Link>
        </nav>

        <div className="footer-social">
          <p className="footer-social-label">{t('footer.social')}</p>
          <div className="footer-social-links">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="footer-social-btn"
              >
                <i className={`mdi ${s.icon}`} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

function AppFrame() {
  const { pathname } = useLocation()
  const isLandingHome = pathname === '/'

  return (
    <>
        {!isLandingHome && <Navbar />}
        <InstallPrompt />
        <PushPrompt />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/actualites" element={<News />} />
          <Route path="/actualites/:id" element={<NewsDetail />} />
          <Route path="/evenements" element={<Events />} />
          <Route path="/archives" element={<Archives />} />
          <Route path="/a-propos" element={<About />} />
          <Route path="/projets" element={<Projects />} />
          <Route path="/contribuer/:id" element={<Contribute />} />
          <Route path="/partenaires" element={<BecomePartner />} />
          <Route path="/login" element={<Login />} />
          <Route path="/inscription" element={<Register />} />
          {/* Catalogue éducatif public (leçons/quiz ouverts aux membres connectés) */}
          <Route path="/education" element={<Education />} />
          <Route path="/education/matieres/:slug" element={<SubjectCurriculum />} />
          {/* Espace membre (compte validé requis) */}
          <Route path="/espace-membre" element={<ProtectedRoute><MemberSpace /></ProtectedRoute>} />
          <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/annuaire" element={<Directory />} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          {/* Espace éducatif détaillé : la page gère elle-même l'accès (login requis côté API) */}
          <Route path="/cours/:id" element={<CourseDetail />} />
          <Route path="/education/revision-du-jour" element={<ProtectedRoute><DailyReview /></ProtectedRoute>} />
          <Route path="/education/contribuer" element={<ProtectedRoute><TutorContribute /></ProtectedRoute>} />
          <Route path="/education/valider" element={<ProtectedRoute><TutorValidation /></ProtectedRoute>} />
          <Route path="/mes-resultats" element={<ProtectedRoute><MyResults /></ProtectedRoute>} />
          <Route path="/ma-carte" element={<ProtectedRoute><MemberCard /></ProtectedRoute>} />
          <Route path="/mentorat" element={<ProtectedRoute><Mentorship /></ProtectedRoute>} />
          <Route path="/statistiques" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
          {/* Nouvelles pages publiques (§4, §8, §11 Phase 1) */}
          <Route path="/contact" element={<Contact />} />
          <Route path="/galerie" element={<Gallery />} />
          {/* Back-office React dédié (§6) — accessible aux admins uniquement */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="membres"      element={<AdminUsers />} />
            <Route path="actualites"   element={<AdminNews />} />
            <Route path="evenements"   element={<AdminEvents />} />
            <Route path="projets"      element={<AdminProjects />} />
            <Route path="contributions" element={<AdminContributions />} />
            <Route path="partenariats" element={<AdminPartnerships />} />
          </Route>
          {/* Route inconnue */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        {!isLandingHome && <LangBridge />}
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <LangProvider>
        <ProfileProvider>
          <BrowserRouter>
            <AppFrame />
          </BrowserRouter>
        </ProfileProvider>
      </LangProvider>
    </AuthProvider>
  )
}

export default App
