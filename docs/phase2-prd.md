# PRD: Phase 2 — Core Library + Provider Settings

## Problem Statement

The extension can validate an Anthropic API key but cannot yet improve a page. The library functions that read page structure, construct AI prompts, sanitise returned CSS, and call the AI API do not exist. Only Anthropic is supported, locking out users who prefer OpenAI. The storage schema established in Phase 1 does not match the target design and must be migrated before further features are built on top of it.

## Solution

Build the complete pure-function library layer that Phase 3 (content script and background worker) will depend on. Extend the options page with a provider selector so users can choose between Anthropic and OpenAI. Migrate the storage schema to a single-provider design. All library modules are fully unit-tested without requiring a real browser or a live API call.

## User Stories

1. As a developer, I want `lib/extractPageStructure.ts` implemented so that I have a function that extracts a structural skeleton of any page ready to send to the AI.
2. As a developer, I want `extractPageStructure` to strip text content and non-structural elements so that the AI prompt stays within token limits.
3. As a developer, I want `extractPageStructure` to prioritise layout-critical CSS rules so that the most important context is always included even when truncation is required.
4. As a developer, I want `extractPageStructure` to expose viewport dimensions and the current URL so the AI can make responsive layout decisions.
5. As a developer, I want `extractPageStructure` to support slice-based extraction so that large pages can be improved incrementally across multiple runs.
6. As a developer, I want `lib/buildPrompt.ts` implemented so that page data and an optional user hint can be assembled into a complete, well-structured AI prompt.
7. As a developer, I want all AI-generated selectors scoped under `.buff-active` as specified in the prompt so that injected CSS has high specificity without blanket `!important` usage.
8. As a developer, I want the prompt to include a progress note when the page has multiple slices so the AI knows it is working on a partial view.
9. As a developer, I want `lib/sanitizeCSS.ts` implemented so that dangerous CSS values returned by the AI cannot break page layouts or introduce security risks.
10. As a developer, I want `sanitizeCSS` to strip `*` selector rules, `@import` statements, `display: none`, extreme `z-index` values, and dangerous `position` values.
11. As a developer, I want `sanitizeCSS` to block pixel-exact `width` and `height` values while preserving responsive units so that the AI's layout improvements are not undermined.
12. As a developer, I want `generateCSS` implemented in `lib/apiClient.ts` so that the background worker can request improved CSS from either Anthropic or OpenAI using a single function call.
13. As a developer, I want `generateCSS` to automatically strip markdown code fences from AI responses so that raw CSS is always returned regardless of model output style.
14. As a developer, I want `validateOpenAIKey` implemented so that users can confirm their OpenAI key is accepted before using the extension.
15. As a developer, I want the `Settings` interface migrated to `{ apiKey, provider, model }` so that all modules share a single canonical schema.
16. As a developer, I want `getSettings` to handle migration from the Phase 1 schema transparently so that existing users do not lose their saved Anthropic key on upgrade.
17. As a user, I want to select Anthropic or OpenAI as my AI provider so that I can use whichever service I have an account with.
18. As a user, I want the API key input label and placeholder to reflect my selected provider so that I know which key to enter.
19. As a user, I want the Validate Key button to test my key against the selected provider so that I get accurate feedback for the provider I have chosen.
20. As a user, I want switching to a different provider to clear my saved key so that I am prompted to enter the correct key for the new provider.
21. As a user, I want successfully validating a new provider's key to permanently remove any key stored for the previous provider so that stale credentials are not retained on my device.
22. As a user, I want the extension to automatically use `claude-sonnet-4-6` when Anthropic is selected so that I get good quality results without needing to configure a model.
23. As a user, I want the extension to automatically use `gpt-4o` when OpenAI is selected so that I get good quality results without needing to configure a model.

## Implementation Decisions

**Modules built or modified in Phase 2:**

