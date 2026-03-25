import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigationType } from 'react-router-dom';
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

const CACHE_KEY = 'results_cache';
const RELOAD_KEY = 'results_reloading';

const SORT_OPTIONS = [
  { value: 'default', label: 'Relevance' },
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

export default function Results() {
  const { toggleFavorite, isFavorited, isToggling } = useFavorites();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navType = useNavigationType();

  // Check reload flag (set by beforeunload — fires on refresh, not SPA nav)
  const isReload = useRef((() => {
    const flag = sessionStorage.getItem(RELOAD_KEY);
    sessionStorage.removeItem(RELOAD_KEY);
    return flag === 'true';
  })()).current;

  // Matches browse.jsx pattern exactly
  const shouldRestore = navType === 'POP' || isReload;
  const cache = useRef((() => {
    if (!shouldRestore) { clearCache(); return null; }
    const c = loadCache();
    if (c && c.query === query) return c;
    clearCache();
    return null;
  })()).current;

  const [movies, setMovies] = useState(cache?.movies || []);
  const [loading, setLoading] = useState(!cache && !!query);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState(cache?.sortBy || 'default');
  const [page, setPage] = useState(cache?.page || 1);
  const [totalPages, setTotalPages] = useState(cache?.totalPages || 1);
  const sentinelRef = useRef(null);
  const restoredScroll = useRef(false);
  const skipFetch = useRef(!!cache);
  const lastScrollY = useRef(0);

  useEffect(() => {
    document.title = query ? `"${query}" - TSMDB` : 'Search - TSMDB';
  }, [query]);

  // Set reload flag on page unload (fires on refresh, not SPA navigation)
  useEffect(() => {
    const onBeforeUnload = () => sessionStorage.setItem(RELOAD_KEY, 'true');
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Restore scroll position after cached movies render
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

  // Track scroll position (mirrors browse.jsx's scroll listener)
  useEffect(() => {
    function onScroll() {
      lastScrollY.current = window.scrollY;
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
    if (!loading && query) {
      saveCache({ query, movies, page, totalPages, sortBy, scrollY: lastScrollY.current });
    }
  }, [movies, page, totalPages, sortBy, loading, query]);

  // Fetch results — replaces list on page 1, appends on subsequent pages
  useEffect(() => {
    if (!query) {
      setMovies([]);
      setLoading(false);
      return;
    }

    if (skipFetch.current) {
      skipFetch.current = false;
      return;
    }

    const isFirstPage = page === 1;
    if (isFirstPage) setLoading(true);
    else setLoadingMore(true);

    tmdbFetch(`/search/movie?query=${encodeURIComponent(query)}&language=en-US&page=${page}`)
      .then((data) => {
        const results = (data.results || []).filter((m) => m.poster_path && m.original_language === 'en');
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
        setError(null);
      })
      .catch((err) => {
        console.error('[Results] Failed to search movies:', err);
        if (isFirstPage) setError(err.message);
      })
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, [query, page]);

  // Reset when query actually changes (not on initial mount)
  const prevQuery = useRef(query);
  useEffect(() => {
    if (prevQuery.current === query) return;
    prevQuery.current = query;
    clearCache();
    setMovies([]);
    setSortBy('default');
    setPage(1);
    setTotalPages(1);
    restoredScroll.current = false;
    skipFetch.current = false;
  }, [query]);

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

  const sortedMovies = useMemo(() => {
    if (sortBy === 'default') return movies;
    const [field, direction] = sortBy.split('-');
    return [...movies].sort((a, b) => {
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
  }, [movies, sortBy]);

  if (!query) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Enter a search term to find movies.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Results for &ldquo;{query}&rdquo;</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Results for &ldquo;{query}&rdquo;</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <p className="text-muted-foreground">Failed to load search results.</p>
          <Button variant="outline" onClick={() => { setError(null); setPage(1); }}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!movies.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Results for &ldquo;{query}&rdquo;</h1>
        <p className="text-muted-foreground">No movies found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Results for &ldquo;{query}&rdquo;</h1>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {sortedMovies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} onFavoriteToggle={toggleFavorite} isFavorited={isFavorited(movie.id)} isToggling={isToggling(movie.id)} />
        ))}
      </div>
      {/* Sentinel for infinite scroll */}
      {page < totalPages && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        </div>
      )}
    </div>
  );
}
