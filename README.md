# Budget Tracker

A personal spending tracker with dynamic monthly budget "slots", a chat-based
AI entry mode (Groq), and a manual-entry fallback for when the AI is
unavailable. Built with Next.js (App Router) + Supabase + Tailwind, meant to
be deployed on Vercel straight from GitHub.

## How it's organized

- **Slots are per-month.** Each month has its own set of budget envelopes
  (e.g. "daily consumption", "electricity", "family bus tickets") with a
  budget limit each. Copy last month's slots as a starting point, then
  add/remove/rename freely — this is the "dynamic" part.
- **Two ways to record a transaction:**
  - **Chat** — type something like `beli kopi 24000` or `gaji masuk 2798600`.
    The AI parses it into a structured draft (amount, direction, matching
    slot, note, date) and shows it as a confirmation card. Nothing is saved
    until you tap Confirm.
  - **Manual** — a plain form (slot, amount, note, date). Works with zero AI
    involvement, so it's always available if Groq is down or rate-limited.
    The chat panel also automatically suggests switching to Manual mode if
    an AI request fails.
- **Why this avoids the old rate-limit problem:** every chat request sends
  only the latest message, a short rolling window of the last few turns, and
  a compact snapshot of current slot balances — never the full growing chat
  history. Request size stays flat no matter how long the conversation gets.
  All persistence goes straight to Supabase, not through the model.

## 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the contents of `supabase/schema.sql`. This creates
   `budget_months`, `budget_slots`, `transactions`, and row-level security
   policies so each user only ever sees their own data.
3. In **Authentication → Providers**, make sure **Email** is enabled. For
   quick local testing you can turn off "Confirm email" under
   **Authentication → Settings** so sign-up works instantly; leave it on for
   a real deployment.
4. In **Project Settings → API**, copy the **Project URL** and the **anon
   public key** — you'll need them below.

## 2. Groq setup

1. Get an API key from [console.groq.com](https://console.groq.com).
2. Groq periodically retires older models — check
   [console.groq.com/docs/models](https://console.groq.com/docs/models) (and
   the deprecations page) for what's currently available. This project
   defaults to `openai/gpt-oss-120b`, set via the `GROQ_MODEL` env var, so you
   can swap models without touching code if one gets deprecated.

## 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GROQ_API_KEY=your-groq-key
GROQ_MODEL=openai/gpt-oss-120b
```

Only `GROQ_API_KEY` is ever read on the server (in `app/api/chat/route.js`);
the Supabase keys are the public anon key by design, safe to expose, since
row-level security is what actually protects the data — not key secrecy.

## 4. Run locally

```
npm install
npm run dev
```

Open http://localhost:3000, sign up with an email + password, and start
adding slots under the **Slots** tab for the current month.

## 5. Deploy (GitHub + Vercel)

1. Push this folder to a new GitHub repo.
2. In [vercel.com](https://vercel.com), "Add New Project" → import that repo.
3. Under **Environment Variables**, add the same four variables as above.
4. Deploy. Vercel will rebuild automatically on every push to the connected
   branch.

## Project layout

```
app/
  layout.js, page.js, globals.css   — root shell + dark glass theme
  api/chat/route.js                 — server route that calls Groq
components/
  AuthGate.jsx                      — email/password sign in & session check
  AppShell.jsx                      — month state, data loading, CRUD wiring
  Sidebar.jsx                       — month picker, slot progress bars, nav
  ChatPanel.jsx                     — chat UI + transaction confirmation
  ManualPanel.jsx                   — manual entry form + recent list
  SlotManager.jsx                   — add/edit/delete/duplicate slots
lib/
  supabaseClient.js                 — browser Supabase client (anon key)
  groqPrompt.js                     — system prompt sent to Groq
  sanitize.js                       — strips stray HTML/LaTeX from AI replies
  format.js                         — IDR currency + date helpers
supabase/schema.sql                 — tables + RLS policies
```

## Notes on things left simple on purpose

- **No service-role key anywhere.** All reads/writes go through the browser's
  authenticated Supabase session, protected by RLS. The `/api/chat` route
  only talks to Groq and returns a suggestion — it never touches the
  database itself, which also keeps it stateless and cheap.
- **Chat history isn't persisted.** It resets on page reload by design, to
  keep the data model small; the transactions themselves are what's saved.
  If you want a persistent chat log later, add a `chat_messages` table
  following the same RLS pattern as the others.
- **Jina AI isn't wired in.** You mentioned having it available — a natural
  next step would be using Jina's embeddings to do fuzzy/semantic matching
  between a freeform description and your slot names (instead of the exact
  case-insensitive match used now), or Jina Reader to parse a photographed
  receipt into text before sending it to Groq.
