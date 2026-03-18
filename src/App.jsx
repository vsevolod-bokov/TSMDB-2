import { useEffect } from 'react'
import { Routes, Route, useLocation, useNavigationType } from 'react-router-dom'
import Home from './pages/home.jsx'
import Login from './pages/login.jsx'
import Browse from './pages/browse.jsx'
import Film from './pages/film.jsx'
import Account from './pages/account.jsx'
import Favorites from './pages/favorites.jsx'
import Results from './pages/results.jsx'
import Lost from './pages/lost.jsx'
import { FirebaseUIProvider } from '@firebase-oss/ui-react';
import { ui } from './firebase.js';
import { AuthProvider } from './hooks/useAuth.jsx';
import ProtectedRoute from './components/protected-route.jsx';

// Scroll to top on route change, except browse/favorites which handle their own restoration
function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // Disable browser auto scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    // Let browse, favorites, and results handle their own scroll on back/forward
    const selfManaged = ['/browse', '/favorites', '/results'];
    if (navType === 'POP' && selfManaged.includes(pathname)) return;

    window.scrollTo(0, 0);
  }, [pathname, navType]);

  return null;
}

function App() {
  return (
    <FirebaseUIProvider ui={ui}>
    <AuthProvider>
    <ScrollToTop />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/film/:id" element={<Film />} />
        <Route path="/account" element={<Account />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/results" element={<Results />} />
      </Route>
      <Route path="*" element={<Lost />} />
    </Routes>
    </AuthProvider>
    </FirebaseUIProvider>
  )
}

export default App
