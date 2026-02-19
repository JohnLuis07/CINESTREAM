
import React, { useState } from 'react';
import { PlayerConfig } from '../types';

interface EmbedPlayerProps {
  config: PlayerConfig;
  onClose: () => void;
}

const EmbedPlayer: React.FC<EmbedPlayerProps> = ({ config, onClose }) => {
  const [server, setServer] = useState<'AutoEmbed' | 'VidSrc' | '2Embed'>('AutoEmbed');

  const getEmbedUrl = () => {
    const id = config.id;
    const season = config.season || 1;
    const episode = config.episode || 1;

    switch (server) {
      case 'AutoEmbed':
        return config.type === 'movie' 
          ? `https://autoembed.cc/embed/movie/${id}` 
          : `https://autoembed.cc/embed/tv/${id}/${season}/${episode}`;
      case 'VidSrc':
        return config.type === 'movie'
          ? `https://vidsrc.me/embed/movie?tmdb=${id}`
          : `https://vidsrc.me/embed/tv?tmdb=${id}&sea=${season}&epi=${episode}`;
      case '2Embed':
        return config.type === 'movie'
          ? `https://www.2embed.cc/embed/${id}`
          : `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`;
      default:
        return `https://autoembed.cc/embed/movie/${id}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-6xl flex flex-col h-[90vh] bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        {/* Controls Bar */}
        <div className="flex items-center justify-between p-4 bg-black/40 border-b border-white/5">
          <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-hide">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest whitespace-nowrap">Source:</span>
            {(['AutoEmbed', 'VidSrc', '2Embed'] as const).map((s) => (
              <button 
                key={s}
                onClick={() => setServer(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${server === s ? 'bg-red-600 text-white shadow-lg' : 'bg-white/5 text-neutral-400 hover:text-white'}`}
              >
                {s}
              </button>
            ))}
          </div>
          
          <button 
            onClick={onClose}
            className="ml-4 p-2 text-white bg-red-600/20 hover:bg-red-600 rounded-full transition-all group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Iframe Container */}
        <div className="flex-1 relative bg-black">
          <iframe
            src={getEmbedUrl()}
            className="absolute inset-0 w-full h-full border-none"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            title="Video Player"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Footer info */}
        <div className="p-3 bg-black/60 text-[10px] text-center text-neutral-500 uppercase tracking-widest font-bold">
          If content is missing or shows 404, try switching sources above.
        </div>
      </div>
      
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
    </div>
  );
};

export default EmbedPlayer;
