import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { tmdbFetch } from '@/tmdb';
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import MovieCard from '@/components/movie-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/original';

function MovieRow({ title, movies, loading }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollButtons() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

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

  if (!movies?.length) return null;

  return (
    <section className="relative group/row">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="relative">
        {canScrollLeft && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/row:opacity-100 transition-opacity shadow-lg h-10 w-10 rounded-full"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth px-1 py-2"
          style={{ scrollbarWidth: 'none' }}
        >
          {movies.map((movie) => (
            <div key={movie.id} className={cardClass}>
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
        {canScrollRight && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/row:opacity-100 transition-opacity shadow-lg h-10 w-10 rounded-full"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nowPlaying, setNowPlaying] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingNow, setLoadingNow] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    tmdbFetch('/movie/now_playing?language=en-US&page=1&region=US')
      .then((data) => setNowPlaying(data.results?.slice(0, 12) || []))
      .finally(() => setLoadingNow(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, 'users', user.uid, 'favorites'))
      .then(async (snapshot) => {
        const favIds = new Set(snapshot.docs.map((doc) => doc.id));
        if (!favIds.size) {
          setRecommendations([]);
          return;
        }
        // Pick up to 5 random favorites to fetch recommendations from
        const ids = [...favIds];
        const shuffled = ids.sort(() => Math.random() - 0.5).slice(0, 5);
        const results = await Promise.all(
          shuffled.map((id) => tmdbFetch(`/movie/${id}/recommendations?language=en-US&page=1`))
        );
        // Merge, deduplicate, and exclude movies already in favorites
        const seen = new Set();
        const merged = [];
        for (const data of results) {
          for (const movie of data.results || []) {
            if (!seen.has(movie.id) && !favIds.has(String(movie.id))) {
              seen.add(movie.id);
              merged.push(movie);
            }
          }
        }
        setRecommendations(merged.slice(0, 12));
      })
      .finally(() => setLoadingRecs(false));
  }, [user]);

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
      <div className="relative -mx-4 -mt-6 overflow-hidden rounded-b-lg">
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
          <form onSubmit={handleSearch} className="max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search movies..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 bg-background/80 backdrop-blur"
              />
            </div>
          </form>
        </div>
      </div>

      <MovieRow title="New in Theaters" movies={nowPlaying} loading={loadingNow} />
      <MovieRow title="Recommended for You" movies={recommendations} loading={loadingRecs} />
    </div>
  );
}
