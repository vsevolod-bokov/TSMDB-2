import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, Home, Film, Heart, User, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function handleSearch(e) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/results?q=${encodeURIComponent(trimmed)}`);
      setQuery('');
    }
  }

  function handleSignOut() {
    signOut()
      .then(() => {
        toast.success('Signed out successfully.');
        navigate('/login');
      })
      .catch(() => {
        toast.error('Failed to sign out. Please try again.');
      });
  }

  return (
    <nav aria-label="Main navigation" className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto flex items-center gap-4 px-4 h-14">
        <Link to="/" className="text-lg font-bold shrink-0">
          TSMDB
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><Home className="h-4 w-4 mr-1" /> Home</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/browse"><Film className="h-4 w-4 mr-1" /> Browse</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/favorites"><Heart className="h-4 w-4 mr-1" /> Favorites</Link>
          </Button>
        </div>

        <form onSubmit={handleSearch} className="flex-1 mx-4" role="search">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              type="text"
              placeholder="Search movies..."
              aria-label="Search movies"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/account" className="flex items-center gap-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.photoURL} alt={user?.displayName} />
                <AvatarFallback className="text-xs">
                  {user?.displayName?.charAt(0)?.toUpperCase() || <User className="h-3 w-3" />}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm">{user?.displayName}</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="flex md:hidden items-center justify-around border-t border-border px-2 py-1" role="navigation" aria-label="Mobile navigation">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/" aria-label="Home"><Home className="h-4 w-4" aria-hidden="true" /></Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/browse" aria-label="Browse"><Film className="h-4 w-4" aria-hidden="true" /></Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/favorites" aria-label="Favorites"><Heart className="h-4 w-4" aria-hidden="true" /></Link>
        </Button>
      </div>
    </nav>
  );
}
