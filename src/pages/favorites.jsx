import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { tmdbFetch } from '@/tmdb';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MovieCard from '@/components/movie-card';
import { Heart } from 'lucide-react';

const GENRES = [
  { id: null, name: 'All' },
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

const SORT_OPTIONS = [
  { value: 'title-asc', label: 'Title (A-Z)' },
  { value: 'title-desc', label: 'Title (Z-A)' },
  { value: 'year-desc', label: 'Year (Newest)' },
  { value: 'year-asc', label: 'Year (Oldest)' },
  { value: 'rating-desc', label: 'Rating (Highest)' },
  { value: 'rating-asc', label: 'Rating (Lowest)' },
];

export default function Favorites() {
  const { user } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [sortBy, setSortBy] = useState('title-asc');

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

  const filteredAndSorted = useMemo(() => {
    let list = movies;

    // Filter by genre
    if (selectedGenre !== null) {
      list = list.filter((m) => m.genre_ids?.includes(selectedGenre) || m.genres?.some((g) => g.id === selectedGenre));
    }

    // Sort
    const [field, direction] = sortBy.split('-');
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (field === 'title') {
        cmp = (a.title || '').localeCompare(b.title || '');
      } else if (field === 'year') {
        cmp = (a.release_date || '').localeCompare(b.release_date || '');
      } else if (field === 'rating') {
        cmp = (a.vote_average || 0) - (b.vote_average || 0);
      }
      return direction === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [movies, selectedGenre, sortBy]);

  // Count movies per genre for badge display
  const genreCounts = useMemo(() => {
    const counts = { all: movies.length };
    for (const movie of movies) {
      const ids = movie.genre_ids || movie.genres?.map((g) => g.id) || [];
      for (const id of ids) {
        counts[id] = (counts[id] || 0) + 1;
      }
    }
    return counts;
  }, [movies]);

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Favorites</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Genre sidebar */}
        <aside className="hidden md:flex flex-col gap-1 min-w-[160px]">
          {GENRES.map((genre) => {
            const count = genre.id === null ? genreCounts.all : (genreCounts[genre.id] || 0);
            const isActive = selectedGenre === genre.id;
            return (
              <button
                key={genre.name}
                onClick={() => setSelectedGenre(genre.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{genre.name}</span>
                <span className={`text-xs ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Mobile genre selector */}
        <div className="md:hidden w-full">
          <Select
            value={selectedGenre === null ? 'all' : String(selectedGenre)}
            onValueChange={(v) => setSelectedGenre(v === 'all' ? null : Number(v))}
          >
            <SelectTrigger className="w-full mb-4">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              {GENRES.map((genre) => {
                const count = genre.id === null ? genreCounts.all : (genreCounts[genre.id] || 0);
                return (
                  <SelectItem key={genre.name} value={genre.id === null ? 'all' : String(genre.id)}>
                    {genre.name} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Movie grid */}
        <div className="flex-1">
          {filteredAndSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">No favorites in this genre.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {filteredAndSorted.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onRemove={handleRemove} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
