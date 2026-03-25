import { useEffect } from 'react'
import { Routes, Route, useLocation, useNavigationType } from 'react-router-dom'
import ErrorBoundary from './components/error-boundary.jsx'
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
import { FavoritesProvider } from './hooks/useFavorites.jsx';
import ProtectedRoute from './components/protected-route.jsx';
import { Toaster } from './components/ui/sonner.jsx';

// Scroll to top on route change, except browse/favorites/results which handle their own restoration
function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const selfManaged = ['/browse', '/favorites', '/results'];
    if (selfManaged.includes(pathname)) {
      // Let these pages handle scroll on back/forward and page reload
      const reloadKeys = ['browse_reloading', 'favorites_reloading', 'results_reloading'];
      const isReload = reloadKeys.some((k) => sessionStorage.getItem(k) === 'true');
      if (navType === 'POP' || isReload) return;
    }

    window.scrollTo(0, 0);
  }, [pathname, navType]);

  return null;
}

// Wraps a page element with an error boundary that auto-resets on route change
function PageBoundary({ children }) {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname}>
      {children}
    </ErrorBoundary>
  );
}

function App() {
  return (
    <FirebaseUIProvider ui={ui}>
    <AuthProvider>
    <FavoritesProvider>
    <ScrollToTop />
    <ErrorBoundary>
    <Routes>
      <Route path="/login" element={<PageBoundary><Login /></PageBoundary>} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<PageBoundary><Home /></PageBoundary>} />
        <Route path="/browse" element={<PageBoundary><Browse /></PageBoundary>} />
        <Route path="/film/:id" element={<PageBoundary><Film /></PageBoundary>} />
        <Route path="/account" element={<PageBoundary><Account /></PageBoundary>} />
        <Route path="/favorites" element={<PageBoundary><Favorites /></PageBoundary>} />
        <Route path="/results" element={<PageBoundary><Results /></PageBoundary>} />
      </Route>
      <Route path="*" element={<Lost />} />
    </Routes>
    </ErrorBoundary>
    <Toaster position="bottom-right" />
    </FavoritesProvider>
    </AuthProvider>
    </FirebaseUIProvider>
  )
}

export default App
