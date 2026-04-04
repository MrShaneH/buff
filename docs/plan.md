# Buff — Project Plan

> An AI-powered browser extension that reads a website's HTML/CSS and rewrites it to be modern, responsive, and mobile-friendly. Uses the user's own AI API key (BYOK). No backend required.

---

## 1. Project Overview

### Problem
Millions of websites — particularly government, academic, local business, and community sites — are desktop-only, visually outdated, and unusable on mobile. Their owners will never update them. Users have no recourse.

### Solution
A Chrome extension that, when invoked, sends the page's structure to an AI model (Claude or OpenAI), receives improved CSS, and injects it directly into the live page. The user needs no CSS knowledge.

### Key Design Principles
- **BYOK (Bring Your Own Key)** — user supplies their own Anthropic or OpenAI API key. No backend, no cost to developer, no privacy concerns.
- **CSS injection only** — never rewrite HTML. Injecting a `<style>` block is safe and reversible; rewriting the DOM breaks JS event listeners.
- **Non-destructive** — always preserve a reset path back to the original styles via `.buff-active` class removal.
- **Per-site persistence** — generated CSS is saved to `chrome.storage` keyed by domain, auto-applied on return visits.
- **Progressive improvement** — large pages can be improved incrementally across multiple runs; CSS merges additively.

---

## 2. Target Use Cases (Priority Order)

1. **Local business & community sites** — small town papers, council sites, hobby forums.
2. **Academic & research sites** — university departments, journals, library portals.
3. **Government websites** — high-traffic, mandatory-use, chronically neglected. 92% of US federal sites fail mobile-friendliness tests.
4. **Legacy corporate sites** — older intranets and public-facing portals.

---

## 3. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Extension framework | **WXT** | Vite-based, framework-agnostic, MV3, multi-browser, file-based entrypoints |
| Language | **TypeScript** | Type safety across all scripts |
| UI | **Angular 17+ + Tailwind** | Developer familiarity; Angular's Vite-based app builder integrates via `@analogjs/vite-plugin-angular` |
| AI provider | **Anthropic Claude API** (primary), OpenAI (secondary) | Claude excels at structured code output |
| Default model | **claude-sonnet-4-6** | Best quality/cost ratio; Haiku and Opus selectable per user preference |
| Storage | **chrome.storage.local** | Per-site CSS persistence, API key storage, active state tracking |
| Build | **WXT build pipeline** | Outputs to `.output/chrome-mv3` for Chrome; supports Firefox target |

---

## 4. Repository Structure

```
buff/
├── wxt.config.ts                 # WXT + Vite config (Angular plugin, manifest)
├── package.json
├── tsconfig.json
│
├── public/
│   └── icon.png                  # 512×512 extension icon
│
├── entrypoints/
│   ├── popup.html                # Popup entry point (bootstraps Angular)
│   ├── popup/
│   │   ├── main.ts               # Angular bootstrap for popup
│   │   ├── app.component.ts
│   │   └── components/
│   │       ├── status-bar/       # Current site + improvement status
│   │       ├── action-buttons/   # Improve / Improve More / Reset / Regenerate
│   │       └── theme-hints/      # Optional user hint input
│   │
│   ├── options.html              # Options entry point (bootstraps Angular)
│   ├── options/
│   │   ├── main.ts               # Angular bootstrap for options
│   │   ├── app.component.ts
│   │   └── components/
│   │       ├── api-key-form/     # API key input + validate button
│   │       ├── provider-selector/# Claude vs OpenAI toggle
│   │       ├── model-selector/   # Haiku / Sonnet / Opus selector
│   │       └── saved-sites/      # Per-site cache list with clear buttons
│   │
│   ├── content.ts                # Content script — DOM reader + CSS injector
│   └── background.ts             # Service worker — API calls, storage management
│
├── lib/
│   ├── extractPageStructure.ts   # Smart page skeleton extraction with truncation
│   ├── sanitizeCSS.ts            # Value-aware CSS safety filter
│   ├── buildPrompt.ts            # AI prompt constructor (.buff-active scoping)
│   ├── apiClient.ts              # Claude + OpenAI API calls with fence extraction
│   └── storage.ts                # chrome.storage helpers
│
└── tests/
    ├── extractPageStructure.test.ts
    ├── sanitizeCSS.test.ts
    ├── buildPrompt.test.ts
    └── apiClient.test.ts
```

---

## 5. Bootstrap Steps

### Step 1 — Environment Setup

```bash
# Prerequisites: Node.js 18+, npm 9+

# Scaffold WXT project with vanilla TypeScript template
npm create wxt@latest pageai -- --template vanilla-ts
cd pageai
npm install
```

