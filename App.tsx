
import React, { useState, useEffect } from 'react';
import { MediaItem, PlayerConfig } from './types';
import { getTrendingMedia, searchMediaWithAI } from './services/geminiService';
import MovieCard from './components/MovieCard';
import EmbedPlayer from './components/EmbedPlayer';

const App: React.FC = () => {
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePlayer, setActivePlayer] = useState<PlayerConfig | null>(null);
  const [featured, setFeatured] = useState<MediaItem | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'movie' | 'tv'>('all');

  const fetchTrending = async (mode: 'all' | 'movie' | 'tv') => {
    setIsSearching(true);
    setError(null);
    try {
      const result = await getTrendingMedia(mode);
      setTrending(result.items);
      if (result.items.length > 0) {
        setFeatured(result.items[0]);
      }
      setSearchResults([]); 
    } catch (err) {
      setError("Failed to load content.");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchTrending('all');
  }, []);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    setSearchQuery(query);
    setIsSearching(true);
    setError(null);
    try {
      const result = await searchMediaWithAI(query);
      setSearchResults(result.items);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError("Search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const switchViewMode = (mode: 'all' | 'movie' | 'tv') => {
    setViewMode(mode);
    fetchTrending(mode);
  };

  const openPlayer = (item: MediaItem) => {
    setActivePlayer({
      id: item.id,
      type: item.type
    });
  };

  const getGridTitle = () => {
    if (searchResults.length > 0) return `RESULTS FOR "${searchQuery}"`;
    if (viewMode === 'movie') return "TRENDING MOVIES";
    if (viewMode === 'tv') return "TRENDING SERIES";
    return "GLOBAL TRENDING";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Top Nav - Restored to full width desktop design */}
      <nav className="fixed top-0 z-40 w-full bg-black/60 backdrop-blur-xl border-b border-white/5 px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center justify-between w-full md:w-auto gap-2">
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => switchViewMode('all')}>
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-xl italic shadow-[0_0_15px_rgba(220,38,38,0.5)]">C</div>
            <h1 className="text-lg md:text-xl font-bold tracking-tighter text-white uppercase italic">CINESTREAM <span className="text-red-600 font-black not-italic text-[10px] md:text-xs ml-1 tracking-widest opacity-80">by Luis</span></h1>
          </div>
          
          <div className="flex md:hidden items-center gap-4 text-[10px] font-black uppercase tracking-tighter">
            <button 
              onClick={() => switchViewMode('movie')} 
              className={`transition-colors ${viewMode === 'movie' ? 'text-red-600' : 'text-neutral-400 hover:text-white'}`}
            >
              Movies
            </button>
            <button 
              onClick={() => switchViewMode('tv')} 
              className={`transition-colors ${viewMode === 'tv' ? 'text-red-600' : 'text-neutral-400 hover:text-white'}`}
            >
              TV
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md order-last md:order-none">
          <input 
            type="text" 
            placeholder="Search our database..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full px-5 py-2 md:py-2.5 pl-11 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition-all text-white placeholder:text-neutral-500"
          />
          <div className="absolute left-4 top-2.5 md:top-3 text-neutral-500">
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
        </form>

        <div className="hidden md:flex items-center gap-6 text-sm font-bold uppercase tracking-tighter">
          <button 
            onClick={() => switchViewMode('movie')} 
            className={`transition-colors ${viewMode === 'movie' ? 'text-red-600' : 'text-neutral-400 hover:text-white'}`}
          >
            Movies
          </button>
          <button 
            onClick={() => switchViewMode('tv')} 
            className={`transition-colors ${viewMode === 'tv' ? 'text-red-600' : 'text-neutral-400 hover:text-white'}`}
          >
            TV Shows
          </button>
        </div>
      </nav>

      {/* Hero Section - Restored to large desktop format */}
      {featured && !searchResults.length && (
        <section className="relative h-[60vh] md:h-[85vh] w-full overflow-hidden">
          <img 
            src={featured.backdropPath} 
            alt={featured.title} 
            className="w-full h-full object-cover scale-105"
            style={{ filter: 'brightness(0.4) saturate(1.2)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/40"></div>
          
          <div className="absolute bottom-10 md:bottom-32 left-6 md:left-12 max-w-[90%] md:max-w-3xl animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <span className="bg-red-600/20 text-red-500 border border-red-600/30 px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest">Global Top Chart</span>
              <span className="text-neutral-300 font-bold text-xs md:text-sm">{featured.year}</span>
              <span className="text-neutral-300 font-bold px-1.5 md:px-2 py-0.5 border border-white/20 rounded uppercase text-[8px] md:text-[10px]">{featured.type}</span>
            </div>
            <h2 className="text-4xl md:text-8xl font-black mb-4 md:mb-6 tracking-tight leading-[1] md:leading-[0.9] text-white italic uppercase">{featured.title}</h2>
            <p className="text-neutral-400 text-sm md:text-xl mb-6 md:mb-10 line-clamp-3 leading-relaxed max-w-2xl font-medium">{featured.overview}</p>
            
            <button 
              onClick={() => openPlayer(featured)}
              className="flex items-center gap-2 md:gap-3 bg-red-600 text-white px-8 md:px-12 py-3 md:py-4 rounded-xl font-black hover:bg-red-700 transition-all hover:scale-105 shadow-xl shadow-red-900/20 text-sm md:text-base"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              WATCH NOW
            </button>
          </div>
        </section>
      )}

      {/* Main Grid - Adjusted spacing to avoid fixed nav overlap */}
      <main className="px-6 md:px-12 mt-32 md:mt-24">
        <section>
          <div className="flex items-end justify-between mb-6 md:mb-10 border-b border-white/5 pb-4 md:pb-6">
            <div>
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <span className="w-1 md:w-1.5 h-5 md:h-6 bg-red-600 rounded-full"></span>
                <h3 className="text-xl md:text-3xl font-black italic tracking-tighter uppercase leading-tight">{searchResults.length > 0 ? 'Direct Matches' : 'Official Charts'}</h3>
              </div>
              <p className="text-neutral-500 text-[10px] md:text-sm font-bold uppercase tracking-widest break-words leading-relaxed">
                {getGridTitle()}
              </p>
            </div>
            {searchResults.length > 0 && (
              <button 
                onClick={() => setSearchResults([])}
                className="text-[8px] md:text-[10px] font-black text-neutral-500 hover:text-red-600 transition-colors uppercase tracking-[0.2em]"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-8">
            {(searchResults.length > 0 ? searchResults : trending).map(item => (
              <MovieCard key={item.id} item={item} onClick={openPlayer} />
            ))}
          </div>
        </section>

        {/* Discovery Section - Restored full box design */}
        {!searchResults.length && viewMode === 'all' && (
          <section className="mt-16 md:mt-32 relative overflow-hidden bg-gradient-to-br from-red-900/20 via-neutral-900 to-black rounded-3xl md:rounded-[2.5rem] p-8 md:p-20 border border-white/10 shadow-2xl">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-7xl font-black text-white mb-6 md:mb-8 leading-tight tracking-tighter uppercase italic">Genre <br className="hidden md:block"/> Discovery</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {['Action', 'Sci-Fi', 'Horror', '90s Hits'].map(tag => (
                  <button 
                    key={tag}
                    onClick={() => performSearch(tag)}
                    className="bg-white/5 hover:bg-red-600 text-left px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-black border border-white/10 transition-all group flex items-center justify-between"
                  >
                    {tag}
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Player Modal */}
      {activePlayer && (
        <EmbedPlayer 
          config={activePlayer} 
          onClose={() => setActivePlayer(null)} 
        />
      )}

      {/* Footer */}
      <footer className="mt-20 md:mt-40 px-6 py-12 md:py-20 border-t border-white/5 text-neutral-500 text-center bg-black/40">
        <div className="max-w-4xl mx-auto grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
          <div className="flex items-center justify-center gap-2 mb-4 md:mb-6 font-black italic tracking-tighter text-white text-lg md:text-xl">
            <div className="w-5 h-5 md:w-6 md:h-6 bg-red-600 rounded flex items-center justify-center text-[10px] md:text-xs not-italic">C</div>
            CINESTREAM <span className="text-[8px] md:text-[10px] uppercase opacity-60">by Luis</span>
          </div>
          <p className="text-[8px] md:text-[10px] font-black tracking-[0.3em] uppercase">&copy; 2026 Powered by official database indices</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
