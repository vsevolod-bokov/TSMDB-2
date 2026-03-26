import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigationType, useSearchParams } from 'react-router-dom';
import { useFavorites } from '@/hooks/useFavorites';
import { tmdbFetch } from '@/tmdb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MovieCard from '@/components/movie-card';
import { Button } from '@/components/ui/button';
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

const RELOAD_KEY = 'browse_reloading';

export default function Browse() {
  const { toggleFavorite, isFavorited, isToggling } = useFavorites();
  const navType = useNavigationType();
  const [searchParams] = useSearchParams();
  const genreParam = searchParams.get('genre');
  // Detect page reload vs fresh navigation. beforeunload sets this flag (see effect below);
  // SPA navigations don't fire beforeunload, so the flag distinguishes the two cases.
  const isReload = useRef((() => {
    const flag = sessionStorage.getItem(RELOAD_KEY);
    sessionStorage.removeItem(RELOAD_KEY);
    return flag === 'true';
  })()).current;
  // Restore cached state on back/forward (POP) or page reload — but not if we arrived
  // via a genre deep-link (?genre=X), since that should start a fresh browse.
  const shouldRestore = navType === 'POP' || (isReload && !genreParam);
  const cache = useRef(shouldRestore ? loadCache() : null).current;
  if (!shouldRestore) clearCache();
  const [movies, setMovies] = useState(cache?.movies || []);
  const [loading, setLoading] = useState(!cache);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState(cache?.selectedGenre ?? (genreParam ? Number(genreParam) : null));
  const [sortBy, setSortBy] = useState(cache?.sortBy || 'popularity.desc');
  const [page, setPage] = useState(cache?.page || 1);
  const [totalPages, setTotalPages] = useState(cache?.totalPages || 1);
  const sentinelRef = useRef(null);
  const restoredScroll = useRef(false);
  const skipFetch = useRef(!!cache);
  const [showMobileGenre, setShowMobileGenre] = useState(true);
  const [error, setError] = useState(null);
  const lastScrollY = useRef(cache?.scrollY || 0);

  useEffect(() => {
    const genre = GENRES.find((g) => g.id === selectedGenre);
    document.title = selectedGenre !== null && genre ? `${genre.name} - TSMDB` : 'Browse - TSMDB';
  }, [selectedGenre]);

  // Set reload flag on page unload (fires on refresh, not on SPA navigation)
  useEffect(() => {
    const onBeforeUnload = () => sessionStorage.setItem(RELOAD_KEY, 'true');
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Restore scroll position after cached movies render.
  // Double-rAF waits for React to paint the restored movie grid before scrolling,
  // with a fallback setTimeout in case the browser hasn't finished layout yet.
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

  // Track scroll direction for mobile genre dropdown — uses rAF throttling
  // to avoid layout thrashing on every scroll event.
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
      saveCache({ movies, selectedGenre, sortBy, page, totalPages, scrollY: lastScrollY.current });
    }
  }, [movies, selectedGenre, sortBy, page, totalPages, loading]);

  // Fetch movies — replaces list on page 1, appends on subsequent pages.
  // Deduplicates by ID on append since TMDB can return overlapping results across pages.
  useEffect(() => {
    // Skip the initial fetch if we restored from cache
    if (skipFetch.current) {
      skipFetch.current = false;
      return;
    }

    const isFirstPage = page === 1;
    if (isFirstPage) setLoading(true);
    else setLoadingMore(true);

    let endpoint = `/discover/movie?language=en-US&page=${page}&sort_by=${sortBy}&with_original_language=en`;
    if (selectedGenre !== null) {
      endpoint += `&with_genres=${selectedGenre}`;
    }
    tmdbFetch(endpoint)
      .then((data) => {
        const results = (data.results || []).filter((m) => m.poster_path);
        if (isFirstPage) {
          setMovies(results);
        } else {
          setMovies((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const unique = results.filter((m) => !existingIds.has(m.id));
            return [...prev, ...unique];
          });
        }
        // TMDB caps at 500 pages for discover endpoints
        setTotalPages(Math.min(data.total_pages || 1, 500));
        setError(null);
      })
      .catch((err) => {
        console.error('[Browse] Failed to load movies:', err);
        if (isFirstPage) setError(err.message);
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
    window.scrollTo(0, 0);
  }

  function handleSortChange(value) {
    clearCache();
    setSortBy(value);
    setPage(1);
    window.scrollTo(0, 0);
  }

  // Infinite scroll: an invisible sentinel div sits below the movie grid.
  // When it enters the viewport (with 400px lookahead), we load the next page.
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
      {/* Spacer for fixed mobile genre dropdown */}
      <div className="md:hidden h-10" />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Browse Movies</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[200px]" aria-label="Sort by">
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
        <aside aria-label="Genre filter" className="hidden md:flex flex-col gap-1 min-w-[160px] sticky top-[4.5rem] self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto">
          {GENRES.map((genre) => {
            const isActive = selectedGenre === genre.id;
            return (
              <button
                key={genre.name}
                onClick={() => handleGenreChange(genre.id)}
                aria-pressed={isActive}
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

        {/* Mobile genre selector — sticky, hides on scroll down, shows on scroll up */}
        <aside
          aria-label="Genre filter"
          className={`md:hidden fixed top-[6rem] left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-2 border-b border-border transition-transform duration-300 ${
            showMobileGenre ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <Select
            value={selectedGenre === null ? 'all' : String(selectedGenre)}
            onValueChange={(v) => handleGenreChange(v === 'all' ? null : Number(v))}
          >
            <SelectTrigger className="w-full" aria-label="Filter by genre">
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
        </aside>

        {/* Movie grid */}
        <section className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <p className="text-muted-foreground">Failed to load movies.</p>
              <Button variant="outline" onClick={() => { setError(null); setPage(1); }}>
                Try Again
              </Button>
            </div>
          ) : !movies.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">No movies found.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {movies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} onFavoriteToggle={toggleFavorite} isFavorited={isFavorited(movie.id)} isToggling={isToggling(movie.id)} />
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
        </section>
      </div>
    </div>
  );
}
