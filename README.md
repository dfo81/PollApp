# PollApp

Create a survey, share the link, watch the answers come in live.

PollApp is a small survey tool without accounts: anyone can publish a survey, anyone with
the link can vote, and the results update while other people are still answering. Built
with Angular 21 and Supabase.

**Live:** [pollapp.dieter-foos.de](https://pollapp.dieter-foos.de)

---

## Features

- **Create surveys** with any number of questions, each with its own answer options and a
  choice between single and multiple answers
- **Optional end date** — the survey closes on its own, and past dates cannot be picked
- **Six categories** to sort by: Team Activities, Health & Wellness, Gaming &
  Entertainment, Education & Learning, Lifestyle & Preferences, Technology & Innovation
- **Live results** — every vote reaches all open browsers through Supabase Realtime, no
  reload needed
- **Running and past surveys** kept apart, with final results for the ones that ended
- **Fully keyboard operable** — the category dropdown and the date picker are custom
  built with arrow keys, Home/End, Enter and Escape
- **Responsive** from phone to desktop, with a draggable card carousel on the home screen

## Tech stack

|           |                                                     |
| --------- | --------------------------------------------------- |
| Framework | Angular 21, standalone components, signals          |
| Backend   | Supabase (PostgreSQL, Row Level Security, Realtime) |
| Styling   | SCSS, no UI library                                 |
| Tests     | Vitest                                              |

The app has no login. Everything it is allowed to do is enforced by Row Level Security in
the database, so the anon key in the bundle is public by design.

---

## Getting started

### 1. Requirements

- Node.js 20.19+ or 22.12+ (what Angular 21 requires)
- A free [Supabase](https://supabase.com) project

### 2. Install

```bash
git clone git@github.com:dfo81/PollApp.git
cd PollApp
npm install
```

### 3. Set up the database

Open the SQL editor of your Supabase project and run the two migrations from
`supabase/migrations/` in order:

1. `0001_poll_schema.sql` — tables, RLS policies and the realtime publication
2. `0002_normalize_categories.sql` — category names

The policies are what keep the app safe without a login:

| Table                             | anon may                                                    |
| --------------------------------- | ----------------------------------------------------------- |
| `surveys`, `questions`, `options` | read and create                                             |
| `votes`                           | read, and create **only while the survey is still running** |
| everything                        | no update, no delete                                        |

### 4. Add your credentials

Project URL and anon key are in your Supabase project under **Settings → API**. Put them
into both environment files:

```ts
// src/environments/environment.ts
export const environment = {
  production: true,
  supabaseUrl: 'https://<project>.supabase.co',
  supabaseAnonKey: '<your-anon-key>',
};
```

`src/environments/environment.development.ts` takes the same values with
`production: false`.

### 5. Run

```bash
npm start
```

The app is then at `http://localhost:4200/`.

### 6. Demo data (optional)

```bash
npm run seed
```

Writes ten example surveys with questions, answers and a plausible spread of votes.
Surveys whose title already exists are skipped, so the script can be re-run safely.

Entries with a negative `endsInDays` in `scripts/demo-surveys.mjs` are seeded as already
ended, and those stay without votes: the RLS policy rejects votes on a closed survey, and
anon may not backdate one afterwards.

---

## Scripts

| Command         | What it does                                                                       |
| --------------- | ---------------------------------------------------------------------------------- |
| `npm start`     | Development server on port 4200                                                    |
| `npm run build` | Production build into `dist/pollapp/browser/`                                      |
| `npm run watch` | Rebuilds on every change                                                           |
| `npm test`      | Unit tests with Vitest                                                             |
| `npm run seed`  | Writes the demo surveys into Supabase                                              |
| `npm run types` | Regenerates `database.types.ts` — needs the Supabase CLI and `SUPABASE_PROJECT_ID` |

---

## Project structure

```
src/app/
├── components/
│   ├── home/                 Landing page with the survey lists
│   ├── surveys/              Card carousel and the sortable list
│   ├── create-survey/        The create form, shown as a dialog
│   ├── category-select/      Keyboard operable category dropdown
│   ├── date-picker/          Own calendar, the native one cannot be styled
│   ├── published-survey/     The ballot people vote on
│   ├── survey-view/          Detail page: ballot next to the results
│   ├── survey-results/       Bars per answer, live or final
│   ├── header/ · legal/      Shell
└── core/
    ├── survey-service.ts     All reads and writes against Supabase
    ├── survey-mapping.ts     Database rows ↔ the models components use
    ├── survey.models.ts      Types and shared helpers
    └── supabase.ts           The single Supabase client
```

### Routes

| Path          | Page                                               |
| ------------- | -------------------------------------------------- |
| `/`           | Home, with running and past surveys                |
| `/survey/:id` | One survey: vote on the left, results on the right |
| `/legal`      | Imprint                                            |

Creating a survey deliberately has no route of its own — it is a dialog over the page
you are on.

---

## Deployment

```bash
npm run build
```

Upload the **contents** of `dist/pollapp/browser/` to the document root of your webspace:
`index.html`, the hashed `main-*.js` and `styles-*.css`, `favicon.ico`, the `assets/`
folder — and `.htaccess`.

That last one matters. `/survey/:id` and `/legal` do not exist on the server, so without a
rewrite rule any reload or shared link answers 404. `public/.htaccess` sends everything
that is not a real file to `index.html` and is copied into every build automatically. It
is a hidden file, so switch on "show hidden files" in your FTP client — leaving it behind
is the single most common way to break an Angular deployment.

If the app does not sit at the root of a domain or subdomain but in a folder such as
`example.com/pollapp/`, set `<base href="/pollapp/">` in `src/index.html` and build again.

---

## Code conventions

- No comments except JSDoc; every function is documented
- No function longer than 14 lines
- No file longer than 400 lines
- Prettier with a print width of 100 and single quotes

---

## Credits

The fonts under `public/assets/fonts/` — Nerko One, Mulish and Nokora — are used under the
SIL Open Font License; each folder carries its own `OFL.txt`.
