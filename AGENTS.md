# AGENTS.md - virtual-tryon

Virtual fitting room for a clothing company: shoppers put catalog garments on
virtual models, with a drag-and-drop instant preview and an AI "realistic
preview" served by a self-hosted GPU model.

## Tech Stack
**Frontend (`frontend/`):** Vite 8, React 19, MUI 9 (`@mui/material`, icons, emotion),
`konva` + `react-konva` (canvas editor). Plain JS/JSX, no router, no state library.
**Backend (`backend/`):** Node 20+, Sails.js 1.5 (actions2 + blueprints), `sails-postgresql`,
`sails-hook-orm`, `sails-hook-uploads`, Skipper for multipart. PostgreSQL 17 via `docker-compose.yml`.
**Try-on (`tryon-service/`):** Python 3.10, FastAPI, Leffa (cloned into `tryon-service/Leffa`, git-ignored).

## Structure
```
frontend/src/
├── App.jsx                  Layout, catalog, layers panel, dialogs, realistic-preview flow
├── components/TryOnCanvas.jsx   react-konva stage; model image + draggable/transformable garment layers
├── api.js                   fetch wrapper for /api (incl. uploadImage, tryOn)
└── imageUtils.js            loadImage/useImage, removeWhiteBackground, flattenOnWhite, fetchBlob
frontend/public/models/      Illustrated stand-in models (latina/european/asian .svg)

backend/
├── api/models/              Mannequin, Garment, Design
├── api/controllers/upload/image.js    Image upload (type sniffed from magic bytes)
├── api/controllers/tryon/generate.js  Gateway to the GPU service
└── config/                  routes, blueprints (REST under /api), http (serves /uploads), bootstrap (seeds models),
                             datastores (DATABASE_URL), security (CORS), models (migrate), globals
backend/uploads/             Uploaded files (git-ignored)

tryon-service/main.py        POST /tryon -> Leffa -> PNG
```

## Build / Run / Test
```bash
docker compose up -d
cd backend  && npm install && npm run dev        # :1337
cd frontend && npm install && npm run dev        # :5173, proxies /api and /uploads
cd frontend && npm run build && npm run lint     # oxlint
# GPU service: see tryon-service/README.md (clone Leffa, pip install, uvicorn main:app --port 8000)
curl http://localhost:1337/api/health
```
There is no automated test suite yet. Verify backend changes with curl against `:1337`
(a throwaway HTTP stub on :8000 can stand in for the GPU service).

## Data model
- `Mannequin { name, bodyType, imageUrl }` - seeded in `config/bootstrap.js`; seeding is idempotent by `imageUrl`.
- `Garment { name, category: top|bottom|dress|outerwear|accessory, price, imageUrl }` - imageUrl should be a transparent PNG.
- `Design { name, mannequinUrl, layers: json }` - a saved look. Layers store `src`, position, scale, rotation, opacity.

## Conventions
- Match existing style: 2-space indent, single quotes, no semicolons in `frontend/`, semicolons in `backend/`.
- Frontend talks only to Sails (`/api/*`); never call the GPU service from the browser.
- Garment layers use a centered origin (`offsetX/Y = width/2, height/2`); flip is a negative `scaleX`.
- Realistic preview category map: top/outerwear -> `upper_body`, bottom -> `lower_body`, dress -> `dresses`.

## Gotchas
- **Write config files without a BOM.** PowerShell 5.1 `-Encoding utf8` adds one and `.sailsrc` then fails to parse. Use the Write tool.
- **Sails 1 needs `sails-hook-orm` and `sails-hook-uploads` installed** (`sails.models`, `sails.uploadOne`). `config/globals.js` enables `sails` and model globals.
- **Skipper multipart:** text fields must precede files in the form body, and multiple file streams must be consumed concurrently (`Promise.allSettled`), not awaited one by one (EMAXBUFFER).
- **Never reject inside a Skipper `saveAs` callback** - the stream error is unhandled and crashes the process. Validate after saving (see `upload/image.js`).
- Read uploaded files into a `Blob` before forwarding with `fetch`; `fs.openAsBlob` fails inside undici.
- `/uploads` is mounted through `express().use('/uploads', express.static(...))` in `config/http.js`; mounting the static handler directly 404s.
- Blueprints are `pluralize: false`: routes are `/api/garment`, not `/api/garments`.
- `migrate: 'alter'` in development rewrites tables on every lift; production is `safe`.
- Realistic preview is disabled for `.svg` models by design - the AI model needs photos.

## Security
No auth exists yet: catalog writes, design deletes and `/api/tryon` are open. Do not deploy publicly
without adding login, admin-only policies and rate limiting. Keep the GPU service port private.
Check the try-on model's license and training-data terms before commercial use.
