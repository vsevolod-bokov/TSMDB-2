import { useState, useEffect, useRef, useCallback } from 'react';
import { tmdbFetch } from '@/tmdb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MovieCard from '@/components/movie-card';
import { Loader2 } from 'lucide-react';

const CACHE_KEY = 'browse_cache';

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
  { value: 'popularity.desc', label: 'Popularity (Most)' },
  { value: 'popularity.asc', label: 'Popularity (Least)' },
  { value: 'vote_average.desc', label: 'Rating (Highest)' },
  { value: 'vote_average.asc', label: 'Rating (Lowest)' },
  { value: 'primary_release_date.desc', label: 'Release Date (Newest)' },
  { value: 'primary_release_date.asc', label: 'Release Date (Oldest)' },
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

export default function Browse() {
  const cache = useRef(loadCache()).current;
  const [movies, setMovies] = useState(cache?.movies || []);
  const [loading, setLoading] = useState(!cache);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState(cache?.selectedGenre ?? null);
  const [sortBy, setSortBy] = useState(cache?.sortBy || 'popularity.desc');
  const [page, setPage] = useState(cache?.page || 1);
  const [totalPages, setTotalPages] = useState(cache?.totalPages || 1);
  const sentinelRef = useRef(null);
  const restoredScroll = useRef(false);
  const skipFetch = useRef(!!cache);

  // Restore scroll position after cached movies render
  useEffect(() => {
    if (cache && !restoredScroll.current && movies.length > 0) {
      restoredScroll.current = true;
      requestAnimationFrame(() => {
        window.scrollTo(0, cache.scrollY || 0);
      });
    }
  }, [movies]);

  // Save state to sessionStorage on scroll
  useEffect(() => {
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Save cache whenever state changes
  useEffect(() => {
    if (!loading) {
      saveCache({ movies, selectedGenre, sortBy, page, totalPages, scrollY: window.scrollY });
    }
  }, [movies, selectedGenre, sortBy, page, totalPages, loading]);

  // Fetch movies — replaces list on page 1, appends on subsequent pages
  useEffect(() => {
    // Skip the initial fetch if we restored from cache
    if (skipFetch.current) {
      skipFetch.current = false;
      return;
    }

    const isFirstPage = page === 1;
    if (isFirstPage) setLoading(true);
    else setLoadingMore(true);

    let endpoint = `/discover/movie?language=en-US&page=${page}&sort_by=${sortBy}`;
    if (selectedGenre !== null) {
      endpoint += `&with_genres=${selectedGenre}`;
    }
    tmdbFetch(endpoint)
      .then((data) => {
        const results = data.results || [];
        if (isFirstPage) {
          setMovies(results);
        } else {
          setMovies((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const unique = results.filter((m) => !existingIds.has(m.id));
            return [...prev, ...unique];
          });
        }
        setTotalPages(Math.min(data.total_pages || 1, 500));
      })
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, [selectedGenre, sortBy, page]);

  // Reset to page 1 and clear cache when genre or sort changes
  function handleGenreChange(genreId) {
    clearCache();
    setSelectedGenre(genreId);
    setPage(1);
  }

  function handleSortChange(value) {
    clearCache();
    setSortBy(value);
    setPage(1);
  }

  // IntersectionObserver to trigger loading next page
  const observerCallback = useCallback(
    (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && !loading && !loadingMore && page < totalPages) {
        setPage((p) => p + 1);
      }
    },
    [loading, loadingMore, page, totalPages]
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Browse Movies</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[200px]">
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
            const isActive = selectedGenre === genre.id;
            return (
              <button
                key={genre.name}
                onClick={() => handleGenreChange(genre.id)}
                className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{genre.name}</span>
              </button>
            );
          })}
        </aside>

        {/* Mobile genre selector */}
        <div className="md:hidden w-full">
          <Select
            value={selectedGenre === null ? 'all' : String(selectedGenre)}
            onValueChange={(v) => handleGenreChange(v === 'all' ? null : Number(v))}
          >
            <SelectTrigger className="w-full mb-4">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              {GENRES.map((genre) => (
                <SelectItem key={genre.name} value={genre.id === null ? 'all' : String(genre.id)}>
                  {genre.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Movie grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !movies.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">No movies found.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {movies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
              {/* Sentinel for infinite scroll */}
              {page < totalPages && (
                <div ref={sentinelRef} className="flex justify-center py-8">
                  {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
