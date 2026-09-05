# Weather Glass

Real-time Hawai‘i observations, forecasts, alerts, satellite and radar — as a static
bundle with **no backend, no database, and no infrastructure to maintain**.

A passion project by a group of students in the Department of Atmospheric Sciences at the
University of Hawai‘i at Mānoa. Not an official University of Hawai‘i or NOAA publication.

## The idea

NOAA publishes its data over HTTPS with open CORS headers, so the browser can fetch it
directly and no server is needed in between:

- `api.weather.gov` — observations, forecasts, alerts, text products (free, no key)
- NESDIS STAR — GOES-18 satellite imagery
- NWS RIDGE — NEXRAD radar

The result is a static site that GitHub Pages hosts for free, on a CDN, scaling on its own.

## Quick start

```bash
docker compose up dev        # hot reload   -> http://localhost:5273
docker compose up preview    # real build   -> http://localhost:4273
```

Or without Docker:

```bash
npm install
npm run dev
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | TypeScript, no emit |

## Layout

```
src/
  lib/
    nws.ts        api.weather.gov client and types
    sources.ts    imagery catalog (satellite, radar, analysis charts, links)
    tropical.ts   Central and Eastern Pacific advisories
    stations.ts   Hawai‘i observation network
    units.ts      unit conversion and HST formatting
  components/     layout, imagery tile, alerts, UI primitives
  pages/          one file per route
```

## Deploying

Push to `main`; `.github/workflows/deploy.yml` builds and publishes to GitHub Pages.
One-time: **Settings → Pages → Source → GitHub Actions**.

The base path is derived from the repository name: a `<name>.github.io` repo builds for
the root, any other repo builds for `/<repo>/`. A custom domain needs `BASE_PATH: /`.

## Disclaimer

For research and educational use. Not an official source of weather warnings — consult
[NWS Honolulu](https://www.weather.gov/hfo/) and the
[Central Pacific Hurricane Center](https://www.nhc.noaa.gov/?cpac).
