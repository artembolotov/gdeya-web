# CLAUDE.md — гдеЯ? (gdeya-web)

## Project Overview

**гдеЯ?** ("Where am I?" in Russian) is a static single-page tool that lets website owners serve different content to Russian vs. international users — without VPNs or separate sites. Both content variants are XOR-encoded and embedded directly in the page HTML, making them unreadable in raw source code.

**Live site:** https://gdeya-pages.bolotov.dev
**Loader CDN:** https://gdeya.bolotov.dev/loader.v1.js

---

## Repository Structure

```
gdeya-web/
├── index.html        # Single-page app: UI, generator logic, embedded styles
├── loader.v1.js      # Client-side geo-detection and content reveal script
├── geo/
│   └── ru            # Empty file — served as an HTTP endpoint to detect Russian IP blocks
├── CNAME             # GitHub Pages custom domain: gdeya-pages.bolotov.dev
├── .gitignore        # Standard git ignore rules
├── LICENSE           # MIT
└── README.md         # Russian-language project documentation
```

---

## Technology Stack

- **No build tooling.** No npm, no bundler, no transpiler.
- **Vanilla HTML/CSS/JS** — ES5 syntax, modern browser APIs (see below).
- **Static hosting** via GitHub Pages (origin server).
- **CDN** proxies `gdeya.bolotov.dev` and handles geo-blocking at the CDN layer.
- A simple `git push` to `master` deploys immediately.

---

## How the System Works

### Architecture

There are two independent pieces:

1. **`index.html`** — The generator UI. Users input Russian and international content variants, click "Generate", and receive two HTML snippets to copy into their own site.

2. **`loader.v1.js`** — The runtime loader. Website owners embed this in their `<head>`. It fires a `HEAD` request to `https://gdeya.bolotov.dev/geo/ru` with a 1500ms timeout:
   - **200 response** → user is **not** in Russia → reveal `data-gdeya-intl` content
   - **403 or timeout (1500ms)** → user is **in Russia** → reveal `data-gdeya-ru` content

### CDN / Geo-blocking Layer

The origin server (GitHub Pages) serves `geo/ru` as an empty file returning 200 for everyone. The CDN at `gdeya.bolotov.dev` intercepts requests and returns **403 for Russian IPs**. CORS headers are also configured on the CDN side, not the origin. This means:

- Changing `geo/ru` on the origin has no meaningful effect (CDN handles the blocking).
- CDN cache miss behavior determines when changes propagate.

### Encoding Scheme

Both content variants are encoded using:
1. **XOR cipher** with key `'gdeya2026'` (repeating key, byte-by-byte XOR against UTF-8 bytes)
2. **Base64** wrapping the XOR output

The same key is used for both encode (in `index.html`) and decode (in `loader.v1.js`). This is obfuscation, not cryptographic security — the key is public in the loader script.

### Data Attributes

The generated HTML snippet uses two data attributes on a single element:

```html
<div data-gdeya-ru="<base64-encoded-xor>" data-gdeya-intl="<base64-encoded-xor>"></div>
```

The loader queries all `[data-gdeya-ru]` elements and sets `innerHTML` to the decoded content of the appropriate attribute. Content fades in via a CSS `opacity` transition using `requestAnimationFrame`.

---

## Key Code Details

### `index.html` — Generator (lines 350–406)

```js
var KEY = 'gdeya2026';
var LOADER = '<script src="https://gdeya.bolotov.dev/loader.v1.js" defer><\/script>';
```

- `encode(text)` — uses `TextEncoder` to get UTF-8 bytes, XORs against the key, then `btoa()` for Base64
- Generate button is disabled until both textarea fields are non-empty
- **Wrapper tag selector**: user can choose `span` (inline), `div` (block, default), or `p` (paragraph)
- Output has three steps:
  - Step 1: loader `<script>` tag (add once to `<head>`)
  - Step 2: the data-attribute snippet (insert at desired location)
  - Step 3: live preview showing both content variants side-by-side
- Copy buttons use `navigator.clipboard.writeText()` with fallback to `document.createRange()` + `window.getSelection()`

### `loader.v1.js` — Runtime (37 lines)

```js
var CHECK_URL = 'https://gdeya.bolotov.dev/geo/ru';
var TIMEOUT_MS = 1500;
var KEY = 'gdeya2026';
```