### Step 2 — Install Dependencies

```bash
# Angular and its Vite integration
npm install @angular/core @angular/common @angular/platform-browser @angular/forms
npm install -D @analogjs/vite-plugin-angular

# Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init

# AI providers
npm install @anthropic-ai/sdk openai

# Dev/test
npm install -D typescript @types/chrome vitest
```

### Step 3 — Configure WXT + Angular

Create `wxt.config.ts` at the project root:

```typescript
import { defineConfig } from 'wxt';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  manifest: {
    name: 'Buff',
    version: '0.1.0',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['<all_urls>']
  },
  vite: () => ({
    plugins: [angular()]
  })
});
```

Entrypoints that serve Angular (popup, options) each need an HTML file that bootstraps an Angular module:

```html
<!-- entrypoints/popup.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Buff</title>
  </head>
  <body>
    <app-root></app-root>
    <script type="module" src="./popup/main.ts"></script>
  </body>
</html>
```

```typescript
// entrypoints/popup/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';

bootstrapApplication(AppComponent).catch(console.error);
```

Repeat the same pattern for `entrypoints/options.html` and `entrypoints/options/main.ts`.

---

### Step 4 — Implement `lib/extractPageStructure.ts`

Extracts a structural skeleton of the page. Applies smart truncation — never chunks, never sends full HTML.

```typescript
export interface PageSlice {
  htmlSkeleton: string;
  existingCSS: string;
  viewport: { width: number; height: number };
  url: string;
  sliceIndex: number;      // 0 = above-fold, 1+ = subsequent sections
  totalEstimatedSlices: number;
}

export function extractPageStructure(sliceIndex = 0): PageSlice {
  const clone = document.documentElement.cloneNode(true) as HTMLElement;

  // Remove text content, leaving only structural tags and attributes
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  const textNodes: Node[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach(n => (n.textContent = ''));

  // Remove non-structural elements
  clone.querySelectorAll('script, noscript, svg, img, video, iframe').forEach(el => el.remove());

  // For slice 0: prioritise above-fold elements
  // For slice 1+: pull from sections further down the page
  const allSections = Array.from(clone.querySelectorAll('body > *, main > *, article > *'));
  const sliceSize = Math.ceil(allSections.length / 3);
  const start = sliceIndex * sliceSize;
  const sliceElements = allSections.slice(start, start + sliceSize);

  const htmlSkeleton = sliceElements.map(el => el.outerHTML).join('\n').substring(0, 15000);

  // Prioritise layout-critical CSS rules; drop decorative rules if over limit
  const allRules = Array.from(document.styleSheets)
    .filter(s => !s.href || s.href.startsWith(location.origin))
    .flatMap(s => {
      try { return Array.from(s.cssRules).map(r => r.cssText); }
      catch { return []; }
    });

  const layoutKeywords = ['width', 'display', 'float', 'grid', 'flex', 'position', 'margin', 'padding'];
  const layoutRules = allRules.filter(r => layoutKeywords.some(k => r.includes(k)));
  const otherRules = allRules.filter(r => !layoutKeywords.some(k => r.includes(k)));
  const existingCSS = [...layoutRules, ...otherRules].join('\n').substring(0, 10000);

  const totalEstimatedSlices = Math.max(1, Math.ceil(allSections.length / sliceSize));

  return {
    htmlSkeleton,
    existingCSS,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    url: location.hostname,
    sliceIndex,
    totalEstimatedSlices
  };
}
```

---

### Step 5 — Implement `lib/buildPrompt.ts`

All selectors are scoped under `.buff-active` for high specificity without blanket `!important` abuse.

```typescript
import type { PageSlice } from './extractPageStructure';

export function buildPrompt(pageData: PageSlice, userHint?: string): string {
  const progressNote = pageData.totalEstimatedSlices > 1
    ? `This is section ${pageData.sliceIndex + 1} of ~${pageData.totalEstimatedSlices} sections on the page.`
    : '';

  return `You are an expert CSS developer. You will receive the HTML skeleton and CSS of a website.
Your job is to return ONLY a CSS string that, when injected as a <style> block, will:

1. Make the layout fully responsive and mobile-friendly
2. Improve typography (readable font sizes, line heights, sensible font stacks)
3. Modernise the visual design (clean spacing, updated colour palette if needed)
4. Fix obvious accessibility issues (contrast, touch target sizes)
5. NOT break any existing functionality or layout logic
6. NOT use the * selector
7. Prefix ALL selectors with .buff-active for high specificity (e.g. .buff-active body, .buff-active .container)
8. NOT use position: fixed or position: absolute unless strictly necessary for a navigation element

