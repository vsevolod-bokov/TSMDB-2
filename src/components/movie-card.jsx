import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Heart, Star, Loader2 } from 'lucide-react';

export const TMDB_IMG = 'https://image.tmdb.org/t/p/w300';

export default function MovieCard({ movie, onRemove, onFavoriteToggle, isFavorited, isToggling }) {
  return (
    <Link to={`/film/${movie.id}`} className="relative group">
      <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all py-0 gap-0">
        <CardContent className="p-0">
          <div className="relative">
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
            {movie.vote_average > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm px-2 py-1 flex items-center gap-1 transition-opacity opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-medium text-white">{movie.vote_average.toFixed(1)}</span>
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="text-sm font-medium truncate">{movie.title}</p>
            <p className="text-xs text-muted-foreground">
              {movie.release_date?.split('-')[0]}
            </p>
          </div>
        </CardContent>
      </Card>
      {onRemove && (
        <Button
          variant="destructive"
          size="icon-xs"
          className="absolute top-2 right-2 transition-opacity opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(movie.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
      {!onRemove && onFavoriteToggle && (
        <Button
          variant="secondary"
          size="icon-xs"
          disabled={isToggling}
          className={`absolute top-2 right-2 transition-opacity ${isFavorited ? 'opacity-100' : 'opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100'}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavoriteToggle(movie.id);
          }}
        >
          {isToggling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Heart className={`h-3 w-3 ${isFavorited ? 'fill-current text-red-500' : ''}`} />
          )}
        </Button>
      )}
    </Link>
  );
}
