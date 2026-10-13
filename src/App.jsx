import { useEffect } from 'react'
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

/* A chaque changement de page on remonte en haut. Sans cela le navigateur
   garde la position precedente : cliquer sur un lien tout en bas d'une longue
   page arrivait... tout en bas de la page suivante, "au niveau du footer". */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function AppFrame() {
  const { pathname } = useLocation()
  const isLandingHome = pathname === '/'

  return (
    <>
        <ScrollToTop />
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
          {/* Catalogue Ã©ducatif public (leÃ§ons/quiz ouverts aux membres connectÃ©s) */}
          <Route path="/education" element={<Education />} />
          <Route path="/education/matieres/:slug" element={<SubjectCurriculum />} />
          {/* Espace membre (compte validÃ© requis) */}
          <Route path="/espace-membre" element={<ProtectedRoute><MemberSpace /></ProtectedRoute>} />
          <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/annuaire" element={<Directory />} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          {/* Espace Ã©ducatif dÃ©taillÃ© : la page gÃ¨re elle-mÃªme l'accÃ¨s (login requis cÃ´tÃ© API) */}
          <Route path="/cours/:id" element={<CourseDetail />} />
          <Route path="/education/revision-du-jour" element={<ProtectedRoute><DailyReview /></ProtectedRoute>} />
          <Route path="/education/contribuer" element={<ProtectedRoute><TutorContribute /></ProtectedRoute>} />
          <Route path="/education/valider" element={<ProtectedRoute><TutorValidation /></ProtectedRoute>} />
          <Route path="/mes-resultats" element={<ProtectedRoute><MyResults /></ProtectedRoute>} />
          <Route path="/ma-carte" element={<ProtectedRoute><MemberCard /></ProtectedRoute>} />
          <Route path="/mentorat" element={<ProtectedRoute><Mentorship /></ProtectedRoute>} />
          <Route path="/statistiques" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
          {/* Nouvelles pages publiques (Â§4, Â§8, Â§11 Phase 1) */}
          <Route path="/contact" element={<Contact />} />
          <Route path="/galerie" element={<Gallery />} />
          {/* Back-office React dÃ©diÃ© (Â§6) â€” accessible aux admins uniquement */}
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