${progressNote}
${userHint ? `The user has also requested: "${userHint}"` : ''}

Return ONLY valid CSS. No markdown fences, no explanation, no preamble.

PAGE DATA:
${JSON.stringify(pageData)}`;
}
```

---

### Step 6 — Implement `lib/sanitizeCSS.ts`

Value-aware sanitizer — blocks dangerous *values*, not entire properties. Preserves the layout-fixing CSS the AI needs to do its job.

```typescript
export function sanitizeCSS(rawCSS: string): string {
  let cleaned = rawCSS;

  // Strip * selector rules entirely
  cleaned = cleaned.replace(/\*\s*\{[^}]*\}/g, '');

  // Strip @import rules
  cleaned = cleaned.replace(/@import[^;]+;/gi, '');

  // Block dangerous position values (allow: relative, static, sticky)
  cleaned = cleaned.replace(/position\s*:\s*(fixed|absolute)\s*;/gi, '');

  // Block pixel-exact widths/heights (allow: %, vw, vh, em, rem, 100%, auto, min-*, max-*)
  cleaned = cleaned.replace(/(?<!\S)(width|height)\s*:\s*\d+px\s*;/gi, '');

  // Block display: none (allow: flex, grid, block, inline-*, etc.)
  cleaned = cleaned.replace(/display\s*:\s*none\s*;/gi, '');

  // Block extreme z-index values
  cleaned = cleaned.replace(/z-index\s*:\s*(\d+)\s*;/gi, (match, val) =>
    parseInt(val, 10) > 999 ? '' : match
  );

  return cleaned.trim();
}
```

---

### Step 7 — Implement `lib/apiClient.ts`

Supports model selection. Strips markdown fences from responses before returning.

```typescript
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type Provider = 'anthropic' | 'openai';
export type AnthropicModel = 'claude-haiku-4-5' | 'claude-sonnet-4-6' | 'claude-opus-4-6';
export type OpenAIModel = 'gpt-4o-mini' | 'gpt-4o';

function extractCSS(raw: string): string {
  const fenceMatch = raw.match(/```(?:css)?\s*([\s\S]*?)```/);
  return fenceMatch ? fenceMatch[1].trim() : raw.trim();
}

export async function generateCSS(
  prompt: string,
  apiKey: string,
  provider: Provider = 'anthropic',
  model: string = 'claude-sonnet-4-6'
): Promise<string> {
  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    const message = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });
    return extractCSS((message.content[0] as { text: string }).text);
  }

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096
    });
    return extractCSS(response.choices[0].message.content ?? '');
  }

  throw new Error('Unknown provider');
}

export async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    await client.models.list();
    return true;
  } catch {
    return false;
  }
}

export async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    await client.models.list();
    return true;
  } catch {
    return false;
  }
}
```

---

### Step 8 — Implement Content Script (`entrypoints/content.ts`)

Injects and removes CSS. Manages `.buff-active` class on `<html>`. Auto-applies cached CSS on page load. Writes active state to storage.

```typescript
import { extractPageStructure } from '../lib/extractPageStructure';
import { sanitizeCSS } from '../lib/sanitizeCSS';

const STYLE_TAG_ID = 'buff-injected-styles';

export function injectCSS(css: string): void {
  removeInjectedCSS();
  const style = document.createElement('style');
  style.id = STYLE_TAG_ID;
  style.textContent = css;
  document.head.appendChild(style);
  document.documentElement.classList.add('buff-active');
  chrome.storage.local.set({ [`active:${location.hostname}`]: true });
}

export function removeInjectedCSS(): void {
  document.getElementById(STYLE_TAG_ID)?.remove();
  document.documentElement.classList.remove('buff-active');
  chrome.storage.local.set({ [`active:${location.hostname}`]: false });
}

// Auto-apply cached CSS on page load
chrome.storage.local.get(
  [`css:${location.hostname}`, `autoApply:${location.hostname}`],
  (result) => {
    const cached = result[`css:${location.hostname}`];
    const autoApply = result[`autoApply:${location.hostname}`] !== false; // default true
    if (cached && autoApply) injectCSS(cached);
  }
);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PAGE_STRUCTURE') {
    sendResponse({ structure: extractPageStructure(message.sliceIndex ?? 0) });
  }
  if (message.type === 'INJECT_CSS') {
    const safe = sanitizeCSS(message.css);
    injectCSS(safe);
    sendResponse({ success: true });
  }
  if (message.type === 'RESET_CSS') {
    removeInjectedCSS();
    sendResponse({ success: true });
  }
  return true;
});
```

