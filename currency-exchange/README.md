# Sarf — Offline Money Exchange 💱

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

## Deploy to Vercel

This app is a static site living in the `currency-exchange/` subfolder.

1. Import the repository into Vercel.
2. In **Project Settings → Build & Development**, set:
   - **Framework Preset:** Other
   - **Root Directory:** `currency-exchange`
   - Build command: *(leave empty)* · Output directory: *(leave empty)*
3. Deploy. Your link will be live and the app will work offline after first load.

Alternatively, from the `currency-exchange` folder:

```bash
npx vercel --prod
```

## How conversion works

Every rate is stored as **units of that currency per 1 USD**. To convert an
amount from currency A to currency B: `amount ÷ rateA × rateB`. USD is the
fixed base (rate = 1).