- **`lib/extractPageStructure.ts`** — exports a `PageSlice` interface and `extractPageStructure(sliceIndex?: number): PageSlice`. Reads from live `document` and `window` globals; no dependency injection. Pipeline: clone `document.documentElement`; strip text nodes and non-structural elements (`script`, `noscript`, `svg`, `img`, `video`, `iframe`); collect top-level sections (`body > *, main > *, article > *`); divide into thirds by section count; select the third at `sliceIndex`; truncate `htmlSkeleton` to 15 000 characters. CSS: read `document.styleSheets`, filter to same-origin sheets, partition into layout-critical rules (containing `width`, `display`, `float`, `grid`, `flex`, `position`, `margin`, `padding`) and others, concatenate layout-first, truncate `existingCSS` to 10 000 characters. Return `{ htmlSkeleton, existingCSS, viewport: { width, height }, url, sliceIndex, totalEstimatedSlices }`.

- **`lib/buildPrompt.ts`** — pure function `buildPrompt(pageData: PageSlice, userHint?: string): string`. Serialises `pageData` as JSON into the prompt body. Includes a slice progress note when `totalEstimatedSlices > 1`. Includes the user hint when provided. Returns a complete prompt string ready to pass to `generateCSS`.

- **`lib/sanitizeCSS.ts`** — pure string transformation `sanitizeCSS(rawCSS: string): string`. Operations applied in order: strip `* { ... }` blocks; strip `@import` rules; remove `position: fixed` and `position: absolute` declarations; remove `width: <n>px` and `height: <n>px` declarations (pixel-exact sizing only — `border: 1px solid` is unaffected); remove `display: none` declarations; remove `z-index` values greater than 999. Returns the trimmed result with all other declarations preserved.

- **`lib/apiClient.ts`** (extended) — adds `Provider` type (`'anthropic' | 'openai'`), `generateCSS(prompt, apiKey, provider, model): Promise<string>` (calls `client.messages.create` for Anthropic or `client.chat.completions.create` for OpenAI, max 4096 tokens each, result piped through an internal `extractCSS` helper that strips markdown fences), and `validateOpenAIKey(apiKey): Promise<boolean>` (calls OpenAI `models.list()`, returns `true` on success and `false` on any error). The `openai` npm package is added as a production dependency.

- **`lib/storage.ts`** (schema migration) — `Settings` interface changes to `{ apiKey: string, provider: 'anthropic' | 'openai', model: string }`. `getSettings` detects the Phase 1 shape (presence of `anthropicApiKey`) and migrates: maps `anthropicApiKey` → `apiKey`, sets `provider: 'anthropic'`, sets `model: 'claude-sonnet-4-6'`, writes back in the new shape, then resolves. All callers always receive the new shape. `saveSettings` signature and behaviour are unchanged. Phase 1 stubs (`getSavedSites`, `saveSite`, `removeSite`) remain as stubs.

- **`entrypoints/options/components/provider-selector/`** — new standalone Angular component. Renders two radio inputs for Anthropic and OpenAI. Receives the current provider via `input()`. Emits a `providerChange` event via `output()` when the user selects a different option.

- **`entrypoints/options/app.component.ts`** (promoted to coordinator) — reads settings from storage on init; owns `provider` and `apiKey` signals; passes them to child components via `input()`; handles the `providerChange` output from `provider-selector` by clearing `apiKey` and updating `provider`; calls `saveSettings` with the new provider and its default model whenever the provider changes.

- **`entrypoints/options/components/api-key-form/`** (updated) — receives `provider` via `input()`. Uses it to show the correct label (`Anthropic API Key` / `OpenAI API Key`) and placeholder (`sk-ant-…` / `sk-…`). Dispatches to `validateAnthropicKey` or `validateOpenAIKey` on button click. On successful validation passes the provider's default model to `saveSettings`. Emits a `saved` output after a successful validate-and-save.

**Architectural decisions:**

- `extractPageStructure` reads live globals directly — no injected document parameter. Tests use happy-dom's document populated with fixture HTML.
- The options page coordinator pattern (`app.component.ts` owns shared state, children communicate via `input()`/`output()`) is the established pattern for all future options page additions.
- Switching provider clears the stored key in storage immediately — the user must re-enter a valid key for the new provider before the extension can call the AI.
- `model` is set programmatically to the provider default at save time; no model selector is exposed in the UI this phase.
- The `openai` package is added as a production dependency alongside the existing `@anthropic-ai/sdk`.

## Testing Decisions

