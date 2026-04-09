# TrustChain Workspace

## Overview

TrustChain is a financial reputation platform for the unbanked. It computes FICO-style trust scores (300–850) from payment signals (rent, utilities, mobile) and peer vouching relationships using a custom graph propagation algorithm.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS
- **Charts**: Recharts (horizontal bar chart)
- **Graph viz**: react-force-graph-2d
- **AI**: Anthropic Claude (claude-sonnet-4-20250514) for score explanations

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `curl localhost:80/api/seed` — seed database with 30 fake users (run once)

## Project Structure

### Backend (`artifacts/api-server/`)
- `src/routes/users.ts` — POST /api/users (create or find user), GET /api/users/all
- `src/routes/signals.ts` — POST /api/signal (add payment signal)
- `src/routes/vouches.ts` — POST /api/vouch (vouch for user)
- `src/routes/scores.ts` — GET /api/scores, GET /api/scores/:id (trust score computation)
- `src/routes/explain.ts` — POST /api/explain (AI explanation via Anthropic Claude)
- `src/routes/network.ts` — GET /api/network (graph data)
- `src/routes/seed.ts` — GET /api/seed (seed DB with 30 fake users)
- `src/lib/trustScore.ts` — **Core trust score algorithm**: signal scoring + graph propagation (10 iterations, ALPHA=0.6) + normalization to 300-850 range

### Frontend (`artifacts/trustchain/`)
- `src/pages/landing.tsx` — Login/registration page
- `src/pages/dashboard.tsx` — Score badge, AI explanation, chart, vouchers, add signal/vouch
- `src/pages/network.tsx` — Force-directed trust graph visualization
- `src/components/layout.tsx` — Shared navigation header

### Database (`lib/db/src/schema/`)
- `users.ts` — users table (id, name, email, created_at)
- `signals.ts` — signals table (id, user_id, type, months_consistent, created_at)
- `vouches.ts` — vouches table (id, voucher_id, vouchee_id, strength, created_at)

## Trust Score Algorithm

Located in `artifacts/api-server/src/lib/trustScore.ts`:

1. **Signal scoring**: rent × 8pts/mo, utility × 5pts/mo, mobile × 4pts/mo, default × -20pts
2. **Graph adjacency**: vouch edges with weight = strength/10
3. **Propagation** (10 iterations): `new_score[u] = 0.6 × own_score[u] + 0.4 × Σ(score[v] × weight(v→u))`
4. **Normalization**: 0–600 range per iteration, then mapped to 300–850 (FICO-style)

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `ANTHROPIC_API_KEY` — For Claude AI score explanations
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase URL (available but using built-in Postgres)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (available)

## Auth

No real auth — simple name/email login that creates/finds user. `userId` and `userName` stored in `localStorage` under `trustchain_userId` and `trustchain_userName`.
