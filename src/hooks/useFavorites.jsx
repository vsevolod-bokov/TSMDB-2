import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [togglingIds, setTogglingIds] = useState(new Set());
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
      .catch((err) => {
        console.error('[Favorites] Failed to load favorite IDs:', err);
        toast.error('Failed to load your favorites.');
      })
      .finally(() => setLoading(false));
  }, [user]);

  const isFavorited = useCallback(
    (movieId) => favoriteIds.has(String(movieId)),
    [favoriteIds]
  );

  const isToggling = useCallback(
    (movieId) => togglingIds.has(String(movieId)),
    [togglingIds]
  );

  // Optimistic toggle: updates the UI immediately, then syncs with Firestore.
  // If the Firestore write fails, the optimistic change is rolled back.
  // togglingIds prevents double-clicks from firing concurrent writes for the same movie.
  const toggleFavorite = useCallback(
    async (movieId) => {
      if (!user) return;
      const id = String(movieId);
      if (togglingIds.has(id)) return;
      const favRef = doc(db, 'users', user.uid, 'favorites', id);
      const wasAdded = favoriteIds.has(id);
      setTogglingIds((prev) => new Set(prev).add(id));
      try {
        if (wasAdded) {
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          await deleteDoc(favRef);
        } else {
          setFavoriteIds((prev) => new Set(prev).add(id));
          await setDoc(favRef, { addedAt: new Date() });
          toast.success('Added to favorites.');
        }
      } catch (err) {
        console.error('[Favorites] Failed to toggle favorite:', err);
        // Revert optimistic update
        if (wasAdded) {
          setFavoriteIds((prev) => new Set(prev).add(id));
        } else {
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
        toast.error(wasAdded ? 'Failed to remove from favorites.' : 'Failed to add to favorites.');
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [user, favoriteIds, togglingIds]
  );

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorited, isToggling, toggleFavorite, loading }}>
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
