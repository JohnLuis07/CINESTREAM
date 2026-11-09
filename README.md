<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1CBCepUJr4sfcxooRn2VHRsZ4TjypCNmJ

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. TV browsing/search uses the free TVmaze API without a key. For movie listings, copy `.env.example` to `.env.local` and set your own valid `TMDB_API_KEY` or `TMDB_ACCESS_TOKEN` (API Read Access Token). Optionally set `OMDB_API_KEY` for secondary movie search. Restart Vite after changing keys. These keys are included in the browser bundle; use keys intended for this client application.
3. Run the app:
   `npm run dev`

Data providers: [TVmaze](https://www.tvmaze.com/api) (TV schedule and search, CC BY-SA), [TMDB](https://developer.themoviedb.org/docs/getting-started) (movies and TV), and [OMDb](https://www.omdbapi.com/) (secondary search). TVmaze supplies metadata, not video streams. Playback is handled separately by the existing embedded players.

Playback uses selectable iframe providers, with Vidsrc.to selected by default for movies and TV. VidLink is disabled for IMDb results because its API requires a TMDB ID. Vsrc and SuperEmbed URLs distinguish TMDB from IMDb IDs. External provider availability and individual title playback are not guaranteed by a successful app build.

TMDB is free for noncommercial use with attribution and requires your own account credential: https://www.themoviedb.org/settings/api. The catalog API provides metadata and images, not full movie streams. It cannot remove advertising from external playback providers. If authentication fails, Movies displays the configuration error instead of an empty catalog.

Reference requested for this integration: [API Evangelist’s TMDB profile](https://github.com/api-evangelist/tmdb). This repository documents the official API; requests go to `https://api.themoviedb.org/3`. All catalog search, trending, IMDb lookups, and TV details share `services/tmdbService.ts`. Set either credential from `.env.example` in `.env.local`; the read access token takes precedence. No third-party shared credentials are bundled.
