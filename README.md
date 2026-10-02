# The Gloaming Shelf

A dark-fantasy book discovery site. Readers can choose a reading mood, select one or more genres (or leave genres open), and draw a surprise pick from their device-local TBR and Open Library.

## Requirements

- Node.js 20.9 or newer (Node 22 is used in CI)
- npm

## Run locally

```bash
npm ci
npm run dev
```

Open http://localhost:3000. The app has no login system. Uploaded reading lists are saved in the current browser's local storage and are not synced between devices.

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```

GitHub Actions runs these checks on pushes to `main` and on pull requests.

## Production deployment

`.github/workflows/deploy.yml` deploys `main` to Vercel using Vercel's Next.js-aware build. Add these repository **Actions secrets** in GitHub before enabling the workflow:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Get the token from Vercel and the organization/project IDs from the linked Vercel project settings or its local Vercel project configuration. The workflow runs `vercel build --prod` and deploys the prebuilt output; it does not configure a static export.

Do not use a GitHub Pages workflow or set `output: "export"` in `next.config.ts`. Static export cannot run the `/api/books` Route Handler, which proxies searches to Open Library. If an older Pages workflow is enabled in the GitHub repository, disable it and use the Vercel deployment workflow instead.

## Private GitHub repository

Create a new repository on GitHub and set its visibility to **Private**. Do not initialize the remote with a README, since this project already has one. Then connect and push this working tree:

```bash
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-PRIVATE-REPOSITORY.git
git push -u origin main
```

Replace the remote URL with the private repository's URL. Never commit `.env` files, access tokens, or personal reading-list exports. The current app does not require API keys.

## Hosting

GitHub can host the private source repository, but GitHub Pages cannot run this project as-is: the recommendation endpoint at `app/api/books/route.ts` is a Next.js server Route Handler that calls Open Library. Deploy the project to a Next.js-capable host such as Vercel and connect it to the private GitHub repository. Keep the deployment protected if the website itself must be private; a private source repository does not automatically make its deployed URL private.

The Open Library Search API is called server-side. Genre choices are combined into a query; results are normalized, ranked, and shuffled before the selected book is revealed.

## Reader data

TBR and reading-history CSV/JSON files are parsed in the browser and saved in local storage. Clearing site data in the browser removes these lists. This prototype has no shared account database, cross-device sync, or organizer dashboard yet.