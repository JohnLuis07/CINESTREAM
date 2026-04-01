
import React, { useState, useEffect } from 'react';
import { PlayerConfig } from '../types';

interface EmbedPlayerProps {
  config: PlayerConfig;
  onClose: () => void;
}

interface TVDetails {
  seasons: { season_number: number; episode_count: number; is_year: boolean }[];
}

const EmbedPlayer: React.FC<EmbedPlayerProps> = ({ config, onClose }) => {
  const [server, setServer] = useState<'2Embed - Vpls' | 'SuperEmbed' | 'Embed.su' | 'Vidsrc.xyz'>('Vidsrc.xyz');
  const [season, setSeason] = useState(config.season || 1);
  const [episode, setEpisode] = useState(config.episode || 1);
  const [tvDetails, setTvDetails] = useState<TVDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(config.type === 'tv');
  const [error, setError] = useState<string | null>(null);

  const API_KEYS = [
    "e547e17d4e91f3e62a571655cd1ccaff",
    "15d1a681301b354e3e35b7067a929822",
    "8d6d91abc388a1161130f9063c691c8d"
  ];

  useEffect(() => {
    if (config.type === 'tv') {
      const fetchDetails = async () => {
        setIsLoadingDetails(true);
        setError(null);
        let success = false;
        const id = config.id;

        // Try TMDB first as it has the cleanest numbering for Naruto/Boruto
        for (const key of API_KEYS) {
          try {
            let tmdbId = id;
            if (id.startsWith('tt')) {
              const findResp = await fetch(`https://api.themoviedb.org/3/find/${id}?api_key=${key}&external_source=imdb_id`);
              if (findResp.ok) {
                const findData = await findResp.json();
                const tvResult = findData.tv_results?.[0];
                if (tvResult) tmdbId = tvResult.id.toString();
              }
            }

            const resp = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${key}&language=en-US`);
            if (resp.ok) {
              const data = await resp.json();
              const seasons = (data.seasons || [])
                .map((s: any) => ({
                  season_number: s.season_number,
                  episode_count: s.episode_count,
                  is_year: false
                }))
                .filter((s: any) => s.episode_count > 0 && s.season_number > 0);

              if (seasons.length > 0) {
                setTvDetails({ seasons });
                if (!seasons.find(s => s.season_number === season)) {
                  setSeason(seasons[0].season_number);
                }
                success = true;
                break;
              }
            }
          } catch (e) {}
        }

        // Fallback to TVMaze with strict normalization for anime
        if (!success) {
          try {
            const lookupUrl = id.startsWith('tt') 
              ? `https://api.tvmaze.com/lookup/shows?imdb=${id}`
              : `https://api.tvmaze.com/lookup/shows?thetvdb=${id}`;
            
            const lookupResp = await fetch(lookupUrl);
            if (lookupResp.ok) {
              const showData = await lookupResp.json();
              const seasonsResp = await fetch(`https://api.tvmaze.com/shows/${showData.id}/seasons`);
              const episodesResp = await fetch(`https://api.tvmaze.com/shows/${showData.id}/episodes`);
              
              if (seasonsResp.ok && episodesResp.ok) {
                const seasonsData = await seasonsResp.json();
                const episodesData = await episodesResp.json();
                
                let normalizedSeasons = seasonsData.map((s: any, index: number) => {
                  const isYear = s.number > 1900;
                  return {
                    season_number: isYear ? index + 1 : s.number,
                    episode_count: episodesData.filter((e: any) => e.season === s.number).length,
                    is_year: isYear
                  };
                }).filter((s: any) => s.episode_count > 0);

                if (normalizedSeasons.length > 0) {
                  setTvDetails({ seasons: normalizedSeasons });
                  setSeason(normalizedSeasons[0].season_number);
                  success = true;
                }
              }
            }
          } catch (e) {}
        }
        
        if (!success) {
          setError("Metadata Unavailable");
        }
        setIsLoadingDetails(false);
      };
      fetchDetails();
    }
  }, [config.id, config.type]);

  const currentSeasonData = tvDetails?.seasons.find(s => s.season_number === season);
  const maxEpisodes = currentSeasonData?.episode_count || 0;

  useEffect(() => {
    if (maxEpisodes > 0 && episode > maxEpisodes) {
      setEpisode(1);
    }
  }, [season, maxEpisodes]);

  const getEmbedUrl = () => {
    const id = config.id;
    // Always use the normalized season number for the player URL
    const targetSeason = season;
    
    switch (server) {
      case '2Embed - Vpls':
        return config.type === 'movie'
          ? `https://www.2embed.cc/embed/${id}`
          : `https://www.2embed.cc/embedtv/${id}&s=${targetSeason}&e=${episode}`;
      case 'SuperEmbed':
        return config.type === 'movie'
          ? `https://multiembed.mov/?video_id=${id}`
          : `https://multiembed.mov/?video_id=${id}&s=${targetSeason}&e=${episode}`;
      case 'Embed.su':
        return config.type === 'movie'
          ? `https://embed.su/embed/movie/${id}`
          : `https://embed.su/embed/tv/${id}/${targetSeason}/${episode}`;
      case 'Vidsrc.xyz':
        return config.type === 'movie'
          ? `https://vidsrc.xyz/embed/movie?imdb=${id}`
          : `https://vidsrc.xyz/embed/tv?imdb=${id}&season=${targetSeason}&episode=${episode}`;
      default:
        return `https://www.2embed.cc/embed/${id}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-6xl flex flex-col h-[90vh] bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative">
        
        <div className="flex flex-col md:flex-row items-center justify-between p-5 bg-black/40 border-b border-white/5 gap-4 z-20">
          <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-hide w-full md:w-auto">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] whitespace-nowrap flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              SOURCES
            </span>
            {(['2Embed - Vpls', 'SuperEmbed', 'Embed.su', 'Vidsrc.xyz'] as const).map((s) => (
              <button 
                key={s}
                onClick={() => setServer(s)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${server === s ? 'bg-red-600 text-white shadow-lg' : 'bg-white/5 text-neutral-400 hover:text-white'}`}
              >
                {s}
              </button>
            ))}
          </div>

          {config.type === 'tv' && !isLoadingDetails && tvDetails && (
            <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 px-3">
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-tighter">Season</span>
                <select 
                  value={season}
                  onChange={(e) => setSeason(parseInt(e.target.value))}
                  className="bg-transparent text-white font-black text-sm focus:outline-none cursor-pointer outline-none"
                >
                  {tvDetails.seasons.map(s => (
                    <option key={s.season_number} value={s.season_number} className="bg-neutral-900 text-white">
                      {s.season_number}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-px h-4 bg-white/10"></div>
              <div className="flex items-center gap-2 px-3">
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-tighter">Episode</span>
                <select 
                  value={episode}
                  onChange={(e) => setEpisode(parseInt(e.target.value))}
                  className="bg-transparent text-white font-black text-sm focus:outline-none cursor-pointer outline-none"
                >
                  {Array.from({length: maxEpisodes}, (_, i) => (
                    <option key={i + 1} value={i + 1} className="bg-neutral-900 text-white">
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {isLoadingDetails && config.type === 'tv' && (
            <div className="flex items-center gap-2 text-neutral-500 animate-pulse">
              <div className="w-4 h-4 border-2 border-neutral-700 border-t-red-600 rounded-full animate-spin"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Syncing Series...</span>
            </div>
          )}
          
          <button onClick={onClose} className="p-2.5 text-white bg-white/5 hover:bg-red-600 rounded-full transition-all border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex-1 relative bg-black">
          {error && config.type === 'tv' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm text-center p-10">
              <div className="max-w-xs">
                <h3 className="text-xl font-black text-white mb-2 uppercase italic">Sync Offline</h3>
                <p className="text-neutral-500 text-xs mb-6">Could not verify the official episode list. Try manual mode below.</p>
                <button 
                  onClick={() => {setError(null); setTvDetails({ seasons: Array.from({length: 25}, (_, i) => ({season_number: i+1, episode_count: 100, is_year: false})) })}}
                  className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Enable Manual Mode
                </button>
              </div>
            </div>
          )}
          <iframe
            src={getEmbedUrl()}
            className="absolute inset-0 w-full h-full border-none"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            title="Video Player"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="p-4 bg-black/60 text-[10px] text-center text-neutral-500 uppercase tracking-[0.25em] font-black">
          Anime Correction Index • 2Embed - Vpls Default • Metadata Verified
        </div>
      </div>
      
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
    </div>
  );
};

export default EmbedPlayer;
