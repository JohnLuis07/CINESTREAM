import React, { useEffect, useRef, useState } from 'react';
import { MediaItem, PlayerConfig } from './types';
import { getTrendingMedia, searchMediaWithAI } from './services/geminiService';
import MovieCard from './components/MovieCard';
import EmbedPlayer from './components/EmbedPlayer';
import './styles.css';

type View = 'all' | 'movie' | 'tv';
const sections: { id: View; label: string }[] = [{ id: 'all', label: 'Discover' }, { id: 'movie', label: 'Movies' }, { id: 'tv', label: 'TV Shows' }];
const App: React.FC = () => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [view, setView] = useState<View>('all');
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activePlayer, setActivePlayer] = useState<PlayerConfig | null>(null);
  const [retry, setRetry] = useState(0);
  const request = useRef(0);

  useEffect(() => {
    const current = ++request.current;
    setLoading(true); setError(null); setNotice(null); setItems([]);
    const task = submitted ? searchMediaWithAI(submitted, view) : getTrendingMedia(view);
    task.then(result => {
      if (current !== request.current) return;
      setItems(result.items.filter(item => view === 'all' || item.type === view));
      setNotice(result.notice || null);
    }).catch(err => {
      if (current === request.current) setError(err instanceof Error ? err.message : 'Unable to load titles. Please try again.');
    }).finally(() => { if (current === request.current) setLoading(false); });
    return () => { ++request.current; };
  }, [view, submitted, retry]);

  const openPlayer = (item: MediaItem) => setActivePlayer({ id: item.id, type: item.type, title: item.title });
  const featured = !submitted ? items[0] : null;
  const selectView = (next: View) => { setView(next); };
  const title = submitted ? `Results for “${submitted}”` : view === 'movie' ? 'Movies worth your evening' : view === 'tv' ? 'Your next binge starts here' : 'Find your next obsession';

  return <div className="app-shell">
    <header className="site-header">
      <button className="brand" aria-label="CineStream home" onClick={() => { setView('all'); setSubmitted(''); setQuery(''); }}><span className="brand-icon">C<span /></span><span>CINE<span className="brand-light">STREAM</span><small>CURATED BY LUIS</small></span></button>
      <nav className="main-nav" aria-label="Browse catalog">{sections.map(section => <button key={section.id} aria-current={view === section.id ? 'page' : undefined} className={view === section.id ? 'active' : ''} onClick={() => selectView(section.id)}>{section.label}</button>)}</nav>
      <form className="search-form" role="search" onSubmit={e => { e.preventDefault(); setSubmitted(query.trim()); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
        <input aria-label="Search titles" placeholder={view === 'movie' ? 'Search movies…' : view === 'tv' ? 'Search TV shows…' : 'Search movies, shows…'} value={query} onChange={e => setQuery(e.target.value)} />
        {query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); setSubmitted(''); }}>×</button>}
        <button type="submit" className="search-submit" aria-label="Submit search">↵</button>
      </form>
    </header>

    {featured && <section className="hero" aria-label="Featured title">
      <img className="hero-image" src={featured.backdropPath} alt="" onError={e => { e.currentTarget.src = '/placeholder.svg'; }} />
      <div className="hero-shade" />
      <div className="hero-content"><div className="eyebrow"><span className="live-dot" /> THE SPOTLIGHT <span className="eyebrow-line" /></div>
        <div className="hero-meta"><span>{featured.type === 'tv' ? 'TV SERIES' : 'FEATURE FILM'}</span><span>{featured.year}</span>{featured.rating && featured.rating !== 'N/A' && <span className="rating">★ {featured.rating}</span>}</div>
        <h1>{featured.title}</h1><p>{featured.overview || 'A new story to get lost in. Discover this title and start watching.'}</p>
        <div className="hero-actions"><button className="primary-button" onClick={() => openPlayer(featured)}><span>▶</span> Watch now</button><a className="secondary-button" href="#catalog">Explore the collection <span>↓</span></a></div>
      </div><div className="hero-caption"><span>HANDPICKED STORIES. ENDLESS POSSIBILITIES.</span><span>01 / SPOTLIGHT</span></div>
    </section>}

    <main id="catalog" className={`catalog ${!featured ? 'without-hero' : ''}`}>
      <div className="catalog-heading"><div><div className="eyebrow">{submitted ? 'THE SEARCH IS ON' : 'YOUR FRONT ROW SEAT'}</div><h2>{title}</h2><p>{submitted ? `Searching ${view === 'all' ? 'movies and TV shows' : view === 'movie' ? 'movies only' : 'TV shows only'}.` : 'Great stories, one play away. What are you in the mood for?'}</p></div><span className="collection-label">{loading ? 'Finding stories…' : `${items.length} titles to explore`}</span></div>
      <div className="catalog-toolbar"><div className="filter-pills" aria-label="Filter by content type">{sections.map(section => <button key={section.id} aria-pressed={view === section.id} className={view === section.id ? 'selected' : ''} onClick={() => selectView(section.id)}>{section.id === 'all' ? 'All titles' : section.label}</button>)}</div>{submitted ? <button className="text-button" onClick={() => { setSubmitted(''); setQuery(''); }}>Clear results ×</button> : <span className="trending-label"><span className="live-dot" /> Trending today</span>}</div>
      {notice && <div className="notice" role="status">{notice}</div>}
      {error && <div className="empty-state" role="alert"><h3>Let’s try that again</h3><p>{error}</p><button className="primary-button" onClick={() => setRetry(n => n + 1)}>Retry</button></div>}
      {loading ? <div className="poster-grid" role="status" aria-label="Loading titles">{Array.from({ length: 12 }, (_, i) => <div key={i} className="skeleton-card"><div /><span /><span /></div>)}</div> : !error && items.length === 0 ? <div className="empty-state"><span className="empty-icon">⌕</span><h3>No titles found</h3><p>Try another title or choose a different category.</p><button className="secondary-button" onClick={() => { setQuery(''); setSubmitted(''); }}>Back to browsing</button></div> : <div className="poster-grid">{items.map(item => <MovieCard key={`${item.type}:${item.id}`} item={item} onClick={openPlayer} />)}</div>}
      {!submitted && !loading && !error && <section className="discovery-banner"><div><div className="eyebrow">THE PERFECT NIGHT IN</div><h2>Less scrolling.<br />More storytelling.</h2><p>From the big screen to your next favorite series.</p></div><div className="discovery-actions"><button onClick={() => selectView('movie')}>Explore movies <span>↗</span></button><button onClick={() => selectView('tv')}>Discover TV shows <span>↗</span></button></div></section>}
    </main>
    <footer className="site-footer"><div className="footer-wordmark">CINESTREAM <span>by Luis</span></div><p>A world of stories, all in one place.</p><div>© 2026 CineStream <span>Data by TMDB, OMDb & <a href="https://www.tvmaze.com">TVmaze</a></span></div></footer>
    {activePlayer && <EmbedPlayer config={activePlayer} onClose={() => setActivePlayer(null)} />}
  </div>;
};
export default App;
