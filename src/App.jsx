import { Routes, Route } from 'react-router-dom'
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

function App() {
  return (
    <FirebaseUIProvider ui={ui}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/browse" element={<Browse />} />
      <Route path="/film/:id" element={<Film />} />
      <Route path="/account" element={<Account />} />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/results" element={<Results />} />
      <Route path="*" element={<Lost />} />
    </Routes>
    </FirebaseUIProvider>
  )
}

export default App
