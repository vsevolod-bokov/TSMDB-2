import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { tmdbFetch } from '@/tmdb';
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import MovieCard from '@/components/movie-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/original';

// Horizontal scrollable row of movie cards with left/right arrow buttons.
// Arrow visibility is driven by scroll position — hidden when already at the edge.
function MovieRow({ title, movies, loading, error, onRetry, onFavoriteToggle, isFavorited, isToggling }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollButtons() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  // Re-check arrow visibility on scroll, resize (window/container), and when movies change
  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollButtons);
    const observer = new ResizeObserver(updateScrollButtons);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      observer.disconnect();
    };
  }, [movies]);

  function scroll(direction) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -el.clientWidth : el.clientWidth, behavior: 'smooth' });
  }

  // 2 cols mobile, 3 cols sm, 4 cols md, 5 cols lg+
  const cardClass = 'w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] md:w-[calc(25%-9px)] lg:w-[calc(20%-10px)] shrink-0';

  if (loading) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className="flex gap-3 overflow-hidden px-1 py-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${cardClass} aspect-[2/3] bg-muted rounded-lg animate-pulse`} />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div role="alert" className="flex flex-col items-center py-8 text-center space-y-3">
          <p className="text-muted-foreground text-sm">Failed to load this section.</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try Again
            </Button>
          )}
        </div>
      </section>
    );
  }

  if (!movies?.length) return null;

  return (
    <section className="relative group/row">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="relative">
        {canScrollLeft && (
          <Button
            variant="secondary"
            size="icon"
            aria-label="Scroll left"
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/row:opacity-100 transition-opacity shadow-lg h-10 w-10 rounded-full"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
        )}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth px-1 py-2"
          style={{ scrollbarWidth: 'none' }}
        >
          {movies.map((movie) => (
            <div key={movie.id} className={cardClass}>
              <MovieCard movie={movie} onFavoriteToggle={onFavoriteToggle} isFavorited={isFavorited?.(movie.id)} isToggling={isToggling?.(movie.id)} />
            </div>
          ))}
        </div>
        {canScrollRight && (
          <Button
            variant="secondary"
            size="icon"
            aria-label="Scroll right"
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/row:opacity-100 transition-opacity shadow-lg h-10 w-10 rounded-full"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { toggleFavorite, isFavorited, isToggling } = useFavorites();
  const navigate = useNavigate();
  const [nowPlaying, setNowPlaying] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingNow, setLoadingNow] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [errorNow, setErrorNow] = useState(null);
  const [errorRecs, setErrorRecs] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => { document.title = 'Home - TSMDB'; }, []);

  function retryNowPlaying() {
    setErrorNow(null);
    setLoadingNow(true);
    tmdbFetch('/movie/now_playing?language=en-US&page=1&region=US')
      .then((data) => setNowPlaying((data.results || []).filter((m) => m.poster_path && m.original_language === 'en').slice(0, 12)))
      .catch((err) => {
        console.error('[Home] Failed to load now playing:', err);
        setErrorNow(err.message);
      })
      .finally(() => setLoadingNow(false));
  }

  useEffect(() => { retryNowPlaying(); }, []);

  // Build personalized recommendations by fetching TMDB's "recommendations" for a random
  // sample of the user's favorites, then merging/deduplicating the results.
  function loadRecommendations() {
    if (!user) return;
    setErrorRecs(null);
    setLoadingRecs(true);
    getDocs(collection(db, 'users', user.uid, 'favorites'))
      .then(async (snapshot) => {
        const favIds = new Set(snapshot.docs.map((doc) => doc.id));
        if (!favIds.size) {
          setRecommendations([]);
          return;
        }
        // Sample 5 random favorites to keep API calls reasonable while adding variety
        const ids = [...favIds];
        const shuffled = ids.sort(() => Math.random() - 0.5).slice(0, 5);
        const results = await Promise.allSettled(
          shuffled.map((id) => tmdbFetch(`/movie/${id}/recommendations?language=en-US&page=1`))
        );
        // Merge all recommendation lists, removing duplicates and movies already favorited
        const seen = new Set();
        const merged = [];
        let anyFailed = false;
        for (const result of results) {
          if (result.status === 'rejected') {
            anyFailed = true;
            continue;
          }
          for (const movie of result.value.results || []) {
            if (!seen.has(movie.id) && !favIds.has(String(movie.id)) && movie.poster_path && movie.original_language === 'en') {
              seen.add(movie.id);
              merged.push(movie);
            }
          }
        }
        if (merged.length === 0 && anyFailed) {
          setErrorRecs('Failed to load recommendations.');
        } else {
          setRecommendations(merged.slice(0, 12));
        }
      })
      .catch((err) => {
        console.error('[Home] Failed to load recommendations:', err);
        setErrorRecs(err.message);
      })
      .finally(() => setLoadingRecs(false));
  }

  useEffect(() => { loadRecommendations(); }, [user]);

  // Pick a random backdrop from now-playing movies for the hero section.
  // Memoized on nowPlaying so it only re-rolls when the data changes.
  const randomBackdrop = useMemo(() => {
    const withBackdrop = nowPlaying.filter((m) => m.backdrop_path);
    if (!withBackdrop.length) return null;
    return withBackdrop[Math.floor(Math.random() * withBackdrop.length)];
  }, [nowPlaying]);

  function handleSearch(e) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/results?q=${encodeURIComponent(trimmed)}`);
      setQuery('');
    }
  }

  return (
    <div className="space-y-8">
      <section className="relative -mx-4 -mt-6 overflow-hidden rounded-b-lg">
        {randomBackdrop ? (
          <img
            src={`${TMDB_BACKDROP}${randomBackdrop.backdrop_path}`}
            alt={randomBackdrop.title}
            className="w-full h-64 sm:h-80 object-cover"
          />
        ) : (
          <div className="w-full h-64 sm:h-80 bg-muted animate-pulse" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, {user?.displayName || 'Movie Fan'}!
            </h1>
            <p className="text-muted-foreground">
              Discover what's playing and get recommendations based on your favorites.
            </p>
          </div>
          <form onSubmit={handleSearch} className="max-w-md" role="search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                type="text"
                placeholder="Search movies..."
                aria-label="Search movies"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 bg-background/80 backdrop-blur"
              />
            </div>
          </form>
        </div>
      </section>

      <MovieRow title="New Releases" movies={nowPlaying} loading={loadingNow} error={errorNow} onRetry={retryNowPlaying} onFavoriteToggle={toggleFavorite} isFavorited={isFavorited} isToggling={isToggling} />
      <MovieRow title="Recommended for You" movies={recommendations} loading={loadingRecs} error={errorRecs} onRetry={loadRecommendations} onFavoriteToggle={toggleFavorite} isFavorited={isFavorited} isToggling={isToggling} />
    </div>
  );
}
