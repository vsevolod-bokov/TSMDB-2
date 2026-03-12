import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { tmdbFetch } from '@/tmdb';
import { Button } from '@/components/ui/button';
import MovieCard from '@/components/movie-card';
import { Heart } from 'lucide-react';

export default function Favorites() {
  const { user } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, 'users', user.uid, 'favorites'))
      .then(async (snapshot) => {
        const favIds = snapshot.docs.map((d) => d.id);
        if (!favIds.length) {
          setMovies([]);
          return;
        }
        const results = await Promise.all(
          favIds.map((id) => tmdbFetch(`/movie/${id}?language=en-US`))
        );
        setMovies(results.filter((m) => m.id));
      })
      .finally(() => setLoading(false));
  }, [user]);

  async function handleRemove(movieId) {
    await deleteDoc(doc(db, 'users', user.uid, 'favorites', String(movieId)));
    setMovies((prev) => prev.filter((m) => m.id !== movieId));
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Your Favorites</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!movies.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Your Favorites</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Heart className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground mb-4">No favorites yet.</p>
          <Button asChild>
            <Link to="/browse">Browse Movies</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your Favorites</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} onRemove={handleRemove} />
        ))}
      </div>
    </div>
  );
}
