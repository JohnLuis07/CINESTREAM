import React, { useEffect, useRef, useState } from 'react';
import { PlayerConfig } from '../types';
import { PLAYER_SERVERS, PlayerServer, getPlayerUrl, supportsPlayer } from '../services/playerService';
import { Episode, ShowDetails, hasAired, loadEpisodes, loadShow } from '../services/episodeService';
interface EmbedPlayerProps { config: PlayerConfig; onClose: () => void; }
const EmbedPlayer: React.FC<EmbedPlayerProps> = ({ config, onClose }) => {
  const [server, setServer] = useState<PlayerServer>('Vidsrc.to');
  const [show, setShow] = useState<ShowDetails | null>(null);
  const [season, setSeason] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episode, setEpisode] = useState<number | null>(null);
  const [loading, setLoading] = useState(config.type === 'tv');
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const isTV = config.type === 'tv';

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; close.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const elements = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),iframe') || []);
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setShow(null); setSeason(null); setEpisodes([]); setEpisode(null); setError(null);
    if (!isTV) { setLoading(false); return; }
    setLoading(true);
    loadShow(config.id).then(data => {
      if (cancelled) return;
      setShow(data);
      setSeason(data.seasons.find(s => s.number === config.season)?.number ?? data.seasons[0].number);
    }).catch(err => { if (!cancelled) setError(err.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [config.id, config.type, config.season, retry]);

  useEffect(() => {
    if (!show || season === null) return;
    let cancelled = false;
    setLoadingEpisodes(true); setEpisodes([]); setEpisode(null); setError(null);
    loadEpisodes(show, season).then(data => {
      if (cancelled) return;
      setEpisodes(data);
      const available = data.filter(hasAired);
      setEpisode(available.find(e => season === config.season && e.number === config.episode)?.number ?? available[0]?.number ?? null);
    }).catch(err => { if (!cancelled) setError(err.message); }).finally(() => { if (!cancelled) setLoadingEpisodes(false); });
    return () => { cancelled = true; };
  }, [show, season]);

  const playbackId = show?.source === 'TMDB' ? show.id : config.id;
  const selectedServer = supportsPlayer(server, playbackId) ? server : 'Vidsrc.to';
  const selected = episodes.find(e => e.number === episode);
  const available = episodes.filter(hasAired);
  const index = available.findIndex(e => e.number === episode);
  const embedUrl = !isTV || (season !== null && episode !== null && !loading && !loadingEpisodes && !error) ? getPlayerUrl(selectedServer, { ...config, id: playbackId, season: season ?? 1, episode: episode ?? 1 }) : null;
  const title = config.title || show?.name || (isTV ? 'TV show' : 'Movie');

  return <div className="player-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="player-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="player-title">
      <header className="player-header"><div><div className="eyebrow"><span className="live-dot" /> CINESTREAM THEATER</div><h2 id="player-title">{title}</h2></div><button ref={close} onClick={onClose} className="player-close" aria-label="Close player">×</button></header>
      <div className={`player-body ${isTV ? 'with-episodes' : ''}`}>
        <div className="player-main"><div className="video-stage">{embedUrl ? <iframe key={embedUrl} src={embedUrl} allowFullScreen allow="autoplay; encrypted-media; picture-in-picture" title={`${title}${isTV ? ` — Season ${season}, Episode ${episode}` : ''}`} referrerPolicy="no-referrer" /> : <div className="video-placeholder"><span className="placeholder-play">▶</span><h3>{loading || loadingEpisodes ? 'Loading your episode guide…' : error ? 'Episode guide unavailable' : 'No aired episodes in this season'}</h3><p>{error || 'Choose an available episode from the official episode list.'}</p>{error && <button className="primary-button" onClick={() => setRetry(n => n + 1)}>Try again</button>}</div>}</div>
          <div className="playing-strip"><div><span className="eyebrow">{isTV ? 'NOW SELECTED' : 'NOW PLAYING'}</span><h3>{selected ? `S${season} · E${episode} — ${selected.name}` : title}</h3></div>{isTV && <div className="episode-navigation"><button aria-label="Previous episode" disabled={index <= 0 || loadingEpisodes} onClick={() => setEpisode(available[index - 1].number)}>←</button><button aria-label="Next episode" disabled={index < 0 || index >= available.length - 1 || loadingEpisodes} onClick={() => setEpisode(available[index + 1].number)}>→</button></div>}</div>
          {selected && <div className="episode-description"><div>{selected.airDate}{selected.runtime ? ` · ${selected.runtime} min` : ''}</div><p>{selected.overview || 'No synopsis available for this episode.'}</p></div>}
          <section className="player-sources"><div className="source-heading"><span className="eyebrow">PLAYBACK SOURCE</span><span>Having trouble? Try another source.</span></div><div className="source-buttons">{PLAYER_SERVERS.map(source => <button key={source} disabled={!supportsPlayer(source, playbackId)} aria-pressed={selectedServer === source} className={selectedServer === source ? 'selected' : ''} onClick={() => setServer(source)}>{source}{selectedServer === source && <span>●</span>}</button>)}</div></section>
        </div>
        {isTV && <aside className="episode-panel"><div className="episode-panel-heading"><h3>Episodes</h3><span>{show ? `Guide by ${show.source}` : 'Episode guide'}</span></div><label className="season-label" htmlFor="season-picker">Select season</label><select id="season-picker" value={season ?? ''} disabled={!show || loading} onChange={e => { setEpisodes([]); setEpisode(null); setSeason(Number(e.target.value)); }}><option value="" disabled>Loading seasons…</option>{show?.seasons.map(s => <option key={s.number} value={s.number}>{s.name} · {s.count} episodes</option>)}</select>
          <div className="episode-list" aria-busy={loading || loadingEpisodes}>{loading || loadingEpisodes ? <p className="episode-status" role="status">Loading actual episodes…</p> : error ? <div className="episode-status" role="alert"><p>{error}</p><button className="text-button" onClick={() => setRetry(n => n + 1)}>Retry episode guide ↻</button></div> : episodes.length === 0 ? <p className="episode-status">No episodes listed yet.</p> : episodes.map(ep => <button key={ep.number} disabled={!hasAired(ep)} aria-pressed={episode === ep.number} className={`episode-row ${episode === ep.number ? 'selected' : ''}`} onClick={() => setEpisode(ep.number)}><div className="episode-thumbnail">{ep.image ? <img src={ep.image} alt="" loading="lazy" /> : <span>{String(ep.number).padStart(2, '0')}</span>}<span className="episode-thumbnail-play">{episode === ep.number ? '▶' : ep.number}</span></div><div><span className="episode-number">EPISODE {ep.number}</span><h4>{ep.name || `Episode ${ep.number}`}</h4><small>{!hasAired(ep) ? ep.airDate ? `Upcoming · ${ep.airDate}` : 'Air date unconfirmed' : ep.runtime ? `${ep.runtime} min · ${ep.airDate}` : ep.airDate}</small></div></button>)}</div>
        </aside>}
      </div><footer className="player-footer"><span className="live-dot" /> {selectedServer} <span>Choose an episode to update playback. Provider availability may vary.</span></footer>
    </div>
  </div>;
};
export default EmbedPlayer;
