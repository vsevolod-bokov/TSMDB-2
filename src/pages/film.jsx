import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { tmdbFetch } from '@/tmdb';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Heart, ArrowLeft, Star, Clock, Calendar } from 'lucide-react';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w300';
const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/original';

export default function Film() {
  const { id } = useParams();
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      tmdbFetch(`/movie/${id}?language=en-US`),
      user ? getDoc(doc(db, 'users', user.uid, 'favorites', id)) : null,
    ])
      .then(([movieData, favSnap]) => {
        setMovie(movieData);
        if (favSnap?.exists()) setIsFavorited(true);
      })
      .finally(() => setLoading(false));
  }, [id, user]);

  async function toggleFavorite() {
    if (!user) return;
    setFavLoading(true);
    const favRef = doc(db, 'users', user.uid, 'favorites', String(id));
    try {
      if (isFavorited) {
        await deleteDoc(favRef);
        setIsFavorited(false);
      } else {
        await setDoc(favRef, { addedAt: new Date() });
        setIsFavorited(true);
      }
    } finally {
      setFavLoading(false);
    }
  }

  function formatRuntime(minutes) {
    if (!minutes) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="relative -mx-4 -mt-6 h-64 sm:h-80 bg-muted animate-pulse rounded-b-lg" />
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-48 aspect-[2/3] bg-muted rounded-lg animate-pulse shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-8 w-64 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            <div className="h-20 w-full bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!movie?.id) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Movie not found.</p>
        <Button variant="outline" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {movie.backdrop_path && (
        <div className="relative -mx-4 -mt-6 overflow-hidden rounded-b-lg">
          <img
            src={`${TMDB_BACKDROP}${movie.backdrop_path}`}
            alt={movie.title}
            className="w-full h-64 sm:h-80 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <div className="shrink-0">
          {movie.poster_path ? (
            <img
              src={`${TMDB_IMG}${movie.poster_path}`}
              alt={movie.title}
              className="w-48 rounded-lg shadow-lg"
            />
          ) : (
            <div className="w-48 aspect-[2/3] bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
              No Image
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{movie.title}</h1>
            {movie.tagline && (
              <p className="text-muted-foreground italic mt-1">{movie.tagline}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {movie.release_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {movie.release_date.split('-')[0]}
              </span>
            )}
            {movie.runtime > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatRuntime(movie.runtime)}
              </span>
            )}
            {movie.vote_average > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                {movie.vote_average.toFixed(1)}
              </span>
            )}
          </div>

          <Button
            variant={isFavorited ? 'default' : 'outline'}
            disabled={favLoading}
            onClick={toggleFavorite}
          >
            <Heart
              className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-current text-red-500' : ''}`}
            />
            {isFavorited ? 'Favorited' : 'Add to Favorites'}
          </Button>

          {movie.overview && (
            <>
              <Separator />
              <div>
                <h2 className="text-lg font-semibold mb-2">Overview</h2>
                <p className="text-muted-foreground leading-relaxed">{movie.overview}</p>
              </div>
            </>
          )}

          {movie.genres?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {movie.genres.map((genre) => (
                <span
                  key={genre.id}
                  className="px-3 py-1 text-xs rounded-full bg-secondary text-secondary-foreground"
                >
                  {genre.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
