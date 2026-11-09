import React from 'react';
import { MediaItem } from '../types';
interface MovieCardProps { item: MediaItem; onClick: (item: MediaItem) => void; }
const MovieCard: React.FC<MovieCardProps> = ({ item, onClick }) => <button className="movie-card" onClick={() => onClick(item)} aria-label={`Watch ${item.title}`}>
  <div className="poster-wrap"><img src={item.posterPath} alt="" loading="lazy" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.svg'; }} /><span className="media-badge">{item.type === 'tv' ? 'SERIES' : 'MOVIE'}</span><div className="poster-overlay"><span className="card-play">▶</span><span>Watch now</span></div></div>
  <h3>{item.title}</h3><div className="card-meta"><span>{item.year} <span className="meta-dot">•</span> {item.type === 'tv' ? 'TV Show' : 'Movie'}</span>{item.rating && item.rating !== 'N/A' && <span className="card-rating">★ {item.rating}</span>}</div>
</button>;
export default MovieCard;
