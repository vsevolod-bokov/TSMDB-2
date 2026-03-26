import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation, useNavigationType } from 'react-router-dom'
import ErrorBoundary from './components/error-boundary.jsx'
import { FirebaseUIProvider } from '@firebase-oss/ui-react';
import { ui } from './firebase.js';
import { AuthProvider } from './hooks/useAuth.jsx';
import { FavoritesProvider } from './hooks/useFavorites.jsx';
import ProtectedRoute from './components/protected-route.jsx';
import { Toaster } from './components/ui/sonner.jsx';

const Home = lazy(() => import('./pages/home.jsx'));
const Login = lazy(() => import('./pages/login.jsx'));
const Browse = lazy(() => import('./pages/browse.jsx'));
const Film = lazy(() => import('./pages/film.jsx'));
const Account = lazy(() => import('./pages/account.jsx'));
const Favorites = lazy(() => import('./pages/favorites.jsx'));
const Results = lazy(() => import('./pages/results.jsx'));
const Lost = lazy(() => import('./pages/lost.jsx'));

// Scrolls to top on route change. Pages with infinite scroll (browse, favorites, results)
// manage their own scroll restoration via sessionStorage, so we skip them on back/forward
// navigation and page reloads to avoid fighting their restore logic.
function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  // Disable browser's native scroll restoration — we handle it manually per-page.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const selfManaged = ['/browse', '/favorites', '/results'];
    if (selfManaged.includes(pathname)) {
      // These pages set a sessionStorage flag in their beforeunload handler
      // so we can detect reloads and let them restore scroll themselves.
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
    <Suspense fallback={null}>
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
    </Suspense>
    </ErrorBoundary>
    <Toaster position="bottom-right" />
    </FavoritesProvider>
    </AuthProvider>
    </FirebaseUIProvider>
  )
}

export default App