- Uses `AbortController` + `setTimeout` for the 1500ms timeout
- `fetch` with `method: 'HEAD'` (minimal request, no body)
- On fetch resolve: checks `r.ok`; if not ok, throws (so non-2xx responses fall through to `.catch`)
- `.catch()` reveals Russian content (handles both network failure and timeout/abort)
- `.finally()` clears the timeout timer to prevent memory leaks
- `reveal(attr)` — for each `[data-gdeya-ru]` element: sets `opacity: 0`, sets `innerHTML` to decoded content, then uses `requestAnimationFrame` to trigger a `0.5s ease` opacity fade-in

### `geo/ru`

An empty file deployed at the path `/geo/ru`. Its sole purpose is to exist as an HTTP endpoint. No content needed — the CDN layer handles returning 200 vs. 403 based on IP geo-location.

---

## Development Workflow

### Local Development

No install step needed. Serve directly with any HTTP server:

```bash
python3 -m http.server 8080
# or
npx serve .
```

Then open `http://localhost:8080`.

**Note:** The geo-detection will not work locally because it depends on the CDN at `gdeya.bolotov.dev`. The generator UI and encoding logic can be tested locally; the loader's geo behavior requires the live CDN.

### Making Changes

- Edit `index.html` for UI, styles, or generator logic changes
- Edit `loader.v1.js` for geo-detection or content-reveal changes
- The `geo/ru` file should remain empty
- No compilation or build step required

### Deployment

```bash
git add <files>
git commit -m "description"
git push origin master
```

GitHub Pages deploys automatically. The CNAME file routes `gdeya-pages.bolotov.dev` to the Pages server.

---

## CSS Conventions

- **CSS Variables** defined on `:root` for all colors, spacing, and fonts
- **Dark mode** via `@media (prefers-color-scheme: dark)` — override the same variables
- **Accent color**: `#d85a30` (light) / `#f0a030` (dark)
- **Max content width**: `680px` via `--max`
- **Monospace font stack**: `'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Courier New', monospace`
- Mobile breakpoint at `480px`
- No external CSS libraries or resets (manual `box-sizing: border-box` reset)

## JavaScript Conventions

- IIFE pattern: `(function () { ... })()` — no globals exposed
- **Syntax**: ES5 (`var`, named `function` declarations, `.forEach()` callbacks, no arrow functions, no destructuring, no template literals)
- **APIs**: Modern browser APIs are used freely (`fetch`, `AbortController`, `TextEncoder`, `TextDecoder`, `requestAnimationFrame`, `navigator.clipboard`) — these are not ES5 APIs, but are supported in all browsers that matter for this use case
- DOM selection: `getElementById`, `querySelector`, `querySelectorAll`
- No framework, no jQuery
- Event delegation for copy buttons (single listener on `document`)

---

## Important Constraints

- **Do not introduce npm/build tooling** unless there is a strong, explicit reason. The zero-dependency nature is intentional.
- **Do not change the encryption key** (`gdeya2026`) without updating both `index.html` and `loader.v1.js` simultaneously. Changing one breaks all existing embedded snippets.
- **Do not rename or move `geo/ru`** — this path is hardcoded in `loader.v1.js` and changing it breaks all deployed integrations.
- **Do not change the data attribute names** (`data-gdeya-ru`, `data-gdeya-intl`) — they are part of the public API used by all sites that have embedded the loader.
- **Maintain ES5 syntax** in `loader.v1.js` for maximum compatibility, even though modern browser APIs are required.
- **Never make breaking changes to `loader.v1.js`** — this file is already embedded on third-party sites via CDN URL. Any change that alters behavior (detection logic, attribute names, timing, encoding) will silently break those sites. Instead, create a new versioned file (e.g. `loader.v2.js`) and update `index.html` to reference the new URL. The old version must remain unchanged and functional indefinitely.
- **Safe edits to `loader.v1.js`** (the only ones allowed in-place): fixing a clear bug where the current behavior is unambiguously wrong, or purely cosmetic changes (comments, whitespace) that have zero runtime effect.
- **Do not add `Cache-Control` or CDN configuration to the repo** — CDN settings are managed separately and are not part of this repository.
