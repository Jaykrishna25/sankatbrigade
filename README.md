# SANKATBRIGADE

**From emergency reports to coordinated action.**

SankatBrigade is a hyper-local emergency **information-to-action** platform. Anyone nearby can describe
what is happening in plain language; SankatBrigade turns that into a *structured incident record* —
triaged by rules you can read, with unverified claims kept clearly separate from corroborated ones — and
puts it in a responder-style command queue that people can work from.

It is a student prototype, built for a website competition. It is **not** an emergency service.

> ### ⚠️ Safety disclaimer
>
> **For immediate life-threatening danger, contact local emergency services now. Do not wait for
> SankatBrigade.**
>
> SankatBrigade does **not** contact police, fire services, ambulance, hospitals or any government body,
> and it cannot. It does not diagnose anyone, does not give medical instructions, does not track
> responders, and does not treat any report as confirmed by default. Everything stays in your browser.

---

## Table of contents

1. [The product in one minute](#the-product-in-one-minute)
2. [Features](#features)
3. [Technology stack](#technology-stack)
4. [Local setup](#local-setup)
5. [How the deterministic triage engine works](#how-the-deterministic-triage-engine-works)
6. [What is real and what is simulated](#what-is-real-and-what-is-simulated)
7. [Testing the three demo scenarios](#testing-the-three-demo-scenarios)
8. [Deployment — Cloudflare Pages (primary)](#deployment--cloudflare-pages-primary)
9. [Deployment — GitHub Pages (fallback)](#deployment--github-pages-fallback)
10. [Domains: free URL vs custom domain](#domains-free-url-vs-custom-domain)
11. [90-second competition demo script](#90-second-competition-demo-script)
12. [Likely judge questions and strong answers](#likely-judge-questions-and-strong-answers)
13. [Project structure](#project-structure)
14. [Accessibility and responsiveness](#accessibility-and-responsiveness)
15. [Privacy](#privacy)

---

## The product in one minute

During a local emergency the problem is rarely a lack of messages. It is that the messages are
unstructured, duplicated, contradictory, and impossible to prioritise. SankatBrigade sits between the
report and the response:

```
User emergency report
      ↓
Information extraction        (local keyword rules — people, hazards, location, needs)
      ↓
Structured incident object    (a strict TypeScript record, unknown stays "Unknown")
      ↓
Deterministic safety rules    (R1–R4, first match wins, always explainable)
      ↓
Verification status           (unverified → corroborating → corroborated → officially confirmed)
      ↓
Safe next actions             (one concrete, low-risk instruction)
      ↓
Incident ID                   (SB-1047)
      ↓
SankatBrigade Command Center  (queue, map, resource queue, verification shield)
```

The important idea: **urgency and confidence are two separate axes.** How dangerous a claim would be if
true is decided by the safety rules. How much we trust it is decided by the verification shield. A
low-confidence report is never de-prioritised for being low-confidence — its *broadcast* is restricted
instead.

---

## Features

**Citizen reporting**

- Plain-language report box with hazard-aware placeholder guidance
- **Works anywhere in India.** Type a landmark or any of ~140 indexed cities (with autocomplete), let the
  browser share coordinates, or just name the place in your description — each path resolves to a position,
  a city and a state. Captured coordinates are shown back with one-click "open in Google Maps /
  OpenStreetMap", and geolocation still has an honest fallback when it is denied or unsupported
- **Photo, video and audio evidence**: a photo (downscaled in-browser, stored locally), a video clip, and a
  voice note recorded with MediaRecorder — every one labelled *"User-submitted evidence — not independently
  verified"*. Video and audio are playable for the session and never uploaded; only their details are stored,
  and the UI says so rather than pretending they persist
- Speech-to-text dictation via the Web Speech API — with a clear message when the browser lacks it
- **An explicit resource request** (need + number of people) that overrides whatever the words implied
- Three fixed demo scenarios, each visibly marked *"Simulated demo scenario"*

**Incident analysis**

- **Category scores** from the on-device classifier: every candidate category with the points it earned, the
  exact terms that earned them, and the chosen one marked — evidence weights, not invented probabilities
- Four-step analysis sequence (reading → extracting → applying safety rules → creating record)
- Structured result card: urgency, incident ID, type, lifecycle status, location, people affected,
  hazards, resource needed, evidence status, verification status, timestamp
- *"Why this priority?"* and *"Immediate safe action"* on every incident
- The exact rule trace, recomputed live from the stored report text
- The raw structured incident object, viewable in one click

**SankatBrigade Assistant**

- Reachable from **every** screen: a floating chat launcher in the corner, a dedicated **Assistant** screen
  in the navigation, and a panel beside any incident — all three showing the *same* single conversation
- **Guidance mode** (before any report exists): describe an emergency in plain words and it previews how the
  rules would triage it — *"Under the current rules that reads as CRITICAL — possible trapped people,
  possible electrical hazard, 2 people affected"* — then submits it as a real incident on one click
- **Incident mode** (bound to SB-xxxx): asks only for the fields that are still missing (location, people,
  hazards, needs), folds each answer back into the incident and **re-runs the triage rules**, announcing any
  priority change
- Answers fixed questions honestly: *"Did you contact anyone?"* → *"No, and it cannot."*
- Never diagnoses, never invents a detail, always repeats the unverified-by-default position

**SankatBrigade Command Center**

- Summary cards: total, critical, awaiting verification, resource requests, resolved
- Incident queue sorted Critical → High → Medium → Low, newest first inside each band
- Incident detail panel with the full record, hazards, evidence, reason, suggested action, editable
  lifecycle status and a full timeline
- **Two maps, one toggle**: a hand-drawn SVG campus map that needs no network at all, and a real
  OpenStreetMap street map (Leaflet, bundled locally — no CDN, no API key) plotting incidents at their actual
  coordinates. If tiles cannot be fetched, markers still plot and the map says the imagery is unavailable; if
  the map cannot start, it falls back to the campus map automatically
- Verification Shield: claim, source, evidence, independent report count, status, broadcast rule
- Resource queue with eight tracked resource types and per-request cards
- Filters for urgency, verification status, incident type, lifecycle status and **state / region**, plus a
  count of how many states the queue currently spans
- Map controls for **Fit all incidents**, **Whole of India** and **Locate me**

**Platform**

- **Rule self-test** on the About page: twelve fixed checks — including "same input, same output across 50
  runs" and "every Critical result leads with contact-emergency-responders" — executed live in the browser
  against the real engine, so the determinism claim can be demonstrated rather than asserted
- Installable PWA (manifest, service worker, original icons, install prompt, offline shell)
- Dark and light themes, `prefers-reduced-motion` respected
- Cinematic 3.6-second CSS/SVG intro that can be skipped and plays once per browser session
- Works fully offline for what is already on the device; no server, no database, no account, no API key

---

## Technology stack

| Layer      | Choice                                                       |
| ---------- | ------------------------------------------------------------ |
| UI         | React 18 + TypeScript                                        |
| Maps       | Leaflet + OpenStreetMap tiles (bundled, lazily loaded) plus an offline SVG campus map |
| Places     | Offline index of ~140 Indian cities and every state — no geocoding service, no API key |
| Build      | Vite 5                                                       |
| Styling    | Plain CSS with custom properties (`globals.css`, `animations.css`) |
| Motion     | Hand-written CSS keyframes + inline SVG — no animation library |
| Logic      | Deterministic TypeScript modules (extractor + triage engine)  |
| Storage    | `localStorage` (with an in-memory fallback)                   |
| Routing    | Hash routing (no server rewrite rules needed anywhere)        |
| PWA        | `manifest.webmanifest` + a hand-written service worker        |
| Hosting    | Any static host — Cloudflare Pages, GitHub Pages              |

No backend. No database. No authentication. No paid service. **No API key exists in this project**, so
none can leak from it. Leaflet is the only runtime dependency beyond React, and it is bundled and
code-split — the main app loads without it and the map chunk is fetched only when someone opens the street
map.

**Setting the map location:** `CAMPUS_ORIGIN` in `src/utils/geo.ts` anchors the simulated coordinates on the
demo rows and is where the map rests when nothing has coordinates yet. Change it to your own campus — it does
**not** limit where reports can come from.

## Coverage: all of India

A report can come from anywhere in the country, and location is resolved from whichever of these three
sources exists, in this order of trust:

| Source | Example | Result |
| ------ | ------- | ------ |
| Browser coordinates | "Use my location" in Mumbai | `Mumbai, Maharashtra` + exact lat/lng + state |
| A typed place | `Kozhikode, Kerala` in the location field | approximate position + state, autocompleted from the index |
| A place named in the description | "waterlogging near the station in **Surat**" | `Surat, Gujarat` + approximate position |

If none of the three is present, the location stays **Unknown** — it is never guessed.

The index in `src/data/indiaPlaces.ts` holds ~140 cities with their state and approximate centre
coordinates, plus common alternative spellings (Bombay → Mumbai, Trichy → Tiruchirappalli, Vizag →
Visakhapatnam). It is **offline** — no geocoding API, no key, no network call — which is why place
resolution still works with the network down. Coordinates from the index are city-centre approximations
accurate to a few kilometres, and the UI says "nearest known city" rather than claiming precision; a
reporter's own GPS fix always takes priority over it.

**Adding a place:** append one line to `INDIA_PLACES` in that file:

```ts
{ name: 'Bardoli', state: 'Gujarat', lat: 21.1225, lng: 73.1119, aliases: ['bardolee'] },
```

The autocomplete, the text detection, the nearest-city lookup and the state filter all pick it up
automatically.

---

## Optional AI language layer

The assistant works fully without this. Turning it on lets a language model word
free-form answers more naturally — and nothing else.

**The rule that cannot be bent:** a browser cannot keep a secret. Any key put in the frontend bundle is
readable by anyone who opens DevTools and will be scraped and billed. So the key lives on a server, the
browser calls this deployment's own `/api/assistant`, and the frontend never sees it.

**What the model may and may not do**

| | |
| --- | --- |
| May | Explain an incident in plain language, rephrase, answer free-form questions |
| May not | Set or change priority, verification status or the safety instruction; diagnose; claim any service was contacted; invent facts |

Priority is decided by `src/utils/triageEngine.ts` **in the browser, before the model is called**. The server
prompt (`server/aiCore.mjs`) forbids contradicting the record. Answers that came from the model are labelled
in the chat as *"AI language layer (priority still set by the rules)"*. Fixed questions — *"did you contact
anyone?"*, *"is this confirmed?"* — stay deterministic even when the layer is on. If the endpoint is missing,
offline or out of quota, the assistant silently falls back to the rules.

### Configuration

Four environment variables, set **on the server only**:

```bash
AI_PROVIDER=gemini          # anthropic | gemini | openai_compatible | mock
AI_API_KEY=your-key-here    # the secret
AI_MODEL=                   # optional override
AI_BASE_URL=                # only for openai_compatible (Groq, OpenRouter, …)
```

Defaults per provider: `anthropic` → `claude-haiku-4-5-20251001`, `gemini` → `gemini-3.5-flash-lite`,
`openai_compatible` → `gpt-4o-mini`. `mock` returns a canned reply and needs no key — use it to prove the
whole path works before spending anything.

### Where to get a key

- **Google AI Studio (Gemini)** — has a free tier, so it is the usual choice for a student project.
- **Anthropic** — paid; Haiku is the cheapest and fastest of the Claude models.
- **Any OpenAI-compatible endpoint** — OpenAI, Groq, OpenRouter, Together: set `AI_PROVIDER=openai_compatible`
  and point `AI_BASE_URL` at it.

Check the current free-tier limits yourself before relying on them — they change.

### Testing it locally

```bash
npm run build                                   # the server serves dist/
AI_PROVIDER=mock npm run dev:ai                 # http://localhost:8787
```

Or with a real key, and the Vite dev server proxying `/api` to it:

```bash
# terminal 1
AI_PROVIDER=gemini AI_API_KEY=xxxx npm run dev:ai
# terminal 2
npm run dev
```

Open the Assistant screen: the status line reads *"AI layer on"* when the endpoint answers, and
*"deterministic"* when it does not.

### A note on cost and abuse

The endpoint caps request size, history length and output tokens, but it is **not** rate-limited per user. A
public deployment with a paid key can be abused. For anything beyond a demo, add a rate limiter (Cloudflare
KV or Turnstile) before sharing the URL — or simply leave the key off, which is the default.

## Local setup

Requires Node.js 18 or newer.

```bash
npm install     # install dependencies
npm run dev     # start the dev server (http://localhost:5173)
npm run build   # type-check and build to dist/
npm run preview # serve the production build locally
npm run dev:ai  # serve dist/ + the /api/assistant proxy (http://localhost:8787)
```

`npm run build` runs `tsc --noEmit` first, so a type error fails the build rather than shipping.

---

## How the deterministic triage engine works

The triage engine (`src/utils/triageEngine.ts`) is intentionally **not** a language model. It is a small,
readable rule set. The same report always produces the same priority, and every incident can show the
exact rule that produced it.

### Rule order — first match wins

| Rule | Condition                                                                                                                             | Urgency      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| R1   | Any reported **critical life-safety signal**: `trapped_people`, `unconscious_person`, `abnormal_breathing`, `severe_bleeding`, `fire`, `building_collapse`, `electrical_hazard` | **CRITICAL** |
| R2   | Any **risk signal or hazard** without a life-safety signal: blocked access, injury, smoke, gas or chemical smell, rising water, structural damage, crowd pressure, vehicle accident, flooding, or 10+ people exposed to a hazard | **HIGH**     |
| R3   | A **resource request** with no reported danger: medical, evacuation, water, food, transport, shelter, communication, power | **MEDIUM**   |
| R4   | Everything else — information and awareness reports                                                                                    | **LOW**      |

Additional guarantees:

- **The rule set always overrides the keyword-extraction guess.** The UI shows both values
  (`Priority path: High → Critical`) so an override is visible, never hidden.
- **A reported critical signal cannot be downgraded**, including when the report is obviously a rumour.
- **Verification is computed separately.** Every citizen report starts `unverified`. It becomes
  `corroborating` at 1 independent report, `corroborated` at 3, and `officially_confirmed` only by an
  explicit operator action (which the UI labels as a demo action).
- **Second-hand wording** ("everyone is saying", "people are saying", "forwarded", "allegedly") sets a
  rumour flag: the incident is marked *do not broadcast as confirmed* and the recommended action becomes
  *verify before broadcasting* — **without** reducing urgency.
- **Safe actions are non-medical.** For an injury the app says "ask for emergency medical help now"; it
  never gives treatment instructions and never names a condition.

### Extraction

`src/utils/incidentExtractor.ts` is plain keyword matching with two deliberate refinements:

- a **negation guard**, so "there is no fire" does not match `fire`;
- **negation is skipped for resource needs**, because "no water", "no food" and "no power" are exactly
  how people report a need.

Examples of the mapping:

| Text contains                          | Extracted as                              |
| -------------------------------------- | ----------------------------------------- |
| "trapped", "stuck inside", "still inside" | `trapped_people` (critical)            |
| "fire", "flames", "burning"             | `fire` (critical)                         |
| "electrical panel", "live wire", "wires" | `electrical_hazard` (critical)           |
| "flood", "waterlogged", "water inside"  | hazard `flooding`                         |
| "bleeding", "blood loss"                | `severe_bleeding` (critical)              |
| "need drinking water", "no water"       | resource `drinking_water`                 |
| "two students", "about fifty people"    | `people_affected: 2` / `50`               |
| "Science Block", "Hostel B", "Main Gate" | location label + map zone                |

Anything not found stays `null` or `"Unknown"`. The app never fills a gap with a guess.

### The incident model

```ts
{
  incident_id: "SB-1047",
  incident_type: "structural_hazard",
  urgency_candidate: "high",
  final_urgency: "critical",
  location: { label: "Science Block, Ground Floor", lat: null, lng: null },
  people_affected: 2,
  trapped: true,
  hazards: ["flooding", "possible_electrical_hazard"],
  resource_needed: "evacuation_assistance",
  evidence: { text_report: true, photo: false, voice: false },
  verification_status: "unverified",
  reason: "2 people were reported as possibly trapped and a possible electrical hazard was reported. …",
  recommended_action: "escalate",
  lifecycle_status: "escalated",
  created_at: "2026-09-10T10:56:12.004Z"
}
```

---

## What is real and what is simulated

**Real code, running in your browser:** the extractor, the triage engine, the incident record, the
verification logic, storage, filters, sorting, the resource queue, the PWA and the offline shell.

**Simulated, and labelled as such in the UI:**

| Thing                        | Label shown in the app                        |
| ---------------------------- | --------------------------------------------- |
| Seeded queue rows            | *Simulated demo data*                         |
| The three scenario buttons   | *Simulated demo scenario*                     |
| The campus map               | *Prototype map — simulated locations*         |
| Operator status/verification changes | *Local demo action*                   |
| Uploaded photos              | *User-submitted evidence — not independently verified* |
| The analysis step            | *Prototype incident analysis — deterministic keyword rules* |

Even the seeded demo rows are produced by running the **real** extractor and triage engine over demo
report text, so the queue shows genuine pipeline output rather than hand-written rows.

**Deliberately absent:** live emergency-service integration, real-time responder tracking, real GPS
mapping, any claim that a responder was contacted, any medical assessment.

---

## Testing the three demo scenarios

Open **Report Emergency** and click a scenario, then **Submit Emergency Report**.

### 1. Campus Flash Flood → CRITICAL

> "Heavy rain has flooded the ground floor of the science building. Two students may be trapped inside
> the lab. Electrical panels are nearby."

Expected: `CRITICAL`, type *Structural / Rescue*, people affected **2**, hazards *flooding* +
*possible electrical hazard*, resource *evacuation assistance*, verification *Unverified*, status
*Escalation required*, priority path **High → Critical (rule override)**, and the safe action
*"Do not enter floodwater near electrical infrastructure."*

### 2. Unverified Bridge Rumour → CRITICAL urgency, Unverified confidence

> "Everyone is saying the bridge has collapsed near the campus gate."

Expected: `CRITICAL` (a collapse was reported), type *Unverified claim*, verification *Unverified*, the
Verification Shield flagged **"Do not broadcast as confirmed"**, recommended action *verify before
broadcasting*. This is the scenario that shows urgency and confidence are separate.

### 3. Water Resource Request → MEDIUM

> "About fifty people in Hostel B need drinking water."

Expected: `MEDIUM`, type *Resource request*, people affected **50**, resource *drinking water*, status
*Resource queued*, and a card in the Resource queue under **Drinking water** — no alarm, no escalation.

Then: open the **Command Center**, select an incident, change its status, log an independent report and
watch the verification state move. Click **Reset demo data** to return to the seeded state.

### 4. Rule self-test → 12 passed

Open **About → Rule self-test → Run self-test**. Twelve checks run against the real extractor and triage
engine in the browser, covering all four rules, the negation guard, "no food" as a need, power cut vs
electrical hazard, plus the two invariants (determinism over 50 runs, and the contact-first safety line on
every Critical result). Press it twice — the result is identical, which is the point.

---

## Deployment — Cloudflare Pages (primary)

The build is fully static. `vite.config.ts` sets `base: './'` and the app uses hash routing, so the same
`dist/` folder works at a domain root *or* in a sub-folder with no rebuild and no redirect rules.

1. Push this project to a GitHub repository (`main` branch).
2. Sign in at <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
3. Authorise GitHub and pick the repository.
4. Build settings:
   - **Framework preset:** `Vite` (or *None*)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** leave blank (or set it if the app lives in a sub-folder)
   - **Node version:** set the environment variable `NODE_VERSION` to `20` if the build fails on an
     older default
5. **Save and Deploy.**
6. You get a public address such as `https://sankatbrigade.pages.dev`.
7. **Every push to `main` redeploys automatically.** Pull requests get their own preview URL.

### If Cloudflare offers you Workers instead of Pages

New Cloudflare accounts are often steered to **Workers** rather than **Pages**. Both are supported and the
repository already contains what each needs:

| | Pages | Workers |
| --- | --- | --- |
| Handler | `functions/api/assistant.js` (automatic) | `worker/index.js` + `wrangler.jsonc` |
| Build command | `npm run build` | `npm run build` |
| Output / assets | `dist` | `dist` (via the `assets` binding) |
| Deploy command | — | `npx wrangler deploy` |

On the Workers setup screen, leave the defaults (`npm run build`, `npx wrangler deploy`, path `/`) and add the
environment variables afterwards under **Settings → Variables and secrets**, encrypting `AI_API_KEY`. The app
behaves identically on both.

## Deployment — GitHub Pages (fallback)

**Option A — GitHub Actions (recommended).** This repository ships
`.github/workflows/deploy-pages.yml`. Enable it once:

1. Push to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Push to `main`. The workflow runs `npm ci && npm run build` and publishes `dist/`.
4. The site appears at `https://<username>.github.io/<repository>/`.

**Option B — manual `gh-pages` branch.**

```bash
npm run build
npx gh-pages -d dist      # or commit dist/ to a gh-pages branch by hand
```

Then **Settings → Pages → Source: Deploy from a branch → `gh-pages` / root.**

**About the Vite base path.** Because `base: './'` produces relative asset URLs and routing is
hash-based, no change is needed for a project site served from `/<repository>/`. If you would rather use
absolute paths, set the base explicitly in `vite.config.ts`:

```ts
export default defineConfig({
  base: '/<repository-name>/',   // e.g. '/sankatbrigade/'
  // ...
});
```

Use `'/'` for a user/organisation site (`<username>.github.io`) or a custom domain. A wrong base shows a
blank page with 404s for `/assets/*.js` — that is the symptom to look for.

---

## Deployment — Docker

The image builds the site and serves it with the zero-dependency Node server, which also provides
`/api/assistant` when a key is present. One image, both modes.

```bash
docker build -t sankatbrigade .

# deterministic assistant
docker run --rm -p 8787:8787 sankatbrigade

# with the AI layer — the key is passed at run time, never baked into the image
docker run --rm -p 8787:8787 \
  -e AI_PROVIDER=gemini -e AI_API_KEY=your-key-here \
  sankatbrigade
```

Or with Compose, reading from a local `.env` (never committed):

```bash
cp .env.example .env      # fill in AI_PROVIDER and AI_API_KEY
docker compose up --build
```

Then open <http://localhost:8787>. The image runs as a non-root user and has a health check on
`/api/assistant`. Any host that runs a container will take it: Fly.io, Railway, Render, Google Cloud Run,
Azure Container Apps, or a plain VPS behind nginx or Caddy for TLS.

## Where this can be deployed

| Target | Static app | AI layer | Notes |
| ------ | ---------- | -------- | ----- |
| **Cloudflare Pages** | yes | **yes** — `functions/api/assistant.js` runs automatically | Primary target. Secrets in the dashboard |
| **GitHub Pages** | yes | no — no server to run a function | Backup URL; assistant stays deterministic |
| **Docker** (any host) | yes | **yes** — via `server/index.mjs` | Fly.io, Railway, Render, Cloud Run, VPS |
| **Netlify / Vercel** | yes | needs a small adapter | Port `functions/api/assistant.js` to their function format |
| **Any static host** (S3, Nginx, a USB stick) | yes | no | `dist/` is self-contained; relative paths and hash routing |

The frontend is identical everywhere. It asks its own origin once whether an AI endpoint exists, and adapts —
so the same `dist/` runs on all of them without a rebuild.

## Domains: free URL vs custom domain

- A free platform URL (`project-name.pages.dev`, or `username.github.io/repo`) stays available as long as
  the account and project remain active. It costs nothing and is fine for a competition submission.
- For a permanent branded identity, a custom domain (for example `sankatbrigade.in`) can be **purchased
  separately from a registrar and connected to Cloudflare Pages** under
  **Pages → your project → Custom domains → Set up a domain**, then pointing the domain's nameservers or
  a CNAME record at Cloudflare. TLS certificates are issued automatically. Nothing in the code changes.

---

## 90-second competition demo script

> **0:00 — Open the site.** *(the intro plays; "Skip intro" is always available)*
>
> "SankatBrigade is a hyper-local emergency information-to-action platform. It is not an emergency
> service — that message is on every screen. What it does is turn a chaotic report into something people
> can act on."
>
> **0:12 — Click *Campus Flash Flood*, then Submit.**
>
> "This is a simulated demo scenario, and it runs through exactly the same code as anything you type.
> Watch the pipeline: read, extract, apply safety rules, create the record."
>
> **0:28 — Point at the result card.**
>
> "Incident SB-1047. Critical. Two people possibly trapped, a possible electrical hazard, evacuation
> assistance needed, and — importantly — *unverified*. Keyword extraction guessed High; the deterministic
> rule set overrode it to Critical, and we show you that override rather than hiding it."
>
> **0:42 — Open "Show the exact rules that produced this priority".**
>
> "Rule R1. Any reported life-safety signal forces Critical. Same report, same answer, every time — that
> is why safety decisions here are rules, not a language model."
>
> **0:52 — Click a chip in the Assistant: "Did you contact anyone?"**
>
> "No — and it says so. The assistant is bound to this incident; it only asks for missing fields, and any
> answer you give re-runs the triage rules. It's on every screen — that floating button — and before a
> report exists you can just talk to it and it will show you how the rules would triage what you said,
> then file it for you."
>
> **1:02 — Back to Report, run *Unverified Bridge Rumour*.**
>
> "Second-hand claim. Still Critical, because a collapse would be dangerous if true — but the
> Verification Shield keeps it Unverified and flags 'do not broadcast as confirmed'. Urgency and
> confidence are separate axes. That is our answer to misinformation."
>
> **1:08 — Type into the assistant: "waterlogging near the station in Surat, thirty people stuck".**
>
> "It is not campus-only. It picked Surat out of the sentence, put it in Gujarat, gave it coordinates, and it
> will appear in the state filter — offline, with no geocoding service."
>
> **1:15 — Open the Command Center.**
>
> "Critical to Low, newest first. Summary counts, filters, a prototype map that is clearly labelled as
> simulated, and a separate resource queue — so fifty people needing drinking water never competes with a
> rescue for attention."
>
> **1:28 — Close.**
>
> "No backend, no database, no API key, installable as an app, and it works offline for what is already
> on the device. Everything simulated is labelled as simulated."

*Tip: press **Reset demo data** in the Command Center before you present, and load the page once so the
intro is already marked as seen if you would rather start on the home screen.*

---

## Likely judge questions and strong answers

**"Does this only work for your campus?"**
No. Location is resolved anywhere in India from browser coordinates, a typed city (with autocomplete over
~140 indexed cities), or a place named in the description — and each incident carries a state, which the
Command Center can filter by. Type "waterlogging in Surat" and the incident appears in Gujarat, on the map,
in the state filter. The campus map is the offline fallback view, not the limit of the product.

**"Where is the chatbot?"**
It is on every screen — the floating button in the corner, the **Assistant** tab in the navigation, and beside
every incident. Talk to it before you file anything and it shows you live how the deterministic rules would
triage what you just said, then files it as a real incident with an ID on one click.

**"How is this different from just using ChatGPT?"**
A chatbot returns text to one person. SankatBrigade returns a *record*: a structured incident object with
an id, a priority produced by rules you can read, a verification state, a safe action, and a place in a
shared queue that other people work from. The assistant is one component inside that pipeline, not the
product.

**"Why deterministic rules instead of AI for the safety decisions?"**
Because a life-safety priority must be identical every time and explainable afterwards. Our rule set is
about a hundred readable lines; every incident can print the rule that produced its priority. A
generative model can be fluent and still be inconsistent between two identical inputs — the wrong
property for triage. We use the rules where correctness matters and keep the language layer for
explanation. If you want proof rather than a claim: **About → Run self-test** executes twelve checks
against the real engine in front of you, including running the same report fifty times and comparing the
output.

**"How do you handle misinformation?"**
By separating urgency from confidence. The bridge rumour is still treated as Critical, because a collapse
would be dangerous if true, but its verification state stays Unverified, it is flagged "do not broadcast
as confirmed", and its recommended action is "verify before broadcasting". We reduce confidence, never
urgency — de-prioritising a report because we doubt it is exactly how real incidents get missed.

**"Why does every report start as unverified?"**
Because one report is one person's account. Verification only advances with independent reports or an
official source. The Verification Shield shows the claim, the source, whether evidence exists, how many
independent reports there are, and what may be broadcast.

**"What is simulated?"**
The seeded queue rows, the three demo scenarios, the campus map, and operator actions such as changing a
status. All four are labelled in the UI. The extraction, triage, incident record, verification logic and
storage are real code running in the browser — and even the seeded rows are generated by that same real
pipeline.

**"Does it contact emergency services?"**
No, and it never claims to. There is no integration with police, fire, ambulance, hospitals or
government, and the app says so on every screen and inside the assistant. The safety banner tells people
to contact emergency services themselves for anything life-threatening.

**"Where does the data go?"**
Nowhere. Reports, photos and coordinates stay in this browser's `localStorage`. There is no server, no
database, no account and no API key in the project, which is also why nothing can leak from the
frontend.

**"Is it accessible / does it work on a phone?"**
Yes. Semantic HTML, ARIA labels, keyboard-operable queue rows and map markers, visible focus rings, a
skip link, honest fallbacks when geolocation or speech recognition is unavailable, `prefers-reduced-motion`
support, and layouts verified from 320 px upwards with no horizontal scrolling. It also installs as a PWA.

**"What would you build next?"**
Three things, in order: real corroboration by clustering reports that describe the same event; an export
handoff (CSV / a signed link) so an actual control room can ingest the queue; and a moderator role, since
the verification state is the part that most needs a human owner.

---

## Project structure

```
sankatbrigade/
  public/
    icons/                     original PWA icons (SVG + PNG, incl. maskable)
    manifest.webmanifest
    sw.js                      hand-written service worker (app-shell caching)
  src/
    hooks/
      useAssistant.ts          the assistant's brain: one conversation, three views
    components/
      AboutPage.tsx
      AssistantDock.tsx        floating launcher + docked panel (every screen)
      AssistantPage.tsx        full-screen Assistant view
      Badges.tsx               urgency / verification / status / demo chips
      CommandCenter.tsx        dashboard, filters, detail panel
      EmergencyReportForm.tsx  text, location, photo, voice
      Header.tsx
      Hero.tsx
      Icons.tsx                original inline SVG icon set
      IncidentAnalysis.tsx     analysis sequence + structured result
      IncidentQueue.tsx        table on desktop, cards on mobile
      InstallPrompt.tsx
      IntroLoader.tsx          cinematic CSS/SVG intro
      FeaturesSection.tsx      the seven capabilities, on the home page
      PrototypeMap.tsx         offline SVG campus map
      StreetMap.tsx            Leaflet + OpenStreetMap, with tile/offline fallbacks
      ResourceQueue.tsx        eight tracked resource types
      ResourcesPage.tsx
      SafetyNotice.tsx
      SankatBrigadeAssistant.tsx
      ScenarioButtons.tsx
      VerificationShield.tsx
    data/
      indiaPlaces.ts           offline index of Indian cities and states
      demoIncidents.ts         seeded rows, generated by the real pipeline
      demoScenarios.ts         the three demo scenarios
    types/
      incident.ts              the strict incident model
    utils/
      aiClient.ts              optional AI layer: probe, ask, fall back to rules
      geo.ts                   CAMPUS_ORIGIN, simulated demo coordinates, map links
      mediaStore.ts            session-only video/audio blobs (never uploaded)
      incidentExtractor.ts     deterministic keyword extraction + category scoring
      triageEngine.ts          deterministic triage rules R1–R4
      incidentFactory.ts       report → incident, re-analysis, operator actions
      storage.ts               localStorage with in-memory fallback
      labels.ts                every slug → human label
      router.ts                hash routing
    styles/
      globals.css              design system
      animations.css           keyframes + the intro loader
    App.tsx
    main.tsx
  functions/
    api/assistant.js           Cloudflare Pages Function — the AI key lives here
  server/
    aiCore.mjs                 shared prompt + provider adapters (server side only)
    index.mjs                  zero-dependency static server + /api/assistant
  Dockerfile
  docker-compose.yml
  .env.example                 the four AI variables, documented
  index.html
  vite.config.ts
  README.md
```

## Accessibility and responsiveness

- Mobile-first layouts verified from **320 px** to desktop, with no horizontal scrolling on any screen
- Collapsible navigation on small screens; the incident queue becomes cards instead of a wide table
- Semantic landmarks, a skip link, ARIA labels, `aria-live` for the analysis and assistant, and
  keyboard-operable table rows and map markers
- Visible focus rings on every interactive control; touch targets at least 38–46 px tall
- Colour is never the only signal — every urgency and verification state is also written out in text
- `prefers-reduced-motion` replaces the cinematic intro with a short professional fade and disables
  decorative motion

## Privacy

Everything you type, photograph or capture stays on your device in `localStorage`. Photos are downscaled
in the browser and never uploaded. Geolocation is optional, approximate, and never transmitted. If the
browser blocks storage, the app says so and keeps the data in memory for the session instead of failing.

---

**Made by Jaykrishna Navlani.** Built as a student prototype — SankatBrigade is not an emergency service,
and for immediate life-threatening danger you should contact local emergency services now.
