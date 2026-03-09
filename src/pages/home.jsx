import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { tmdbFetch } from '@/tmdb';
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w300';
const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/original';

function MovieCard({ movie }) {
  return (
    <Link to={`/film/${movie.id}`}>
      <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all">
        <CardContent className="p-0">
          {movie.poster_path ? (
            <img
              src={`${TMDB_IMG}${movie.poster_path}`}
              alt={movie.title}
              className="w-full aspect-[2/3] object-cover"
            />
          ) : (
            <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center text-muted-foreground text-sm">
              No Image
            </div>
          )}
          <div className="p-3">
            <p className="text-sm font-medium truncate">{movie.title}</p>
            <p className="text-xs text-muted-foreground">
              {movie.release_date?.split('-')[0]}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MovieRow({ title, movies, loading }) {
  if (loading) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!movies?.length) return null;

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nowPlaying, setNowPlaying] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loadingNow, setLoadingNow] = useState(true);
  const [loadingFavs, setLoadingFavs] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    tmdbFetch('/movie/now_playing?language=en-US&page=1')
      .then((data) => setNowPlaying(data.results?.slice(0, 12) || []))
      .finally(() => setLoadingNow(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, 'users', user.uid, 'favorites'))
      .then(async (snapshot) => {
        const favIds = snapshot.docs.map((doc) => doc.id);
        if (!favIds.length) {
          setFavorites([]);
          return;
        }
        const movies = await Promise.all(
          favIds.slice(0, 6).map((id) => tmdbFetch(`/movie/${id}?language=en-US`))
        );
        setFavorites(movies.filter((m) => m.id));
      })
      .finally(() => setLoadingFavs(false));
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
              Discover what's playing in theaters and revisit your favorites.
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

      <MovieRow title="Now Playing" movies={nowPlaying} loading={loadingNow} />
      <MovieRow title="Your Favorites" movies={favorites} loading={loadingFavs} />
    </div>
  );
}
