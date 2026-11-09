import { MediaItem } from "../types";
import { fetchTMDB, hasTMDBCredentials } from "./tmdbService";

export interface SearchResult {
  items: MediaItem[];
  sources: { title: string; uri: string }[];
  notice?: string;
}

const OMDB_FALLBACKS = [process.env.OMDB_API_KEY].filter(Boolean) as string[];

interface TVMazeShow {
  name: string;
  externals?: { imdb?: string | null };
  premiered?: string | null;
  summary?: string | null;
  image?: { medium: string; original: string } | null;
  rating?: { average?: number | null };
}

const fromTVMaze = (shows: TVMazeShow[]): MediaItem[] => {
  const seen = new Set<string>();
  return shows.flatMap(show => {
    // Preserve IMDb identifiers understood by the player and episode lookup.
    const id = show.externals?.imdb;
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [{
      id, title: show.name, type: 'tv' as const,
      year: show.premiered?.slice(0, 4) || 'N/A',
      overview: (show.summary || '').replace(/<[^>]*>/g, ''),
      posterPath: show.image?.medium || '/placeholder.svg',
      backdropPath: show.image?.original || '/placeholder.svg',
      rating: show.rating?.average?.toFixed(1) || 'N/A'
    }];
  });
};

const tvmaze = async (path: string) => {
  const response = await fetch(`https://api.tvmaze.com${path}`, {
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`TV listings unavailable (${response.status}). Please try again later.`);
  return response.json();
};

const tvmazeSource = [{ title: 'TVmaze', uri: 'https://www.tvmaze.com' }];


/**
 * Fuzzy Aggregator:
 * Handles typos, plurals, and variations to ensure search always returns results.
 */
export const searchMediaWithAI = async (query: string, type: 'all' | 'movie' | 'tv' = 'all'): Promise<SearchResult> => {
  const allResults: MediaItem[] = [];
  const processedIds = new Set<string>();
  const queryLower = query.toLowerCase().trim();

  // Create a "fuzzy" version of the query (remove trailing 's', etc.)
  const fuzzyQuery = queryLower.replace(/s\b/g, '').replace(/es\b/g, '');
  const searchQueries = Array.from(new Set([queryLower, fuzzyQuery]));

  const addItems = (newItems: any[], priority: number = 0) => {
    newItems.forEach(item => {
      if (!item.id || !item.title || (type !== 'all' && item.type !== type)) return;
      const uniqueKey = `${item.type}:${item.id}`;
      if (!processedIds.has(uniqueKey)) {
        processedIds.add(uniqueKey);
        (item as any).priorityRank = priority;
        allResults.push(item);
      }
    });
  };

  const searchPromises = [];

  // Run searches for both original and fuzzy queries
  searchQueries.forEach(q => {
    // 1. OMDb Search
    searchPromises.push((async () => {
      for (const key of OMDB_FALLBACKS) {
        try {
          const resp = await fetch(`https://www.omdbapi.com/?apikey=${key}&s=${encodeURIComponent(q)}${type === 'all' ? '' : `&type=${type === 'tv' ? 'series' : 'movie'}`}`, { signal: AbortSignal.timeout(10000) });
          if (resp.ok) {
            const data = await resp.json();
            if (data.Search) {
              addItems(data.Search.map((m: any) => ({
                id: m.imdbID, title: m.Title, type: m.Type === 'series' ? 'tv' : 'movie',
                year: m.Year.split('–')[0],
                overview: "Official database record.",
                posterPath: m.Poster !== "N/A" ? m.Poster : `https://picsum.photos/seed/${m.imdbID}/500/750`,
                backdropPath: m.Poster !== "N/A" ? m.Poster : `https://picsum.photos/seed/${m.imdbID}/1200/675`,
                rating: 'N/A'
              })), q === queryLower ? 10 : 8);
              return;
            }
          }
        } catch (e) {}
      }
    })());

    // 2. TMDB Search
    searchPromises.push((async () => {
      if (hasTMDBCredentials) {
        try {
          const data = await fetchTMDB(`/search/${type === 'all' ? 'multi' : type}`, { query: q });
          addItems((data.results || []).filter((m: any) => m.media_type !== 'person').map((m: any) => ({
              id: m.id.toString(), title: m.title || m.name, type: type === 'tv' || m.media_type === 'tv' ? 'tv' : 'movie',
              year: (m.release_date || m.first_air_date || '').split('-')[0] || 'N/A',
              overview: m.overview,
              posterPath: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : `https://picsum.photos/seed/${m.id}/500/750`,
              backdropPath: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : `https://picsum.photos/seed/${m.id}/1200/675`,
              rating: m.vote_average?.toFixed(1)
            })), q === queryLower ? 9 : 7);
        } catch (e) {}
      }
    })());
  });

  await Promise.all(searchPromises);

  if (allResults.length === 0 && type === 'movie') {
    return { items: [], sources: [], notice: hasTMDBCredentials || OMDB_FALLBACKS.length ? undefined : 'Movie search needs valid TMDB or OMDb credentials.' };
  }

  if (allResults.length === 0) {
    const results = await tvmaze(`/search/shows?q=${encodeURIComponent(query.trim())}`);
    return {
      items: fromTVMaze(results.map((result: { show: TVMazeShow }) => result.show)),
      sources: tvmazeSource,
      notice: 'TV results from TVmaze. Movie search needs valid TMDB or OMDb credentials.'
    };
  }

  // Advanced Sorting: Exact > fuzzy > Priority > Year
  const sorted = allResults.sort((a, b) => {
    const aT = a.title.toLowerCase();
    const bT = b.title.toLowerCase();

    // Check original query matches
    const aExact = aT === queryLower;
    const bExact = bT === queryLower;
    if (aExact && !bExact) return -1;
    if (bExact && !aExact) return 1;

    // Check fuzzy query matches
    const aFuzzy = aT === fuzzyQuery;
    const bFuzzy = bT === fuzzyQuery;
    if (aFuzzy && !bFuzzy) return -1;
    if (bFuzzy && !aFuzzy) return 1;

    // Rank by internal priority
    const aP = (a as any).priorityRank || 0;
    const bP = (b as any).priorityRank || 0;
    if (aP !== bP) return bP - aP;

    return b.year.localeCompare(a.year);
  });

  return { items: sorted.slice(0, 60), sources: [{ title: "Global Search", uri: "#" }] };
};

export const getTrendingMedia = async (type: 'all' | 'movie' | 'tv' = 'all'): Promise<SearchResult> => {
  let tmdbError: unknown;
  try {
    const data = await fetchTMDB(`/trending/${type}/day`);
    const items = (data.results || []).map((m: any) => ({
      id: m.id.toString(), title: m.title || m.name,
      type: m.media_type === 'tv' || type === 'tv' ? 'tv' as const : 'movie' as const,
      year: (m.release_date || m.first_air_date || '').split('-')[0] || 'N/A',
      overview: m.overview,
      posterPath: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : `https://picsum.photos/seed/${m.id}/500/750`,
      backdropPath: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : `https://picsum.photos/seed/${m.id}/1200/675`,
      rating: m.vote_average?.toFixed(1) || 'N/A'
    }));
    return { items, sources: [{ title: "TMDB", uri: "https://themoviedb.org" }] };
  } catch (error) {
    tmdbError = error;
  }
  if (type === 'movie') throw tmdbError;
  const schedule = await tvmaze('/schedule');
  return {
    items: fromTVMaze(schedule.map((entry: { show: TVMazeShow }) => entry.show)).slice(0, 60),
    sources: tvmazeSource,
    notice: "Showing today's TV schedule from TVmaze. Movie charts need a valid TMDB key."
  };
};