**What makes a good test:** Tests assert observable outputs given specific inputs — return values, storage state, rendered DOM. They do not inspect internal signal values, private methods, or implementation details. A test should remain valid after an internal refactor that preserves external behaviour.

**Modules tested in Phase 2:**

- **`lib/extractPageStructure`** — vitest with happy-dom. Populate `document.body` with fixture HTML before each test. Assertions: empty page returns a valid `PageSlice` with an empty skeleton; text nodes are absent from the skeleton; non-structural elements (`script`, `img`) are absent from the skeleton; `sliceIndex` selects the correct section partition; `htmlSkeleton` is truncated at 15 000 characters; `existingCSS` is truncated at 10 000 characters; layout-critical rules appear before decorative rules in `existingCSS`.

- **`lib/buildPrompt`** — pure function tests. Assertions: output contains the serialised `pageData`; output contains the user hint when provided; output omits the hint section when not provided; output contains the slice progress note only when `totalEstimatedSlices > 1`.

- **`lib/sanitizeCSS`** — pure function tests, one test per sanitisation rule. Assertions: strips `*` selector blocks; strips `@import`; removes `position: fixed`; removes `position: absolute`; removes pixel-exact `width`/`height`; removes `display: none`; removes `z-index > 999`; safe values (`position: relative`, `display: flex`, `z-index: 10`, `width: 100%`, `border: 1px solid`) are returned unchanged.

- **`lib/apiClient` — `generateCSS`** — `vi.mock` for `@anthropic-ai/sdk` and `openai`. Assertions: correct SDK method is called for each provider; markdown fences are stripped from the response; raw CSS is returned unchanged when no fences are present.

- **`lib/storage` — settings migration** — uses the existing `chrome.storage` mock. Seed the mock with the Phase 1 shape (`buff_settings: { anthropicApiKey: '...', openAiApiKey: '', model: '' }`), call `getSettings`, assert returned object matches the new schema, assert the store is rewritten in the new shape.

- **`provider-selector` component** — Angular TestBed. Assertions: both radio options render; selecting OpenAI emits the `providerChange` output with value `'openai'`; selecting Anthropic emits with value `'anthropic'`.

- **`api-key-form` component** (extended) — add to existing TestBed suite. Assertions: when `provider` input is `'openai'`, label reads "OpenAI API Key"; clicking Validate calls `validateOpenAIKey` not `validateAnthropicKey`; on successful validate with `provider: 'openai'`, `saveSettings` is called with `model: 'gpt-4o'`; on successful validate with `provider: 'anthropic'`, `saveSettings` is called with `model: 'claude-sonnet-4-6'`.

**Approach:**
- Angular `TestBed` with standalone component imports for all component tests — same pattern as `tests/api-key-form.test.ts`
- `vi.mock` for `lib/apiClient.ts` in all component tests to avoid real network calls
- `vi.mock` for `@anthropic-ai/sdk` and `openai` in `apiClient` unit tests

## Out of Scope

- Model selector UI — model is set automatically per provider; user-selectable models are a future feature
- Content script (`entrypoints/content.ts`) — Phase 3
- Background service worker (`entrypoints/background.ts`) — Phase 3
- Full `storage.ts` implementation (`getStoredCSS`, `storeCSS`, `clearStoredCSS`, `getAllSavedDomains`, `setAutoApply`) — Phase 3
- Saved sites list in options — Phase 6
- Popup wiring and all popup states — Phase 4
- Progressive improvement / "Improve More" flow — Phase 5
- Tailwind styling of any component — components remain unstyled until a dedicated styling phase
- Firefox support — future roadmap

## Further Notes

- **Phase 2 checkpoint:** `npm test` passes for all new and updated modules; `npm run build` completes without errors; the options page shows a provider selector and correctly validates keys for both Anthropic and OpenAI.
- **Resumability:** Phase 2 ends with a complete, tested library layer. Phase 3 can import `extractPageStructure`, `buildPrompt`, `sanitizeCSS`, and `generateCSS` directly with no further changes to the lib layer.
- The `sanitizeCSS` pixel-exact rule targets standalone `width: <n>px` and `height: <n>px` property declarations only — shorthand values such as `border: 1px solid` are not affected.
- The migration in `getSettings` is a one-way, one-time operation. Once data is written in the new schema, the migration branch is never entered again.
