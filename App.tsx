
import React, { useState, useEffect } from 'react';
import { MediaItem, PlayerConfig } from './types';
import { getTrendingMedia, searchMediaWithAI, SearchResult } from './services/geminiService';
import MovieCard from './components/MovieCard';
import EmbedPlayer from './components/EmbedPlayer';

const App: React.FC = () => {
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [groundingSources, setGroundingSources] = useState<{ title: string; uri: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePlayer, setActivePlayer] = useState<PlayerConfig | null>(null);
  const [featured, setFeatured] = useState<MediaItem | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const result = await getTrendingMedia();
        setTrending(result.items);
        if (result.items.length > 0) {
          setFeatured(result.items[0]);
        }
      } catch (err) {
        setError("Failed to load trending content. Please check your connection or API key.");
      }
    };
    fetchInitialData();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      const result = await searchMediaWithAI(searchQuery);
      setSearchResults(result.items);
      setGroundingSources(result.sources);
    } catch (err) {
      setError("AI Search failed. Please try again or refine your query.");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const openPlayer = (item: MediaItem) => {
    setActivePlayer({
      id: item.id,
      type: item.type
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Top Nav */}
      <nav className="fixed top-0 z-40 w-full bg-black/60 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-xl italic shadow-[0_0_15px_rgba(220,38,38,0.5)]">C</div>
          <h1 className="text-xl font-bold tracking-tighter text-white">CINESTREAM <span className="text-red-600">AI</span></h1>
        </div>
        
        <form onSubmit={handleSearch} className="relative w-full max-w-md hidden md:block">
          <input 
            type="text" 
            placeholder="Describe what you want to watch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full px-5 py-2.5 pl-12 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition-all text-white placeholder:text-neutral-500"
          />
          <div className="absolute left-4 top-3 text-neutral-500">
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
        </form>

        <div className="flex items-center gap-4 text-sm font-semibold">
          <button className="text-neutral-400 hover:text-white transition-colors">Movies</button>
          <button className="text-neutral-400 hover:text-white transition-colors">TV Shows</button>
        </div>
      </nav>

      {/* Hero Section */}
      {featured && !searchResults.length && (
        <section className="relative h-[85vh] w-full overflow-hidden">
          <img 
            src={featured.backdropPath} 
            alt={featured.title} 
            className="w-full h-full object-cover scale-105"
            style={{ filter: 'brightness(0.4) saturate(1.2)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/40"></div>
          
          <div className="absolute bottom-32 left-6 md:left-12 max-w-3xl animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="flex items-center gap-3 mb-6">
              <span className="bg-red-600/20 text-red-500 border border-red-600/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Trending Choice</span>
              <span className="text-neutral-300 font-medium">{featured.year}</span>
              <span className="text-neutral-300 font-medium px-2 py-0.5 border border-white/20 rounded uppercase text-xs">{featured.type}</span>
            </div>
            <h2 className="text-6xl md:text-8xl font-black mb-6 tracking-tight leading-[0.9] text-white italic">{featured.title}</h2>
            <p className="text-neutral-400 text-lg md:text-xl mb-10 line-clamp-3 leading-relaxed max-w-2xl font-medium">{featured.overview}</p>
            
            <div className="flex items-center gap-5">
              <button 
                onClick={() => openPlayer(featured)}
                className="flex items-center gap-3 bg-red-600 text-white px-10 py-4 rounded-xl font-black hover:bg-red-700 transition-all hover:scale-105 shadow-xl shadow-red-900/20"
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                WATCH NOW
              </button>
              <button className="flex items-center gap-3 bg-white/10 text-white px-10 py-4 rounded-xl font-bold hover:bg-white/20 transition-all backdrop-blur-md border border-white/10">
                MY LIST
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-6 md:mx-12 mt-24 p-4 bg-red-900/20 border border-red-900/40 rounded-xl text-red-500 flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <main className="px-6 md:px-12 mt-12">
        {/* Search Results Content */}
        {(isSearching || searchResults.length > 0) && (
          <div className="mb-20 animate-in fade-in duration-500">
            <div className="flex items-end justify-between mb-8 pb-4 border-b border-white/5">
              <div>
                <h3 className="text-3xl font-black italic tracking-tight">AI MATCHES</h3>
                <p className="text-neutral-500 text-sm">Showing results for "{searchQuery}"</p>
              </div>
              <button onClick={() => {setSearchResults([]); setGroundingSources([]);}} className="text-xs font-bold text-neutral-500 hover:text-red-500 transition-colors uppercase tracking-widest">Clear results</button>
            </div>

            {isSearching ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-[2/3] bg-white/5 animate-pulse rounded-2xl"></div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {searchResults.map(item => (
                    <MovieCard key={item.id} item={item} onClick={openPlayer} />
                  ))}
                </div>
                
                {/* Search Grounding Sources */}
                {groundingSources.length > 0 && (
                  <div className="mt-10 p-6 bg-white/5 rounded-2xl border border-white/10">
                    <h4 className="text-sm font-bold text-neutral-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                      Verified Sources
                    </h4>
                    <div className="flex flex-wrap gap-4">
                      {groundingSources.map((source, idx) => (
                        <a 
                          key={idx} 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-neutral-500 hover:text-white transition-colors flex items-center gap-1 bg-black/40 px-3 py-1.5 rounded-full border border-white/5"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          {source.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Regular Content */}
        {!searchResults.length && (
          <div className="space-y-16">
            <section>
              <h3 className="text-2xl font-black italic mb-8 tracking-tight flex items-center gap-3">
                <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
                TRENDING NOW
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {trending.map(item => (
                  <MovieCard key={item.id} item={item} onClick={openPlayer} />
                ))}
              </div>
            </section>

            {/* AI Recommendation Box */}
            <section className="relative overflow-hidden bg-gradient-to-br from-red-900/20 via-neutral-900 to-black rounded-[2rem] p-10 md:p-16 border border-white/10 shadow-2xl">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-600/10 blur-[100px] rounded-full"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1">
                  <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tighter">AI-POWERED <br/> DISCOVERY</h2>
                  <p className="text-neutral-400 text-lg mb-8 max-w-lg leading-relaxed font-medium">CineStream uses Gemini to understand complex moods and niche requests. Find the perfect movie by simply describing it.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Moody sci-fi like Blade Runner', 'Uplifting true stories', 'Neon-lit cyberpunk action', 'Slow burn mystery'].map(tag => (
                      <button 
                        key={tag}
                        onClick={() => {setSearchQuery(tag); handleSearch(new Event('submit') as any);}}
                        className="bg-white/5 hover:bg-white/10 text-left px-5 py-3 rounded-xl text-sm font-semibold border border-white/10 transition-all flex items-center gap-3 group"
                      >
                        <span className="w-2 h-2 rounded-full bg-red-600 group-hover:scale-125 transition-transform"></span>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="w-full max-w-md">
                   <div className="p-1.5 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                      <form onSubmit={handleSearch} className="relative">
                        <input 
                          type="text" 
                          placeholder="Try: '90s thriller with a twist'..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-black/60 border-none rounded-2xl px-6 py-5 text-lg focus:outline-none transition-all placeholder:text-neutral-600 font-bold"
                        />
                        <button type="submit" className="absolute right-3 top-3 bg-red-600 p-3 rounded-xl hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/30">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </button>
                      </form>
                   </div>
                </div>
              </div>
            </section>
          </div>
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
      <footer className="mt-32 px-6 py-16 border-t border-white/5 text-neutral-500 text-sm text-center bg-black/40">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-8 grayscale opacity-50">
            <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center font-bold text-xs italic">C</div>
            <h1 className="text-lg font-bold tracking-tighter text-white">CINESTREAM AI</h1>
          </div>
          <p className="mb-6 leading-relaxed max-w-xl mx-auto">Discover and stream with ease. We leverage Gemini for semantic search and AutoEmbed for reliable content delivery.</p>
          <div className="flex justify-center gap-8 mb-10 font-bold text-xs uppercase tracking-[0.2em]">
            <a href="#" className="hover:text-red-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-red-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-red-600 transition-colors">API Docs</a>
          </div>
          <p className="text-[10px] text-neutral-700 font-bold tracking-widest uppercase">&copy; 2025 CineStream AI. Not affiliated with TMDB.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