---

### Step 9 — Implement Background Worker (`entrypoints/background.ts`)

Orchestrates the API call flow. Supports CSS merging for progressive improvement.

```typescript
import { generateCSS } from '../lib/apiClient';
import { buildPrompt } from '../lib/buildPrompt';
import { getStoredCSS, storeCSS, getSettings } from '../lib/storage';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'IMPROVE_PAGE') {
    (async () => {
      try {
        const { apiKey, provider, model } = await getSettings();
        if (!apiKey) {
          sendResponse({ error: 'No API key configured. Open extension settings.' });
          return;
        }

        // Use cached CSS unless force-regenerating
        const cached = await getStoredCSS(message.domain);
        if (cached && !message.forceRegenerate && message.sliceIndex === 0) {
          sendResponse({ css: cached, fromCache: true });
          return;
        }

        const prompt = buildPrompt(message.pageStructure, message.userHint);
        const newCSS = await generateCSS(prompt, apiKey, provider, model);

        // Merge with existing CSS for progressive improvement
        const existingCSS = message.sliceIndex > 0 ? (cached ?? '') : '';
        const mergedCSS = existingCSS ? `${existingCSS}\n\n/* Slice ${message.sliceIndex} */\n${newCSS}` : newCSS;

        await storeCSS(message.domain, mergedCSS);
        sendResponse({ css: mergedCSS, fromCache: false });
      } catch (err) {
        sendResponse({ error: String(err) });
      }
    })();
    return true;
  }
});
```

---

### Step 10 — Implement Storage Helpers (`lib/storage.ts`)

```typescript
export interface Settings {
  apiKey: string;
  provider: 'anthropic' | 'openai';
  model: string;
}

export async function getSettings(): Promise<Settings> {
  return new Promise(resolve => {
    chrome.storage.local.get(['apiKey', 'provider', 'model'], result => {
      resolve({
        apiKey: result.apiKey ?? '',
        provider: result.provider ?? 'anthropic',
        model: result.model ?? 'claude-sonnet-4-6'
      });
    });
  });
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  return new Promise(resolve => chrome.storage.local.set(settings, resolve));
}

export async function getStoredCSS(domain: string): Promise<string | null> {
  return new Promise(resolve => {
    chrome.storage.local.get([`css:${domain}`], result => {
      resolve(result[`css:${domain}`] ?? null);
    });
  });
}

export async function storeCSS(domain: string, css: string): Promise<void> {
  return new Promise(resolve => chrome.storage.local.set({ [`css:${domain}`]: css }, resolve));
}

export async function clearStoredCSS(domain: string): Promise<void> {
  return new Promise(resolve =>
    chrome.storage.local.remove([`css:${domain}`, `active:${domain}`, `autoApply:${domain}`], resolve)
  );
}

export async function getAllSavedDomains(): Promise<string[]> {
  return new Promise(resolve => {
    chrome.storage.local.get(null, result => {
      resolve(Object.keys(result).filter(k => k.startsWith('css:')).map(k => k.replace('css:', '')));
    });
  });
}

export async function setAutoApply(domain: string, enabled: boolean): Promise<void> {
  return new Promise(resolve => chrome.storage.local.set({ [`autoApply:${domain}`]: enabled }, resolve));
}
```

---

### Step 11 — Build & Load in Chrome

```bash
# Development mode with hot reload
npm run dev

# In Chrome:
# 1. Go to chrome://extensions
# 2. Enable "Developer Mode" (top right)
# 3. Click "Load unpacked"
# 4. Select the .output/chrome-mv3 folder
```

### Step 12 — Production Build

```bash
npm run build
# Output: .output/chrome-mv3

npm run zip
# Produces a .zip ready for Chrome Web Store upload
```

---

## 6. Popup UI Specification

```
┌─────────────────────────────┐
│  ⚡ Buff              ⚙️  │
├─────────────────────────────┤
│  Current site:              │
│  irs.gov                    │
│                             │
│  Status: ✅ Improved        │
│                             │
│  [ Improve This Page ]      │
│  [ Improve More ]           │  ← appears after first run on large pages
│  [ Regenerate ]             │
│  [ Reset to Original ]      │
│                             │
│  ☑ Auto-apply on visit      │  ← toggle; default on
│                             │
│  Optional hint:             │
│  ┌─────────────────────┐    │
│  │ make it darker...   │    │
│  └─────────────────────┘    │
│                             │
│  ⚠ Page is large — results  │  ← shown when extraction hits caps
│    may be partial            │
└─────────────────────────────┘
```

