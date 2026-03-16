# CLAUDE.md — гдеЯ? (gdeya-web)

## Project Overview

**гдеЯ?** ("Where am I?" in Russian) is a static single-page tool that lets website owners serve different content to Russian vs. international users — without VPNs or separate sites. Both content variants are XOR-encrypted and embedded directly in the page HTML, making them unreadable in raw source code.

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
├── LICENSE           # MIT
└── README.md         # Minimal placeholder
```

---

## Technology Stack

- **No build tooling.** No npm, no bundler, no transpiler.
- **Vanilla HTML/CSS/JS** (ES5-compatible, no arrow functions, no modules).
- **Static hosting** via GitHub Pages.
- A simple `git push` to `master` deploys immediately.

---

## How the System Works

### Architecture

There are two independent pieces:

1. **`index.html`** — The generator UI. Users input Russian and international content variants, click "Generate", and receive two HTML snippets to copy into their own site.

2. **`loader.v1.js`** — The runtime loader. Website owners embed this in their `<head>`. It fires a `HEAD` request to `https://gdeya.bolotov.dev/geo/ru` with a 1500ms timeout:
   - Request succeeds → user is **not** in Russia → reveal `data-gdeya-intl` content
   - Request times out or fails → user is **in Russia** (Russian ISPs block this endpoint) → reveal `data-gdeya-ru` content

### Encryption Scheme

Both content variants are encoded using:
1. **XOR cipher** with key `'gdeya2026'` (repeating key, byte-by-byte XOR against UTF-8 bytes)
2. **Base64** wrapping the XOR output

The same key is used for both encode (in `index.html`) and decode (in `loader.v1.js`). This is obfuscation, not cryptographic security — the key is public in the loader script.

### Data Attributes

The generated HTML snippet uses two data attributes on a single element:

```html
<div data-gdeya-ru="<base64-encoded-xor>" data-gdeya-intl="<base64-encoded-xor>"></div>
```

The loader queries all `[data-gdeya-ru]` elements and sets `innerHTML` to the decoded content of the appropriate attribute. Content fades in via a CSS `opacity` transition.

---

## Key Code Details

### `index.html` — Generator (lines 350–406)

```js
var KEY = 'gdeya2026';
var LOADER = '<script src="https://gdeya.bolotov.dev/loader.v1.js" defer><\/script>';
```

- `encode(text)` — XORs UTF-8 bytes against the key, then Base64-encodes
- Generate button is disabled until both textarea fields are non-empty
- Output: Step 1 = loader `<script>` tag; Step 2 = the data-attribute snippet
- Copy buttons use `navigator.clipboard.writeText()` with fallback to `window.getSelection()`

### `loader.v1.js` — Runtime (36 lines)

```js
var CHECK_URL = 'https://gdeya.bolotov.dev/geo/ru';
var TIMEOUT_MS = 1500;
```

- Uses `AbortController` + `setTimeout` for the 1500ms timeout
- `fetch` with `method: 'HEAD'` (minimal request, no body)
- `reveal(attr)` fades in decoded `innerHTML` for all matching elements

### `geo/ru`

An empty file deployed at the path `/geo/ru`. Its sole purpose is to be an HTTP endpoint that Russian ISPs block. No content needed — only the HTTP status matters.

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
- ES5 syntax: `var`, `function`, `.forEach()` callbacks, no arrow functions
- DOM selection: `getElementById`, `querySelector`, `querySelectorAll`
- No framework, no jQuery
- Event delegation for copy buttons (single listener on `document`)

---

## Important Constraints

- **Do not introduce npm/build tooling** unless there is a strong, explicit reason. The zero-dependency nature is intentional.
- **Do not change the encryption key** (`gdeya2026`) without updating both `index.html` and `loader.v1.js` simultaneously. Changing one breaks all existing embedded snippets.
- **Do not rename or move `geo/ru`** — this path is hardcoded in `loader.v1.js` and changing it breaks all deployed integrations.
- **Do not change the data attribute names** (`data-gdeya-ru`, `data-gdeya-intl`) — they are part of the public API used by all sites that have embedded the loader.
- **Maintain ES5 compatibility** in `loader.v1.js` to support older browsers.
- **The loader script is externally hosted** — any changes to `loader.v1.js` take effect immediately for all sites using it. Test carefully.
