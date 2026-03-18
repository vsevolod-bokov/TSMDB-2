const BASE_URL = 'https://api.themoviedb.org/3'
const TOKEN = import.meta.env.VITE_TMDB_ACCESS_TOKEN

export async function tmdbFetch(endpoint) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });
  } catch (err) {
    console.error(`[TMDB] Network error fetching ${endpoint}:`, err);
    throw new Error('Network error — check your connection and try again.');
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[TMDB] ${res.status} ${res.statusText} for ${endpoint}`, body);
    throw new Error(`TMDB request failed (${res.status})`);
  }

  return res.json();
}
