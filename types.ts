
export type ContentType = 'movie' | 'tv';

export interface MediaItem {
  id: string; // TMDB ID
  title: string;
  type: ContentType;
  overview: string;
  posterPath: string;
  backdropPath: string;
  year: string;
  rating?: string;
}

export interface PlayerConfig {
  id: string;
  type: ContentType;
  season?: number;
  episode?: number;
}
