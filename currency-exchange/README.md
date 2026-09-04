# Money Converter — Offline 💱

A luxury, **fully offline** currency exchange web app for:

- 🇺🇸 **USD** — US Dollar (base)
- 🇸🇦 **SAR** — Saudi Riyal
- 🇸🇾 **SYP** — Syrian Lira (old)
- 🇸🇾 **SYPN** — Syrian Lira (new)

Everything runs in the browser. No server, no API calls, no data leaves the
device. It installs as a PWA and keeps working with the network fully off.

## Features

- **Instant two-way conversion** between any pair of the four currencies.
- **Editable rates** — you set the market rate (units per 1 USD); stored on the
  device via `localStorage`, so your numbers persist and work offline.
- **Old ↔ new Syrian Lira** handled as two independent currencies, so any
  redenomination ratio is just a rate you type in.
- **Bilingual** English / العربية with full RTL support.
- **Offline‑first PWA** — a service worker caches the app; add to home screen.
- **Luxury UI** — dark + gold theme, glass cards, serif display type.

> Default rates are seeded as a starting point and are **not** live market
> data — tap **Edit** to set them to your own market before relying on them.

## Run locally

Any static file server works — there is no build step:

```bash
cd currency-exchange
python3 -m http.server 5173
# open http://localhost:5173
```

## Deploy to Vercel (zero config)

The repo-root `vercel.json` serves this app at the site root via rewrites, so
there is **nothing to configure** in Vercel:

1. Import the repository `mkfayez/public-checker-system` into Vercel.
2. Leave every default as-is (Root Directory = repo root, no build command).
3. Click **Deploy**. Your link goes live and the app opens at the root URL
   (e.g. `https://your-project.vercel.app`), working offline after first load.

Or from the repo root via CLI:

```bash
npx vercel --prod
```

The app files stay tidy inside `currency-exchange/`; the root `vercel.json`
rewrites every request to that folder.

## How conversion works

Every rate is stored as **units of that currency per 1 USD**. To convert an
amount from currency A to currency B: `amount ÷ rateA × rateB`. USD is the
fixed base (rate = 1).
