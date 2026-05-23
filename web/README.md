# indi-allsky web (v2)

New React UI. Runs alongside the existing Flask/Jinja UI without touching it.

## Dev

```bash
cd web
cp .env.example .env
# edit .env → set VITE_API_TARGET to your Pi (e.g. https://allsky.local)

npm install
npm run dev
```

Open http://localhost:3000.

The Vite dev server proxies `/indi-allsky/api`, `/indi-allsky/images`, and
`/indi-allsky/static` to the Pi. The Pi serves these via Apache (HTTPS,
self-signed certs accepted by the proxy).

## Backend requirement

Pi must be running the `new-web-ui` branch (provides `/indi-allsky/api/v2/*`).
Install on Pi:

```bash
git pull
./virtualenv/indi-allsky/bin/pip install 'Flask-JWT-Extended>=4.6.0'
systemctl --user restart gunicorn-indi-allsky
```

## Build

```bash
npm run build
# output: web/dist/
```

(Production serve via Flask not wired yet — phase 2.)
