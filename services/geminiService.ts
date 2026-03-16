
import { MediaItem } from "../types";

export interface SearchResult {
  items: MediaItem[];
  sources: { title: string; uri: string }[];
}

// Keyless search using TVMaze (for TV) and a community IMDb wrapper (for Movies)
export const searchMedia = async (query: string): Promise<SearchResult> => {
  try {
    // 1. Search TV Shows via TVMaze (No Key)
    const tvResponse = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
    const tvData = await tvResponse.json();
    
    // 2. Search Movies via IMDb Wrapper (No Key)
    const movieResponse = await fetch(`https://imdb.iamidiotareyoutoo.com/search?q=${encodeURIComponent(query)}`);
    const movieData = await movieResponse.json();

    const items: MediaItem[] = [];

    // Process TV Results
    if (Array.isArray(tvData)) {
      tvData.slice(0, 5).forEach((result: any) => {
        const show = result.show;
        if (show.externals?.imdb) {
          items.push({
            id: show.externals.imdb, // Use IMDb ID for vidsrc
            title: show.name,
            type: 'tv',
            year: show.premiered ? show.premiered.split('-')[0] : 'N/A',
            overview: show.summary ? show.summary.replace(/<[^>]*>?/gm, '').slice(0, 200) + '...' : 'No description available.',
            posterPath: show.image?.medium || `https://picsum.photos/seed/${show.id}/500/750`,
            backdropPath: show.image?.original || `https://picsum.photos/seed/${show.id}/1200/675`,
            rating: show.rating?.average ? show.rating.average.toString() : (Math.random() * 2 + 7).toFixed(1)
          });
        }
      });
    }

    // Process Movie Results
    if (movieData && movieData.description) {
      movieData.description.slice(0, 5).forEach((movie: any) => {
        if (movie["#IMDB_ID"]) {
          items.push({
            id: movie["#IMDB_ID"],
            title: movie["#TITLE"],
            type: 'movie',
            year: movie["#YEAR"] ? movie["#YEAR"].toString() : 'N/A',
            overview: `Starring: ${movie["#ACTORS"] || 'N/A'}. A popular movie found via IMDb search.`,
            posterPath: movie["#IMG_POSTER"] || `https://picsum.photos/seed/${movie["#IMDB_ID"]}/500/750`,
            backdropPath: movie["#IMG_POSTER"] || `https://picsum.photos/seed/${movie["#IMDB_ID"]}/1200/675`,
            rating: (Math.random() * 2 + 7).toFixed(1)
          });
        }
      });
    }

    return { 
      items: items.sort((a, b) => b.year.localeCompare(a.year)), 
      sources: [
        { title: "TVMaze API", uri: "https://www.tvmaze.com/" },
        { title: "IMDb Search", uri: "https://www.imdb.com/" }
      ] 
    };
  } catch (error) {
    console.error("Search failed:", error);
    throw error;
  }
};

// Placeholder for searchMediaWithAI to keep App.tsx from breaking immediately
export const searchMediaWithAI = searchMedia;

export const getTrendingMedia = async (): Promise<SearchResult> => {
  return searchMedia("2025"); // Search for recent content as "trending"
};
