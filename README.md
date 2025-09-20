# Fantasy Hockey Assistant (NHL · Yahoo · Supabase · Next.js · Gemini)

An internal tool to manage a Yahoo Fantasy Hockey keeper league:
- Connect Yahoo securely
- Pick your league by **name**
- Pull rosters (current + last season)
- Live waivers/news/trends
- Ask an LLM for start/sit, trades, keepers, and matchup insights (uses real-time data)

---

## Tech Stack

- **Web**: Next.js (TypeScript, App Router), Tailwind
- **Auth/DB**: Supabase (Auth + Postgres + RLS)
- **Yahoo OAuth**: Next.js **API route** (not edge functions) for reliability
- **Realtime/LLM**: Google **Gemini** API (1.5 Flash or Pro), optional tools to hit sports/news APIs
- **HTTP**: Axios or fetch, SWR for client fetching

> We deliberately use a **Next.js API callback** for Yahoo to avoid edge-function JWT config drift. It’s simple, deploys anywhere, and uses the Supabase **service role** key only on the server.

---

## Milestones

1) **Bootstrap the app**
2) **Yahoo OAuth + League/Team pull**
3) **Last season roster/data pull**
4) **Realtime feeds (news/injuries/trends) + Gemini wiring**
5) **LLM chat for insights (start/sit, waivers, trades, keepers)**

Each milestone has acceptance criteria and a short checklist KILO/Grok will follow.

---

## Local Setup

### 0) Prereqs
- Node 18+
- pnpm or npm
- A Supabase project
- A Google AI Studio key (Gemini)
- A Yahoo Developer app (Confidential Client, Fantasy Sports Read)

### 1) Create project
```bash
npx create-next-app@latest fantasy-assistant \
  --ts --eslint --tailwind --app --src-dir --import-alias "@/*"
cd fantasy-assistant
pnpm add @supabase/supabase-js zod jose swr axios
