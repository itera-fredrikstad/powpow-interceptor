# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PowPow Interceptor is a Chrome extension (Manifest V3) that intercepts network requests on Power Pages portals using the Chrome DevTools Protocol (`chrome.debugger`). It replaces web files (JS/CSS) and web template script blocks with content served from a local PowPow CLI dev server, enabling fast local development without uploading to the portal.

## Commands

- `pnpm dev` — Watch mode build (outputs to `dist/`)
- `pnpm build` — Type-check + lint + production build
- `pnpm build:dev` — Type-check + development build (no minification)
- `pnpm check` — Run Biome checks (lint + format)
- `pnpm fix` — Auto-fix lint and format issues

No test framework is configured.

## Code Style (Biome)

- Tabs for indentation (width 4)
- Single quotes in JS/TS
- Line width: 240
- Import organization handled by Biome assist
- `noNonNullAssertion` is disabled; all other recommended rules are on

Run `pnpm fix` to auto-format before committing.

## Architecture

The extension has two independent entry points built by Vite (see `vite.config.ts`):

### Background Service Worker (`src/background.ts`)
The core of the extension. Runs as a Chrome service worker with no DOM access.

1. **Settings** — Loads/saves `PowPowSettings` to `chrome.storage.local`
2. **Manifest fetch** — Fetches the file manifest from the local dev server (`http://localhost:{port}/manifest`) to learn which web files and web templates are available
3. **Debugger attachment** — Attaches Chrome DevTools Protocol v1.3 to tabs matching the target hostname
4. **Request interception** — Uses `Fetch.enable` to intercept requests:
   - **Web files** (JS/CSS): Matched at request stage against `webFileUrlMap`, fulfilled with content from the dev server
   - **Web templates**: Matched at response stage by parsing HTML for `<script data-webtemplate-id="...">` blocks, replaced with dev server content
5. **Port communication** — Broadcasts settings and app state to connected popup instances

### Popup UI (`src/index.tsx` → `src/components/App.tsx`)
React 19 + Tailwind CSS v4 popup shown when clicking the extension icon.

- `BackgroundStore` (`src/lib/BackgroundStore.ts`) — Connects to the background service worker via `chrome.runtime.connect()`, manages state snapshots, and auto-reconnects on disconnect. Used with React's `useSyncExternalStore`.
- `useSettings` / `useAppState` hooks consume the store
- Components: `GlobalToggle` (enable/disable), `Settings` (port + hostname inputs with validation), `StatusIndicator` (manifest load state + counts)

### Types (`src/types/`)
- `RuntimeMessage` — Discriminated union defining the port message protocol between popup and background
- `Manifest`, `ManifestWebFile`, `ManifestWebTemplate` — Dev server manifest shape
- `ManifestLoadState` — Enum: ServerUnreachable (-1), NotLoaded (0), Loading (1), Loaded (2)

## Loading the Extension for Development

1. Run `pnpm dev` (or `pnpm build:dev`)
2. Open `chrome://extensions`, enable Developer Mode
3. Click "Load unpacked" and select the `dist/` directory
