# TSMDB - Thiago Seva Movie Database

A movie discovery web app where users can browse, search, and save their favorite films. Built with React and powered by the TMDB API.

## Project Setup

### Prerequisites

- Node.js (v18+)
- npm

### Installation

```bash
git clone https://github.com/vsevolod-bokov/TSMDB.git
cd TSMDB
npm install
```

### Environment Variables

Create a `.env` file in the project root with the following variables:

```
VITE_TMDB_ACCESS_TOKEN=<your TMDB API read access token>
VITE_FIREBASE_API_KEY=<your Firebase API key>
VITE_FIREBASE_AUTH_DOMAIN=<your Firebase auth domain>
VITE_FIREBASE_PROJECT_ID=<your Firebase project ID>
VITE_FIREBASE_STORAGE_BUCKET=<your Firebase storage bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<your Firebase messaging sender ID>
VITE_FIREBASE_APP_ID=<your Firebase app ID>
VITE_FIREBASE_MEASUREMENT_ID=<your Firebase measurement ID>
```

The `.env` file is not committed to git and must be shared directly between teammates.

### Running the App

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

## Features

- **User Authentication** — Sign up, sign in, and account management via Firebase Auth UI (email/password)
- **Movie Browsing** — Browse movies by genre with server-side sorting (popularity, rating, release date)
- **Movie Search** — Search for movies by title with client-side sorting options
- **Film Details** — View movie info including cast, overview, genres, ratings, runtime, and streaming availability (where to watch)
- **Favorites** — Add/remove movies to a personal favorites list stored in Firestore, with genre filtering and sorting
- **Personalized Recommendations** — Home page shows recommendations based on your favorited movies
- **Infinite Scroll** — Browse, search, and favorites pages load more content as you scroll
- **Scroll Restoration** — Scroll position, filters, and sort preferences are preserved across page reloads and back/forward navigation
- **Customizable Avatars** — Choose from multiple Dicebear avatar styles during sign up or in account settings
- **Responsive Design** — Mobile-friendly layout with collapsible genre filters and bottom navigation
- **Dark Mode** — Dark theme only

## Technologies

| Category | Technology |
|---|---|
| Framework | React 19, Vite 7 |
| Styling | Tailwind CSS v4, shadcn/ui |
| Authentication | Firebase Auth (via Firebase UI) |
| Database | Cloud Firestore |
| Movie Data | TMDB API v3 |
| Avatars | Dicebear API |
| Routing | React Router v7 |
| Hosting | Vercel (static) |

## API Documentation

### TMDB API

All TMDB requests go through the `tmdbFetch(endpoint)` helper in `src/tmdb.js`, which handles authentication via a bearer token and error handling.

**Endpoints used:**

| Endpoint | Purpose |
|---|---|
| `GET /movie/now_playing` | Home page "New Releases" row |
| `GET /movie/{id}/recommendations` | Home page personalized recommendations |
| `GET /discover/movie` | Browse page with genre/sort filters |
| `GET /search/movie` | Search results page |
| `GET /movie/{id}` | Film detail page |
| `GET /movie/{id}/credits` | Film cast list |
| `GET /movie/{id}/similar` | Similar movies on film page |
| `GET /movie/{id}/watch/providers` | Streaming availability (powered by JustWatch) |

TMDB API docs: https://developer.themoviedb.org/reference/getting-started

### Firebase / Firestore

- **Authentication**: Email/password sign-up and sign-in via Firebase Auth UI
- **Favorites storage**: `users/{uid}/favorites/{movieId}` — each document stores `{ addedAt: timestamp }`

### Dicebear API

Avatars are generated via URL: `https://api.dicebear.com/9.x/{style}/svg?seed={seed}&size=128`

Available styles: Adventurer, Avataaars, Bottts, Fun Emoji, Lorelei, Pixel Art

## Known Limitations

- **English-language films only** — All movie listings are filtered to `original_language=en`
- **US streaming providers only** — The "Where to Watch" section on film pages shows US providers only
- **TMDB page cap** — TMDB limits discover/search pagination to 500 pages maximum
- **No offline support** — The app requires an active internet connection
- **Session-based scroll cache** — Scroll position and page state are stored in `sessionStorage`, so they are lost when the browser tab is closed
- **Search sort is client-side** — TMDB's search API doesn't support `sort_by`, so sorting on the results page only reorders the movies already fetched (not all possible results)

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
