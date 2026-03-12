import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export const TMDB_IMG = 'https://image.tmdb.org/t/p/w300';

export default function MovieCard({ movie, onRemove }) {
  return (
    <Link to={`/film/${movie.id}`} className="relative group">
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
      {onRemove && (
        <Button
          variant="destructive"
          size="icon-xs"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(movie.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </Link>
  );
}
