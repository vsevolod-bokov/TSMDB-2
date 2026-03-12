import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { tmdbFetch } from '@/tmdb';
import { Card, CardContent } from '@/components/ui/card';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w300';

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

export default function Results() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!query) {
      setMovies([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    tmdbFetch(`/search/movie?query=${encodeURIComponent(query)}&language=en-US&page=${page}`)
      .then((data) => {
        setMovies(data.results || []);
        setTotalPages(data.total_pages || 1);
      })
      .finally(() => setLoading(false));
  }, [query, page]);

  useEffect(() => {
    setPage(1);
  }, [query]);

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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-sm rounded-md bg-secondary text-secondary-foreground disabled:opacity-50"
          >
            Previous
          </button>
          <span className="flex items-center text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 text-sm rounded-md bg-secondary text-secondary-foreground disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
