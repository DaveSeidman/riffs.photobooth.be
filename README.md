# RiiFFS photobooth backend

Express service for photo capture, FAL image generation, Lunar Blush/Pulse treatments, and QR photo delivery.

## Local development

Use Node 22. Run `npm ci`, copy `.env.example` to `.env`, set `FAL_KEY`, and run `npm run dev`. The server listens on port 8000. Run `npm test` for automated checks. Pair with the [frontend](https://github.com/DaveSeidman/riffs.photobooth.fe).

## Render deployment

Create a **Web Service** from this repository, branch `main`, Node runtime, with no root directory override:

- Build: `npm ci`
- Start: `npm start`
- Health check: `/health`
- Node version: `22`
- Choose a paid instance supporting a persistent disk (the Blueprint uses Starter).
- Mount a 1 GB persistent disk at `/var/data` and set `DATA_DIR=/var/data`.

Required environment variables:

| Variable | Value |
| --- | --- |
| `FAL_KEY` | Your FAL API key; backend secret only |
| `ALLOWED_ORIGINS` | Exact frontend HTTPS origin; comma-separated if also allowing the Render preview domain |
| `PUBLIC_PHOTO_ORIGIN` | Public HTTPS origin of this backend, no trailing slash |
| `DATA_DIR` | `/var/data` |
| `NODE_VERSION` | `22` |

`render.yaml` also sets the Lunar image model, generation timeout, and disables printing. Use it as a Render Blueprint or configure the same settings manually. Render supplies `PORT`; the server binds to `0.0.0.0`.

Verify `/health`, then configure frontend `VITE_API_URL` with this backend's origin and redeploy the frontend. Test a full camera → fragrance → generated photo → phone QR download flow over HTTPS.

## Photo storage

QR codes point directly to finished postcards under `/photos/`. `PUBLIC_PHOTO_ORIGIN` must be reachable from visitors' phones. The persistent disk keeps these files across deploys; without it, QR links will break when the service restarts. Photos and uploads are excluded from Git. Files served by QR URLs are publicly accessible to anyone holding the link. Plan retention/cleanup and monitor disk capacity during the event.

Do not point this deployment at Every's photo directory. The existing Every service can be repurposed only if replacing its application is intended; a second hostname alone does not create a separate application.

## Dependency audit

At initial publication (2026-11-20), `npm audit` reports three findings: a high-severity librsvg advisory through pinned `sharp` 0.35.4 and two moderate findings through development-only `nodemon`/`minimatch`. The audit reports no available fix. Review updated package releases before event deployment; the frontend audit is clean.
