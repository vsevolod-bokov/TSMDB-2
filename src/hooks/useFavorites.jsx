import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }
    getDocs(collection(db, 'users', user.uid, 'favorites'))
      .then((snapshot) => {
        setFavoriteIds(new Set(snapshot.docs.map((d) => d.id)));
      })
      .finally(() => setLoading(false));
  }, [user]);

  const isFavorited = useCallback(
    (movieId) => favoriteIds.has(String(movieId)),
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    async (movieId) => {
      if (!user) return;
      const id = String(movieId);
      const favRef = doc(db, 'users', user.uid, 'favorites', id);
      if (favoriteIds.has(id)) {
        await deleteDoc(favRef);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        await setDoc(favRef, { addedAt: new Date() });
        setFavoriteIds((prev) => new Set(prev).add(id));
      }
    },
    [user, favoriteIds]
  );

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorited, toggleFavorite, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
