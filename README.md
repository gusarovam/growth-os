# Growth OS AI — v0.2

A personal web planner designed around one chain:

**Dream → Goal → Milestones → Calendar → Today → Focus → Review → Replan**

## What works

- Today: timeline + tasks side by side
- Today's Big 3
- Task completion and daily progress
- Energy + scroll budget tracking
- 10 / 25 / 50 minute Focus Mode
- **I'm procrastinating** AI rescue
- Dream → Plan AI goal decomposition
- Milestones, deadlines and goal progress
- First goal actions added directly to the calendar
- 7-day calendar view
- AI Daily Planner
- AI **Replan my week**
- AI Weekly Coach
- 7-day consistency history
- Local browser persistence
- Responsive desktop/mobile UI

## AI architecture

The OpenAI key stays **server-side** in `/api/ai.js`.
The browser only calls `/api/ai`.

The server uses the OpenAI **Responses API** with **Structured Outputs / JSON Schema**, so the model returns predictable objects that can be added to the planner instead of free-form prose.

Default model: `gpt-5.6-luna` (change with `OPENAI_MODEL`).

## Fastest way to run with real AI: Vercel

1. Create an OpenAI API key in your OpenAI API account.
2. Put this folder in a GitHub repository, or import the folder into a Vercel project.
3. In Vercel → Project Settings → Environment Variables add:
   - `OPENAI_API_KEY` = your key
   - `OPENAI_MODEL` = `gpt-5.6-luna` (optional)
4. Deploy.
5. Open the deployed URL.

Do **not** paste your API key into `app.js`, `index.html`, browser localStorage, or any public repository.

## Local UI preview

You can preview the interface with any static local server, but real AI needs `/api/ai` to run in a serverless/Node environment.

For example, after installing Vercel CLI you can use `vercel dev` from this folder and provide the environment variable through your local Vercel environment.

## Files

- `index.html` — UI shell
- `styles.css` — responsive minimal design
- `app.js` — planner state + UI + AI calls
- `api/ai.js` — secure server-side OpenAI endpoint
- `.env.example` — environment variable names
- `vercel.json` — function config

## Data storage

This MVP stores planner data in browser `localStorage`. That is intentional for a personal MVP.

The next production step would be Supabase authentication + database sync so the same data follows you between laptop and phone.
