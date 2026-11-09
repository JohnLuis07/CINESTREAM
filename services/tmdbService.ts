const apiKey = (process.env.TMDB_API_KEY || '').trim();
const accessToken = (process.env.TMDB_ACCESS_TOKEN || '').trim();

export const hasTMDBCredentials = Boolean(apiKey || accessToken);

export const fetchTMDB = async (path: string, params: Record<string, string> = {}) => {
  if (!hasTMDBCredentials) {
    throw new Error('Add a free TMDB_API_KEY or TMDB_ACCESS_TOKEN to .env.local and restart the app. Get one at themoviedb.org/settings/api.');
  }
  const query = new URLSearchParams({ language: 'en-US', ...params });
  if (!accessToken) query.set('api_key', apiKey);
  const response = await fetch(`https://api.themoviedb.org/3${path}?${query}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    signal: AbortSignal.timeout(10000)
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error('TMDB rejected your credentials. Set a valid TMDB_API_KEY or TMDB_ACCESS_TOKEN in .env.local and restart the app. Free credentials: themoviedb.org/settings/api.');
  }
  if (!response.ok) throw new Error(`TMDB is unavailable (${response.status}). Please try again later.`);
  return response.json();
};
