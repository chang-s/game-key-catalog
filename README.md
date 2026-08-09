# Sola's Game Key Bakery

A small, mobile-first catalog where friends can browse Sola's available game keys and copy a friendly request. It is not a storefront: there are no accounts, payments, checkout, or public redemption codes.

## Running locally

Requires Node.js 22.22.2+, Node.js 24.15.0+, or Node.js 26+. Your Node.js 24.19.0 environment is supported. This project uses npm and commits `package-lock.json` for reproducible installs.

```sh
npm install
npm run dev
```

For a lockfile-exact clean install, use `npm ci`.

Open the local address printed in the terminal. Run `npm test` for catalog behavior checks.

## Updating inventory

The existing Google Sheet remains the source of truth. The public site reads only the sanitized snapshot at `src/data/games.json`; it never connects to Google or exposes credentials.

1. Update and verify the permanent **Game Inventory** sheet according to `PROJECT.md`.
2. Download that tab as a CSV into a private working location outside the public app.
3. Run `npm run sync -- "path/to/Game Inventory.csv"`.
4. Copy approved covers named by the Sheet's `Image Filename` into `public/covers/`.
5. Run `npm test` and `npm run build`, then review the catalog.

The sync script maps the established columns, includes only positive platform quantities, normalizes IDs, and refuses output when it detects a redemption-code-shaped value. Still review every generated diff before publishing. Never put raw portal screenshots, Microsoft URLs, credentials, or redemption codes in public folders.

## Adding new games

Follow the permanent ID, cover naming, classification, formula, and quality-control rules in `PROJECT.md`. Do not invent IDs or classifications in the website data. Once the Sheet is verified, use the update workflow above.

## Production build

```sh
npm run build
npm start
```

The static site is written to `dist/`. The production server binds to `0.0.0.0`
and uses the platform-provided `PORT`, defaulting to port 3000 locally. It has no
runtime dependencies, required environment variables, or persistent storage.

## Deployment

The Vite `base` setting uses relative assets, so `dist/` can be hosted on Railway,
GitHub Pages, a container, or another static host. On a Node hosting platform, use
`npm ci`, `npm run build`, and `npm start`. `PORT` is supplied by the host and is
the only supported runtime setting; it is operational rather than secret.

## Public/private boundary

- Public and safe: `src/`, `public/covers/`, configuration, tests, and documentation.
- Private/local only: `screenshots/`, `catalog/`, `private/`, `source/`, and `working/` (ignored by Git).

The original local source material is preserved in place and is not copied into the app.
