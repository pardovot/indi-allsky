# indi-allsky web (v2)

New React UI. Runs alongside the existing Flask/Jinja UI without touching it.

## Dev (on the Pi)

```bash
cd web
cp .env.example .env   # default VITE_API_TARGET=https://localhost is correct for on-Pi dev
npm install
npm run dev -- --host  # --host to listen on all interfaces (browse from another machine)
```

Open `http://<pi-hostname>:3000` from any LAN browser.

The Vite dev server proxies `/indi-allsky/api`, `/indi-allsky/images`, and
`/indi-allsky/static` to local Apache (HTTPS, self-signed cert accepted).

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
