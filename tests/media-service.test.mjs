import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../services/geminiService.ts', import.meta.url), 'utf8');
const tmdbSource = readFileSync(new URL('../services/tmdbService.ts', import.meta.url), 'utf8');
const tmdbJS = ts.transpileModule(tmdbSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const tmdbURL = `data:text/javascript;base64,${Buffer.from(tmdbJS).toString('base64')}`;
const js = ts.transpileModule(source.replace('"./tmdbService"', JSON.stringify(tmdbURL)), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const show = { name: 'Example', externals: { imdb: 'tt1234567' }, summary: '<p>A show</p>', image: null, rating: { average: 8 } };

test('media provider integration', async t => {
  const originalFetch = globalThis.fetch;
  const originalTMDB = process.env.TMDB_API_KEY;
  const originalOMDB = process.env.OMDB_API_KEY;
  const originalToken = process.env.TMDB_ACCESS_TOKEN;
  t.after(() => {
    globalThis.fetch = originalFetch;
    for (const [key, value] of [['TMDB_API_KEY', originalTMDB], ['OMDB_API_KEY', originalOMDB], ['TMDB_ACCESS_TOKEN', originalToken]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  delete process.env.TMDB_ACCESS_TOKEN;
  process.env.TMDB_API_KEY = 'test-key';
  process.env.OMDB_API_KEY = 'test-key';
  const service = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

  await t.test('rejected keys fall back to TVmaze and preserve IMDb IDs', async () => {
    globalThis.fetch = async url => url.startsWith('https://api.tvmaze.com/')
      ? Response.json([{ show }, { show }, { show: { name: 'No IMDb ID' } }])
      : Response.json({}, { status: 401 });
    const result = await service.searchMediaWithAI('Example');
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].id, 'tt1234567');
    assert.equal(result.items[0].overview, 'A show');
    assert.equal(result.items[0].posterPath, '/placeholder.svg');
    assert.equal(result.sources[0].title, 'TVmaze');
    assert.equal((await service.getTrendingMedia('tv')).items.length, 1);
    await assert.rejects(service.getTrendingMedia('movie'), /TMDB rejected your credentials/);
  });

  await t.test('configured TMDB key supports movie charts without TV fallback', async () => {
    globalThis.fetch = async url => {
      assert.ok(url.includes('api_key=test-key'));
      return Response.json({ results: [{ id: 123, title: 'Movie', media_type: 'movie', release_date: '2026-01-01', vote_average: 7.5 }] });
    };
    const result = await service.getTrendingMedia('movie');
    assert.equal(result.items[0].type, 'movie');
    assert.equal(result.items[0].id, '123');
  });

  await t.test('movie search stays in movies and preserves IDs shared with TV', async () => {
    globalThis.fetch = async url => {
      if (url.startsWith('https://www.omdbapi.com/')) return Response.json({});
      assert.equal(new URL(url).pathname, '/3/search/movie');
      return Response.json({ results: [{ id: 42, title: 'Example Movie' }] });
    };
    const result = await service.searchMediaWithAI('Example', 'movie');
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].type, 'movie');
  });

  await t.test('TV search uses its dedicated endpoint and excludes OMDb movies', async () => {
    globalThis.fetch = async url => {
      if (url.startsWith('https://www.omdbapi.com/')) {
        assert.equal(new URL(url).searchParams.get('type'), 'series');
        return Response.json({ Search: [{ imdbID: 'tt42', Title: 'Wrong Movie', Type: 'movie', Year: '2026', Poster: 'N/A' }] });
      }
      assert.equal(new URL(url).pathname, '/3/search/tv');
      return Response.json({ results: [{ id: 42, name: 'Example Series' }] });
    };
    const result = await service.searchMediaWithAI('Example', 'tv');
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].type, 'tv');
  });

  await t.test('empty movie search never falls back to television results', async () => {
    globalThis.fetch = async url => {
      assert.ok(!url.startsWith('https://api.tvmaze.com/'));
      return Response.json({ results: [] });
    };
    assert.deepEqual((await service.searchMediaWithAI('nothing', 'movie')).items, []);
  });

  await t.test('discover search keeps movies and shows with the same TMDB ID', async () => {
    globalThis.fetch = async url => url.startsWith('https://www.omdbapi.com/')
      ? Response.json({})
      : Response.json({ results: [{ id: 42, title: 'Example Movie', media_type: 'movie' }, { id: 42, name: 'Example Series', media_type: 'tv' }] });
    assert.equal((await service.searchMediaWithAI('Example')).items.length, 2);
  });

  await t.test('provider outage surfaces an error instead of an empty successful list', async () => {
    globalThis.fetch = async () => Response.json({}, { status: 503 });
    await assert.rejects(service.getTrendingMedia('tv'), /503/);
  });

  await t.test('read access token uses Authorization instead of query credentials', async () => {
    process.env.TMDB_ACCESS_TOKEN = 'test-token';
    const tokenClient = await import(`data:text/javascript;base64,${Buffer.from(tmdbJS + '\n// token client').toString('base64')}`);
    globalThis.fetch = async (url, options) => {
      assert.equal(new URL(url).searchParams.has('api_key'), false);
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      return Response.json({ results: [] });
    };
    await tokenClient.fetchTMDB('/trending/movie/day');
    delete process.env.TMDB_ACCESS_TOKEN;
  });

  await t.test('missing credentials give setup instructions', async () => {
    delete process.env.TMDB_API_KEY;
    const emptyClient = await import(`data:text/javascript;base64,${Buffer.from(tmdbJS + '\n// empty client').toString('base64')}`);
    await assert.rejects(emptyClient.fetchTMDB('/trending/movie/day'), /Add a free TMDB_API_KEY/);
    process.env.TMDB_API_KEY = 'test-key';
  });

  await t.test('empty TV search stays empty', async () => {
    globalThis.fetch = async url => url.startsWith('https://api.tvmaze.com/')
      ? Response.json([]) : Response.json({}, { status: 401 });
    assert.deepEqual((await service.searchMediaWithAI('nothing')).items, []);
  });
});
