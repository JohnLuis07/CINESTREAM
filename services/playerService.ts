import { PlayerConfig } from '../types';

export const PLAYER_SERVERS = ['Vidsrc.to', 'VidLink', '2Embed', 'Vsrc', 'SuperEmbed', 'Embed.su'] as const;
export type PlayerServer = typeof PLAYER_SERVERS[number];

export const supportsPlayer = (server: PlayerServer, id: string): boolean => {
  // VidLink documents TMDB IDs only. Catalog results may also use IMDb IDs.
  return server !== 'VidLink' || /^\d+$/.test(id);
};

export const getPlayerUrl = (server: PlayerServer, config: PlayerConfig): string => {
  if (!/^(?:\d+|tt\d+)$/.test(config.id)) throw new Error('Invalid movie or TV identifier.');
  if (!supportsPlayer(server, config.id)) throw new Error('This player requires a TMDB ID. Choose another source.');
  const { id, type } = config;
  const season = config.season ?? 1;
  const episode = config.episode ?? 1;
  if (type === 'tv' && (!Number.isInteger(season) || season < 1 || !Number.isInteger(episode) || episode < 1)) {
    throw new Error('Season and episode must be positive integers.');
  }
  const isTMDB = /^\d+$/.test(id);
  switch (server) {
    case 'VidLink':
      return type === 'movie'
        ? `https://vidlink.pro/movie/${id}`
        : `https://vidlink.pro/tv/${id}/${season}/${episode}`;
    case 'Vsrc':
      return type === 'movie'
        ? `https://vidsrc.xyz/embed/movie?${isTMDB ? 'tmdb' : 'imdb'}=${id}`
        : `https://vidsrc.xyz/embed/tv?${isTMDB ? 'tmdb' : 'imdb'}=${id}&season=${season}&episode=${episode}`;
    case '2Embed':
      return type === 'movie'
        ? `https://www.2embed.cc/embed/${id}`
        : `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`;
    case 'SuperEmbed':
      return `https://multiembed.mov/?video_id=${id}${isTMDB ? '&tmdb=1' : ''}${type === 'tv' ? `&s=${season}&e=${episode}` : ''}`;
    case 'Embed.su':
      return type === 'movie'
        ? `https://embed.su/embed/movie/${id}`
        : `https://embed.su/embed/tv/${id}/${season}/${episode}`;
    case 'Vidsrc.to':
      return type === 'movie'
        ? `https://vidsrc.to/embed/movie/${id}`
        : `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`;
  }
};
