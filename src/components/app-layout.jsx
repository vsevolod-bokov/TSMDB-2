import { Outlet } from 'react-router-dom';
import Navbar from '@/components/navbar';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
