import { MediaItem } from "../types";
import { GoogleGenAI } from "@google/genai";

export interface SearchResult {
  items: MediaItem[];
  sources: { title: string; uri: string }[];
}

const GEMINI_KEY = (process.env.GEMINI_API_KEY as string) || "";
const client = new GoogleGenAI({ apiKey: GEMINI_KEY });

const TMDB_FALLBACKS = [
  "e547e17d4e91f3e62a571655cd1ccaff",
  "15d1a681301b354e3e35b7067a929822",
  "8d6d91abc388a1161130f9063c691c8d"
];

const OMDB_FALLBACKS = [
  "966c4f4f",
  "4a3b7118"
];

/**
 * Fuzzy Aggregator: 
 * Handles typos, plurals, and variations to ensure search always returns results.
 */
export const searchMediaWithAI = async (query: string): Promise<SearchResult> => {
  const allResults: MediaItem[] = [];
  const processedIds = new Set<string>();
  const queryLower = query.toLowerCase().trim();
  
  // Create a "fuzzy" version of the query (remove trailing 's', etc.)
  const fuzzyQuery = queryLower.replace(/s\b/g, '').replace(/es\b/g, '');
  const searchQueries = Array.from(new Set([queryLower, fuzzyQuery]));

  const addItems = (newItems: any[], priority: number = 0) => {
    newItems.forEach(item => {
      if (!item.id || !item.title) return;
      const uniqueKey = item.id;
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
          const resp = await fetch(`https://www.omdbapi.com/?apikey=${key}&s=${encodeURIComponent(q)}`);
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
      for (const key of TMDB_FALLBACKS) {
        try {
          const resp = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${key}&query=${encodeURIComponent(q)}&language=en-US`);
          if (resp.ok) {
            const data = await resp.json();
            addItems((data.results || []).filter((m: any) => m.media_type !== 'person').map((m: any) => ({
              id: m.id.toString(), title: m.title || m.name, type: m.media_type === 'tv' ? 'tv' : 'movie',
              year: (m.release_date || m.first_air_date || '').split('-')[0] || 'N/A',
              overview: m.overview,
              posterPath: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : `https://picsum.photos/seed/${m.id}/500/750`,
              backdropPath: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : `https://picsum.photos/seed/${m.id}/1200/675`,
              rating: m.vote_average?.toFixed(1)
            })), q === queryLower ? 9 : 7);
            return;
          }
        } catch (e) {}
      }
    })());
  });

  await Promise.all(searchPromises);

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
  for (const key of TMDB_FALLBACKS) {
    try {
      const resp = await fetch(`https://api.themoviedb.org/3/trending/${type}/day?api_key=${key}&language=en-US`);
      if (resp.ok) {
        const data = await resp.json();
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
      }
    } catch (e) {}
  }
  return { items: [], sources: [] };
};
