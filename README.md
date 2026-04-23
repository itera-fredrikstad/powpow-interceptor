[![Publish to Chrome Web Store](https://github.com/itera-fredrikstad/powpow-interceptor/actions/workflows/publish-chrome.yml/badge.svg?branch=main)](https://github.com/itera-fredrikstad/powpow-interceptor/actions/workflows/publish-chrome.yml)

# PowPow Interceptor

[PowPow CLI](https://github.com/itera-fredrikstad/powpow-cli) companion browser extension.

## Overview

PowPow Interceptor uses the Chrome DevTools Protocol (`chrome.debugger`) to intercept network requests on a target Power Pages portal and replace **web files** (JS, CSS) and **web template** `<script>` blocks with content served from the [PowPow CLI](https://github.com/itera-fredrikstad/powpow-cli) dev server. This enables a fast local edit → browser refresh development loop without uploading changes to the portal.

## Features

- **Web file interception** — JS and CSS requests are matched against a manifest and fulfilled from localhost
- **Web template injection** — HTML document responses are scanned for `<script data-webtemplate-id="...">` blocks and replaced with local versions
- **Automatic tab attachment** — The debugger attaches to all tabs matching the configured portal hostname
- **Global on/off toggle** — Enable or disable all interceptions with a single click
- **Status indicator** — See at a glance whether the dev server is connected, how many files are loaded, and how many tabs are being intercepted
- **Persistent settings** — Dev server port and target hostname are saved to `chrome.storage.local`

## How It Works

1. **Manifest load** — On enable, the extension fetches a manifest from the PowPow CLI dev server (`http://localhost:<port>/manifest`) listing all available web files and web templates with their GUIDs and serve paths.
2. **Tab attachment** — The extension attaches `chrome.debugger` to every open tab whose URL matches the configured target hostname.
3. **Request interception** — Using `Fetch.enable`, the extension pauses Script/Stylesheet requests and Document responses.
4. **Web file replacement** — Script and stylesheet requests whose URL path matches a manifest entry are fulfilled with content from the dev server.
5. **Web template replacement** — Document responses are scanned for `<script>` tags with a `data-webtemplate-id` attribute matching a manifest GUID. Matching blocks are replaced with local content.

## Installation

### From the Chrome Web Store

> Coming soon — the extension is published via a GitHub Actions workflow on release.

### Manual / Development Install

1. **Clone the repo**

   ```bash
   git clone https://github.com/itera-fredrikstad/powpow-interceptor.git
   cd powpow-interceptor
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Build the extension**

   ```bash
   pnpm build
   ```

   This compiles TypeScript, runs Biome lint checks, and outputs the extension to `dist/`.

4. **Load in Chrome**

   - Navigate to `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the `dist/` directory

### Development Mode

Run the Vite build in watch mode for rapid iteration:

```bash
pnpm dev
```

After each rebuild, click the refresh icon on the extension card in `chrome://extensions` to reload.

## Usage

1. Start the PowPow CLI dev server in your project:

   ```bash
   npx powpow dev
   ```

2. Click the PowPow Interceptor icon in the Chrome toolbar to open the popup.

3. Configure:
   - **Dev server port** — The port PowPow CLI is serving on (default: `3001`)
   - **Target portal hostname** — The hostname of your Power Pages portal (e.g. `myportal.powerappsportals.com`)

4. Flip the **toggle** to enable interception.

5. The status bar shows the connection state:
   - 🟢 **Connected** — Manifest loaded, showing file/template counts and intercepted tab count
   - 🟡 **Loading** — Fetching manifest from the dev server
   - 🔴 **Server not reachable** — Dev server is not running or port is wrong
   - ⚪ **Extension disabled** — Toggle is off

6. Navigate to (or refresh) your portal — assets are now served from your local build.

## Permissions

| Permission | Reason |
| --- | --- |
| `debugger` | Attach to tabs and intercept/modify network requests via the Chrome DevTools Protocol |
| `storage` | Persist extension settings (port, hostname, enabled state) |
| `tabs` | Query open tabs to auto-attach the debugger to matching portals |
| `http://localhost/*` | Fetch the manifest and file contents from the local PowPow CLI dev server |

## Tech Stack

- **React 19** + **TypeScript** — Popup UI
- **Tailwind CSS v4** — Styling
- **Vite 8** — Build tooling (with Rolldown)
- **Biome** — Lint & format
- **Chrome Extension Manifest V3** — Service worker background script

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Build in watch mode (Vite) |
| `pnpm build` | Type-check, lint, and production build |
| `pnpm build:dev` | Development build (no minification) |
| `pnpm check` | Run Biome checks |
| `pnpm fix` | Auto-fix lint and format issues |

## CI/CD

A [GitHub Actions workflow](.github/workflows/publish-chrome.yml) automatically publishes the extension to the Chrome Web Store when a GitHub release is created. The version in `manifest.json` is set from the release tag.

## Related

- [PowPow CLI](https://github.com/itera-fredrikstad/powpow-cli)

## License

[ISC](LICENSE)
