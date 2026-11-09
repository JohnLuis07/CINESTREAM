import { fetchTMDB, hasTMDBCredentials } from './tmdbService';
export interface Episode { number: number; season: number; name: string; overview: string; image?: string; airDate?: string; runtime?: number; }
export interface ShowDetails { id: string; name: string; source: 'TMDB' | 'TVmaze'; seasons: { number: number; name: string; count: number }[]; episodes?: Episode[]; }
const maze = async (path: string) => {
  const response = await fetch(`https://api.tvmaze.com${path}`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Episode information is unavailable. Please try again.');
  return response.json();
};
export const loadShow = async (id: string): Promise<ShowDetails> => {
  let imdb = id.startsWith('tt') ? id : undefined;
  if (hasTMDBCredentials) {
    try {
      let tmdb = id;
      if (imdb) {
        const found = await fetchTMDB(`/find/${imdb}`, { external_source: 'imdb_id' });
        if (!found.tv_results?.[0]) throw new Error('Show not found');
        tmdb = String(found.tv_results[0].id);
      }
      const data = await fetchTMDB(`/tv/${tmdb}`, { append_to_response: 'external_ids' });
      imdb = data.external_ids?.imdb_id || imdb;
      const seasons = (data.seasons || []).filter((s: any) => s.season_number > 0 && s.episode_count > 0).map((s: any) => ({ number: s.season_number, name: s.name || `Season ${s.season_number}`, count: s.episode_count }));
      if (!seasons.length) throw new Error('No seasons listed');
      return { id: tmdb, name: data.name, source: 'TMDB', seasons };
    } catch { /* Use the exact IMDb match for the alternative episode guide. */ }
  }
  if (!imdb) throw new Error('Could not load this show’s episode guide. Check your TMDB connection and retry.');
  const show = await maze(`/lookup/shows?imdb=${encodeURIComponent(imdb)}`);
  const raw = await maze(`/shows/${show.id}/episodes`);
  const episodes: Episode[] = raw.filter((e: any) => Number.isInteger(e.number) && e.number > 0 && e.season > 0).map((e: any) => ({ number: e.number, season: e.season, name: e.name, overview: (e.summary || '').replace(/<[^>]*>/g, ''), image: e.image?.medium, airDate: e.airdate, runtime: e.runtime }));
  const seasons = [...new Set(episodes.map(e => e.season))].sort((a, b) => a - b).map(number => ({ number, name: `Season ${number}`, count: episodes.filter(e => e.season === number).length }));
  if (!seasons.length) throw new Error('No episodes are listed for this show yet.');
  return { id: imdb, name: show.name, source: 'TVmaze', seasons, episodes };
};
export const loadEpisodes = async (show: ShowDetails, season: number): Promise<Episode[]> => {
  if (show.source === 'TVmaze') return (show.episodes || []).filter(e => e.season === season).sort((a, b) => a.number - b.number);
  const data = await fetchTMDB(`/tv/${show.id}/season/${season}`);
  return (data.episodes || []).filter((e: any) => Number.isInteger(e.episode_number) && e.episode_number > 0).map((e: any) => ({ number: e.episode_number, season: e.season_number, name: e.name, overview: e.overview || '', image: e.still_path ? `https://image.tmdb.org/t/p/w300${e.still_path}` : undefined, airDate: e.air_date, runtime: e.runtime })).sort((a: Episode, b: Episode) => a.number - b.number);
};
export const hasAired = (episode: Episode) => Boolean(episode.airDate && episode.airDate <= new Date().toISOString().slice(0, 10));
