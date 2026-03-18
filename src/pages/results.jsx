import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigationType } from 'react-router-dom';
import { tmdbFetch } from '@/tmdb';
import MovieCard from '@/components/movie-card';
import { Loader2 } from 'lucide-react';

const CACHE_KEY = 'results_cache';

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
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navType = useNavigationType();

  // Only restore cache on back/forward if the query matches
  const cached = useRef(() => {
    if (navType !== 'POP') { clearCache(); return null; }
    const c = loadCache();
    if (c && c.query === query) return c;
    return null;
  }).current();

  const [movies, setMovies] = useState(cached?.movies || []);
  const [loading, setLoading] = useState(!cached && !!query);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(cached?.page || 1);
  const [totalPages, setTotalPages] = useState(cached?.totalPages || 1);
  const sentinelRef = useRef(null);
  const restoredScroll = useRef(false);
  const skipFetch = useRef(!!cached);

  // Restore scroll position from cache
  useEffect(() => {
    if (cached && !restoredScroll.current && movies.length > 0) {
      restoredScroll.current = true;
      requestAnimationFrame(() => {
        window.scrollTo(0, cached.scrollY || 0);
      });
    }
  }, [movies]);

  // Save cache whenever state changes
  useEffect(() => {
    if (!loading && query) {
      saveCache({ query, movies, page, totalPages, scrollY: window.scrollY });
    }
  }, [movies, page, totalPages, loading, query]);

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
  }, [query, page]);

  // Reset when query changes
  useEffect(() => {
    clearCache();
    setMovies([]);
    setPage(1);
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
        <h1 className="text-2xl font-bold">Results for "{query}"</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!movies.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Results for "{query}"</h1>
        <p className="text-muted-foreground">No movies found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Results for "{query}"</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
    </div>
  );
}