**Popup states:**
- **No API key** → prompt to open settings (no other controls shown)
- **Not yet improved** → show Improve This Page only
- **Loading** → spinner with "Analysing page..." message; disable all buttons
- **Improved (cached)** → show Improve More (if page is large), Regenerate, Reset, auto-apply toggle
- **Improved (fresh)** → same as cached
- **Error** → error message with Retry button

**State source of truth:** The popup reads `css:{domain}` and `active:{domain}` from `chrome.storage.local` on open — no message round-trips needed just to determine current state.

---

## 7. Options Page Specification

```
┌──────────────────────────────────────┐
│  Buff Settings                     │
├──────────────────────────────────────┤
│  AI Provider                         │
│  ○ Anthropic (Claude)  ● OpenAI      │
│                                      │
│  Model                               │
│  ○ Haiku (fast, cheap)               │
│  ● Sonnet (recommended)              │
│  ○ Opus (highest quality)            │
│                                      │
│  API Key                             │
│  ┌────────────────────────────────┐  │
│  │ sk-ant-...                     │  │
│  └────────────────────────────────┘  │
│  [ Validate Key ]   ✅ Key valid     │
│  (validates via models.list() — no   │
│   token spend)                       │
│                                      │
│  Saved Sites  (3 sites improved)     │
│  • irs.gov              [Clear]      │
│  • legislature.ca.gov   [Clear]      │
│  • old-forum.net        [Clear]      │
│                          [Clear All] │
│                                      │
│  [ Save Settings ]                   │
└──────────────────────────────────────┘
```

---

## 8. Execution Steps

Each step ends at a testable checkpoint. The project can be paused and resumed at any step boundary.

| Step | Scope | Checkpoint |
|---|---|---|
| **Step 1 — Scaffold + Settings** | WXT + Angular setup, popup shell, options page, storage helpers, API key validation | Settings page saves/loads correctly; extension installs without errors |
| **Step 2 — Core Library** | `extractPageStructure`, `buildPrompt`, `apiClient`, `sanitizeCSS` — all pure functions, fully unit tested | `npm test` passes; all lib functions testable without a browser |
| **Step 3 — Content + Background** | `content.ts` (inject/remove/auto-apply), `background.ts` (API call, cache, merge), message protocol typed | Full improvement flow triggerable from DevTools console via `chrome.runtime.sendMessage` |
| **Step 4 — Popup Wiring** | All 5 popup states wired, all buttons connected, auto-apply toggle, storage as state source of truth | Complete user flow works end-to-end through the popup |
| **Step 5 — Progressive Improvement** | Smart truncation, slice-based extraction, CSS merging, "Improve More" button, large-page warning | Works correctly on a large government site (e.g. irs.gov) without broken layouts |
| **Step 6 — Hardening** | Saved sites list in options, error states, retry logic, keyboard shortcut (`Alt+Shift+P`), test on 10 real sites | No silent failures; every error surfaces a human-readable message |
| **Step 7 — Publish** | Icon, onboarding for first-time users, privacy policy page, store listing copy, zip and submit | Extension live on Chrome Web Store |

---

## 9. Known Technical Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Page HTML too large for AI context window | Smart truncation (layout CSS prioritised, above-fold first). Progressive improvement for large pages. Token warning shown in popup. |
| Injected CSS breaks page layout | Value-aware sanitizer (blocks dangerous *values*, not whole properties). Instant Reset via `.buff-active` class removal. |
| JS-driven styles fighting injected CSS | All AI-generated selectors scoped under `.buff-active` on `<html>` for high specificity. |
| AI returns markdown-fenced CSS | `extractCSS()` in `apiClient.ts` strips fences before returning; silent, zero-cost fix. |
| Shadow DOM content not styled | Documented limitation; noted in UI that some embedded widgets may not be affected. |
| CSP headers blocking style injection | Use `chrome.scripting.insertCSS()` which bypasses page CSP. |
| API key exposed in storage | Stored in `chrome.storage.local` (not synced). Reminder shown in options UI that key stays on-device. |
| Chrome Web Store review for `<all_urls>` | Justification: extension only activates on explicit user click; reads no personal data. |
| High per-call API cost | Default model is Sonnet (~$0.08/call). Haiku available for cost-conscious users (~$0.02/call). |
| WXT Angular compatibility (no official module) | Angular integrates via `@analogjs/vite-plugin-angular` Vite plugin. Vanilla-ts WXT template used as base. |

---


