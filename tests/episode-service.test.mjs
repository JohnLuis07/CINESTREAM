import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const dataURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const client = dataURL(compile(readFileSync(new URL('../services/tmdbService.ts', import.meta.url), 'utf8')));
const source = compile(readFileSync(new URL('../services/episodeService.ts', import.meta.url), 'utf8').replace("'./tmdbService'", JSON.stringify(client)));
test('real episode metadata and playback numbering', async t => {
  const fetch = globalThis.fetch;
  const oldKey = process.env.TMDB_API_KEY;
  const oldToken = process.env.TMDB_ACCESS_TOKEN;
  process.env.TMDB_API_KEY = 'test-key'; delete process.env.TMDB_ACCESS_TOKEN;
  t.after(() => {
    globalThis.fetch = fetch;
    for (const [key, value] of [['TMDB_API_KEY', oldKey], ['TMDB_ACCESS_TOKEN', oldToken]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const { loadShow, loadEpisodes, hasAired } = await import(dataURL(source));
  await t.test('IMDb lookup resolves to the correct TMDB show and seasons', async () => {
    globalThis.fetch = async url => {
      const path = new URL(url).pathname;
      if (path === '/3/find/tt123') return Response.json({ tv_results: [{ id: 42 }] });
      assert.equal(path, '/3/tv/42');
      return Response.json({ name: 'Real Show', seasons: [{ season_number: 0, episode_count: 9 }, { season_number: 3, name: 'Season 3', episode_count: 2 }] });
    };
    const show = await loadShow('tt123');
    assert.equal(show.id, '42');
    assert.deepEqual(show.seasons.map(s => s.number), [3]);
    globalThis.fetch = async url => {
      assert.equal(new URL(url).pathname, '/3/tv/42/season/3');
      return Response.json({ episodes: [{ episode_number: 7, season_number: 3, name: 'Actual title', air_date: '2020-01-01' }, { episode_number: 2, season_number: 3, name: 'Earlier episode', air_date: '2999-01-01' }] });
    };
    const episodes = await loadEpisodes(show, 3);
    assert.deepEqual(episodes.map(e => e.number), [2, 7]);
    assert.equal(episodes[1].name, 'Actual title');
    assert.equal(hasAired(episodes[0]), false);
    assert.equal(hasAired(episodes[1]), true);
  });
  await t.test('TVmaze fallback preserves year seasons and nonconsecutive episode numbers', async () => {
    globalThis.fetch = async url => {
      if (url.startsWith('https://api.themoviedb.org/')) return Response.json({}, { status: 503 });
      if (url.includes('/lookup/')) return Response.json({ id: 9, name: 'Year show' });
      return Response.json([{ season: 2025, number: 5, name: 'Fifth', airdate: '2025-01-01' }, { season: 2025, number: 8, name: 'Eighth', airdate: '2025-02-01' }, { season: 2025, number: null }]);
    };
    const show = await loadShow('tt456');
    assert.equal(show.source, 'TVmaze');
    assert.equal(show.seasons[0].number, 2025);
    assert.deepEqual((await loadEpisodes(show, 2025)).map(e => e.number), [5, 8]);
  });
  await t.test('numeric TMDB IDs are never sent as IMDb IDs on fallback', async () => {
    globalThis.fetch = async url => {
      assert.ok(url.startsWith('https://api.themoviedb.org/'));
      return Response.json({}, { status: 503 });
    };
    await assert.rejects(loadShow('42'), /TMDB connection/);
  });
});
