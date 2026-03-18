import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigationType } from 'react-router-dom';
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
import { Heart, Loader2 } from 'lucide-react';

const CACHE_KEY = 'favorites_cache';
const PAGE_SIZE = 20;

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

function loadCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch { /* ignore quota errors */ }
}

function clearCache() {
  sessionStorage.removeItem(CACHE_KEY);
}

const RELOAD_KEY = 'favorites_reloading';

export default function Favorites() {
  const { user } = useAuth();
  const navType = useNavigationType();
  const isReload = useRef((() => {
    const flag = sessionStorage.getItem(RELOAD_KEY);
    sessionStorage.removeItem(RELOAD_KEY);
    return flag === 'true';
  })()).current;
  const shouldRestore = navType === 'POP' || isReload;
  const cache = useRef(shouldRestore ? loadCache() : null).current;
  if (!shouldRestore) clearCache();

  const [movies, setMovies] = useState(cache?.movies || []);
  const [loading, setLoading] = useState(!cache);
  const [selectedGenre, setSelectedGenre] = useState(cache?.selectedGenre ?? null);
  const [sortBy, setSortBy] = useState(cache?.sortBy || 'title-asc');
  const [visibleCount, setVisibleCount] = useState(cache?.visibleCount || PAGE_SIZE);
  const [showMobileGenre, setShowMobileGenre] = useState(true);
  const [error, setError] = useState(null);
  const lastScrollY = useRef(0);
  const sentinelRef = useRef(null);
  const restoredScroll = useRef(false);

  useEffect(() => { document.title = 'Favorites - TSMDB'; }, []);

  // Set reload flag on page unload (fires on refresh, not on SPA navigation)
  useEffect(() => {
    const onBeforeUnload = () => sessionStorage.setItem(RELOAD_KEY, 'true');
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Track scroll direction for mobile genre dropdown
  useEffect(() => {
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < lastScrollY.current || y < 50) {
          setShowMobileGenre(true);
        } else if (y > lastScrollY.current) {
          setShowMobileGenre(false);
        }
        lastScrollY.current = y;
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Restore scroll position from cache
  useEffect(() => {
    if (cache && !restoredScroll.current && movies.length > 0) {
      restoredScroll.current = true;
      const targetY = cache.scrollY || 0;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, targetY);
          if (Math.abs(window.scrollY - targetY) > 10) {
            setTimeout(() => window.scrollTo(0, targetY), 100);
          }
        });
      });
    }
  }, [movies]);

  // Save scrollY to cache on unmount
  useEffect(() => {
    return () => {
      const existing = loadCache();
      if (existing) {
        existing.scrollY = lastScrollY.current;
        saveCache(existing);
      }
    };
  }, []);

  // Save cache whenever state changes
  useEffect(() => {
    if (!loading) {
      saveCache({ movies, selectedGenre, sortBy, visibleCount, scrollY: lastScrollY.current });
    }
  }, [movies, selectedGenre, sortBy, visibleCount, loading]);

  // Fetch favorites from Firestore (skip if restored from cache)
  useEffect(() => {
    if (cache || !user) return;
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
        setMovies(results.filter((m) => m.id && m.poster_path));
      })
      .catch((err) => {
        console.error('[Favorites] Failed to load favorites:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [user]);

  async function handleRemove(movieId) {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'favorites', String(movieId)));
      setMovies((prev) => prev.filter((m) => m.id !== movieId));
    } catch (err) {
      console.error('[Favorites] Failed to remove favorite:', err);
    }
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

  // Reset visible count when genre or sort changes
  function handleGenreChange(genreId) {
    setSelectedGenre(genreId);
    setVisibleCount(PAGE_SIZE);
    window.scrollTo(0, 0);
  }

  function handleSortChange(value) {
    setSortBy(value);
    setVisibleCount(PAGE_SIZE);
  }

  // Slice to visible count for progressive rendering
  const visibleMovies = filteredAndSorted.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAndSorted.length;

  // IntersectionObserver to reveal more movies
  const observerCallback = useCallback(
    (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && hasMore) {
        setVisibleCount((prev) => prev + PAGE_SIZE);
      }
    },
    [hasMore]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(observerCallback, {
      rootMargin: '400px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [observerCallback]);

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

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Your Favorites</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <p className="text-muted-foreground">Failed to load your favorites.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
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
      {/* Spacer for fixed mobile genre dropdown */}
      <div className="md:hidden h-10" />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Favorites</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={sortBy} onValueChange={handleSortChange}>
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
        <aside className="hidden md:flex flex-col gap-1 min-w-[160px] sticky top-[4.5rem] self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto">
          {GENRES.map((genre) => {
            const count = genre.id === null ? genreCounts.all : (genreCounts[genre.id] || 0);
            const isActive = selectedGenre === genre.id;
            return (
              <button
                key={genre.name}
                onClick={() => handleGenreChange(genre.id)}
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

        {/* Mobile genre selector — sticky, hides on scroll down, shows on scroll up */}
        <div
          className={`md:hidden fixed top-[6rem] left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-2 border-b border-border transition-transform duration-300 ${
            showMobileGenre ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <Select
            value={selectedGenre === null ? 'all' : String(selectedGenre)}
            onValueChange={(v) => handleGenreChange(v === 'all' ? null : Number(v))}
          >
            <SelectTrigger className="w-full">
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
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {visibleMovies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} onRemove={handleRemove} />
                ))}
              </div>
              {/* Sentinel for infinite scroll */}
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
