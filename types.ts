
export type ContentType = 'movie' | 'tv';

export interface MediaItem {
  id: string; // Numeric TMDB ID or IMDb ID prefixed with tt
  title: string;
  type: ContentType;
  overview: string;
  posterPath: string;
  backdropPath: string;
  year: string;
  rating?: string;
}

export interface PlayerConfig {
  title?: string;
  id: string;
  type: ContentType;
  season?: number;
  episode?: number;
}
