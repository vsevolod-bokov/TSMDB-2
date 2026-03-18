import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFavorites } from '@/hooks/useFavorites';
import { tmdbFetch } from '@/tmdb';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import MovieCard from '@/components/movie-card';
import { Heart, ArrowLeft, Star, Clock, Calendar, User } from 'lucide-react';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w300';
const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/original';
const TMDB_LOGO = 'https://image.tmdb.org/t/p/w92';

// Maps variant provider IDs to their parent platform ID
const PROVIDER_ALIASES = {
  1796: 8,   // Netflix Standard with Ads → Netflix
  119: 9,    // Amazon Prime Video (intl) → Prime Video
  2100: 15,  // Hulu (variant) → Hulu
  1825: 337, // Disney+ (variant) → Disney+
  1853: 384, // Max (variant) → Max
  2115: 531, // Paramount+ (variant) → Paramount+
  386: 386,  // Peacock Premium
  387: 386,  // Peacock Premium Plus → Peacock
};

function getProviderUrl(providerId, title) {
  const resolved = PROVIDER_ALIASES[providerId] ?? providerId;
  const q = encodeURIComponent(title);
  const search = {
    8: `https://www.netflix.com/search?q=${q}`,
    9: `https://www.primevideo.com/search/ref=atv_nb_sug?ie=UTF8&phrase=${q}`,
    10: `https://www.primevideo.com/search/ref=atv_nb_sug?ie=UTF8&phrase=${q}`,
    15: `https://www.hulu.com/`,
    337: `https://www.disneyplus.com/`,
    384: `https://www.max.com/`,
    1899: `https://www.max.com/`,
    350: `https://tv.apple.com/search?term=${q}`,
    2: `https://tv.apple.com/search?term=${q}`,
    531: `https://www.paramountplus.com/search/`,
    386: `https://www.peacocktv.com/`,
    3: `https://play.google.com/store/search?q=${q}&c=movies`,
    192: `https://www.youtube.com/results?search_query=${q}`,
    73: `https://tubitv.com/search/${q}`,
    300: `https://pluto.tv/us/search`,
  };
  const fallback = {
    7: `https://athome.fandango.com/content/browse/search?returnUrl=%252F&searchString=${q}`,
    283: 'https://www.crunchyroll.com',
    613: `https://www.primevideo.com/search/ref=atv_nb_sug?ie=UTF8&phrase=${q}`,
    257: 'https://www.fubo.tv',
  };
  return search[resolved] || fallback[resolved] || null;
}

function dedupeProviders(providers) {
  if (!providers) return [];
  const seen = new Set();
  return providers.filter((p) => {
    const resolved = PROVIDER_ALIASES[p.provider_id] ?? p.provider_id;
    if (seen.has(resolved)) return false;
    seen.add(resolved);
    return true;
  });
}

export default function Film() {
  const { id } = useParams();
  const { toggleFavorite, isFavorited } = useFavorites();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchProviders, setWatchProviders] = useState(null);
  const [cast, setCast] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (movie?.title) document.title = `${movie.title} - TSMDB`;
    else document.title = 'Film - TSMDB';
  }, [movie]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      tmdbFetch(`/movie/${id}?language=en-US`),
      tmdbFetch(`/movie/${id}/watch/providers`),
      tmdbFetch(`/movie/${id}/credits?language=en-US`),
      tmdbFetch(`/movie/${id}/similar?language=en-US&page=1`),
    ])
      .then(([movieData, providersData, creditsData, similarData]) => {
        setMovie(movieData);
        setWatchProviders(providersData.results?.US || null);
        setCast(creditsData.cast?.slice(0, 12) || []);
        setSimilar((similarData.results || []).filter((m) => m.poster_path).slice(0, 12));
      })
      .catch((err) => {
        console.error('[Film] Failed to load movie details:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const favorited = isFavorited(id);

  function formatRuntime(minutes) {
    if (!minutes) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="relative -mx-4 -mt-6 h-64 sm:h-80 bg-muted animate-pulse" />
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

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Failed to load movie details.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
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
        <div className="relative -mx-4 -mt-6 overflow-hidden">
          <img
            src={`${TMDB_BACKDROP}${movie.backdrop_path}`}
            alt={movie.title}
            className="w-full h-64 sm:h-80 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background from-10% via-background/60 via-40% to-transparent" />
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
            variant={favorited ? 'default' : 'outline'}
            onClick={() => toggleFavorite(id)}
          >
            <Heart
              className={`h-4 w-4 mr-2 ${favorited ? 'fill-current text-red-500' : ''}`}
            />
            {favorited ? 'Favorited' : 'Add to Favorites'}
          </Button>

          {watchProviders && (watchProviders.flatrate?.length || watchProviders.rent?.length || watchProviders.buy?.length) ? (
            <>
              <Separator />
              <div>
                <h2 className="text-lg font-semibold mb-3">Where to Watch</h2>
                <div className="space-y-3">
                  {dedupeProviders(watchProviders.flatrate).length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Stream</p>
                      <div className="flex flex-wrap gap-2">
                        {dedupeProviders(watchProviders.flatrate).map((p) => (
                          <a
                            key={p.provider_id}
                            href={getProviderUrl(p.provider_id, movie.title) || watchProviders.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                          >
                            <img
                              src={`${TMDB_LOGO}${p.logo_path}`}
                              alt={p.provider_name}
                              className="w-6 h-6 rounded"
                            />
                            <span className="text-sm">{p.provider_name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {dedupeProviders(watchProviders.rent).length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Rent</p>
                      <div className="flex flex-wrap gap-2">
                        {dedupeProviders(watchProviders.rent).map((p) => (
                          <a
                            key={p.provider_id}
                            href={getProviderUrl(p.provider_id, movie.title) || watchProviders.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                          >
                            <img
                              src={`${TMDB_LOGO}${p.logo_path}`}
                              alt={p.provider_name}
                              className="w-6 h-6 rounded"
                            />
                            <span className="text-sm">{p.provider_name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {dedupeProviders(watchProviders.buy).length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Buy</p>
                      <div className="flex flex-wrap gap-2">
                        {dedupeProviders(watchProviders.buy).map((p) => (
                          <a
                            key={p.provider_id}
                            href={getProviderUrl(p.provider_id, movie.title) || watchProviders.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                          >
                            <img
                              src={`${TMDB_LOGO}${p.logo_path}`}
                              alt={p.provider_name}
                              className="w-6 h-6 rounded"
                            />
                            <span className="text-sm">{p.provider_name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Streaming data provided by{' '}
                  <a
                    href={watchProviders.link || 'https://www.justwatch.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    JustWatch
                  </a>
                </p>
              </div>
            </>
          ) : null}

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
                <Link
                  key={genre.id}
                  to={`/browse?genre=${genre.id}`}
                  className="px-3 py-1 text-xs rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  {genre.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {cast.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="text-xl font-semibold mb-4">Cast</h2>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {cast.map((person) => (
                <div key={person.credit_id} className="shrink-0 w-28 text-center">
                  {person.profile_path ? (
                    <img
                      src={`${TMDB_IMG}${person.profile_path}`}
                      alt={person.name}
                      className="w-28 h-28 rounded-full object-cover mx-auto"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-muted flex items-center justify-center mx-auto">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <p className="text-sm font-medium mt-2 truncate">{person.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{person.character}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {similar.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="text-xl font-semibold mb-4">Similar Movies</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {similar.map((m) => (
                <MovieCard key={m.id} movie={m} onFavoriteToggle={toggleFavorite} isFavorited={isFavorited(m.id)} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
