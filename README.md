## Why TrustChain Matters

> "There are 1.4 billion adults on Earth with no credit history, not because they are risky, but because no system has ever bothered to remember them. Until now."

TrustChain does not create trust. It makes visible the trust that already exists in communities the financial system has ignored.

---

Each user is a **node** in a trust graph. Each vouch is a **weighted directed edge**. Trust propagates through the network iteratively over 10 rounds until scores converge, then normalizes to the 300-850 range.

A vouch from a user with score 790 carries more weight than a vouch from a user with score 320 — exactly how trust works in real life.

| Parameter | Value |
|-----------|-------|
| Dampening factor (ALPHA) | 0.6 |
| Iterations | 10 |
| Score range | 300-850 |

---

## Trust Signals

| Signal | Points |
|--------|--------|
| Rent payment (per month on time) | +8 |
| Utility bill (per month on time) | +5 |
| Mobile top-up (per month) | +4 |
| Peer vouch (weighted by voucher score) | +variable |
| Default | -20 |

---

## Features

- Trust score dashboard with real-time updates
- AI-powered score explanation via Claude API
- Score breakdown chart by signal type
- Interactive force-directed trust network graph
- Vouch for community members
- Add behavioral signals (rent, utility, mobile)
- Portable score exportable as signed JWT

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL via Supabase |
| AI Layer | Anthropic Claude API |
| Graph Viz | D3.js force-directed |

---

## Setup

```bash
# Install dependencies
pnpm install

# Terminal 1 - API server
cd artifacts/api-server
pnpm dev

# Terminal 2 - Frontend
cd artifacts/trustchain
pnpm dev
```

Open http://localhost:5173

---

## Environment Variables
Create a `.env` file in `artifacts/api-server`:
DATABASE_URL=your_supabase_postgres_url
ANTHROPIC_API_KEY=your_anthropic_key
SESSION_SECRET=any_random_string
PORT=3001


---


