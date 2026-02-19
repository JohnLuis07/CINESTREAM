
import React from 'react';
import { MediaItem } from '../types';

interface MovieCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ item, onClick }) => {
  return (
    <div 
      onClick={() => onClick(item)}
      className="group relative cursor-pointer overflow-hidden rounded-lg bg-neutral-900 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,0,0,0.3)]"
    >
      <div className="aspect-[2/3] w-full">
        <img 
          src={item.posterPath} 
          alt={item.title}
          className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-60"
          loading="lazy"
        />
      </div>
      
      <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-t from-black via-black/40 to-transparent">
        <h3 className="text-sm font-bold leading-tight line-clamp-2">{item.title}</h3>
        <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
          <span>{item.year}</span>
          <span className="rounded border border-neutral-700 px-1.5 py-0.5 uppercase">
            {item.type}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs text-yellow-400">
          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
          <span>{item.rating || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
