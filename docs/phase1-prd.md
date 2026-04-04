# PRD: Phase 1 — Scaffold + Settings

## Problem Statement

There is no runnable Buff Chrome extension to build on. Without a working scaffold, Angular integration, and a functional settings page, no subsequent phase can be implemented or tested. Developers starting work have nowhere to begin, and users have no way to configure the API key that every other feature depends on.

## Solution

Set up the WXT + Angular project scaffold so the extension installs in Chrome, a minimal popup placeholder renders, and a functional options page allows users to enter and validate their Anthropic API key. Tailwind is installed and configured. Storage helpers are stubbed with typed interfaces. A minimal test suite is established so every subsequent phase has a working foundation to build on.

## User Stories

1. As a developer, I want a WXT project scaffold so that I have a runnable Chrome extension to build on.
2. As a developer, I want Angular 17+ integrated via @analogjs/vite-plugin-angular so that I can build the UI with my preferred framework.
3. As a developer, I want standalone Angular components with signals so that the codebase follows modern Angular conventions throughout.
4. As a developer, I want Tailwind CSS installed and configured so that later phases can style components without additional setup.
5. As a developer, I want the extension to build without errors so that I can load it in Chrome via "Load unpacked".
6. As a developer, I want a hot-reload dev mode so that I can iterate quickly during development.
7. As a developer, I want a provisioned `lib/storage.ts` with typed interfaces and stubbed function signatures so that later phases have a clear contract to implement against.
8. As a developer, I want `lib/apiClient.ts` provisioned with `validateAnthropicKey` implemented so that key validation works in Phase 1 and the rest of the file can be filled in during Phase 2.
9. As a developer, I want a vitest test runner configured so that I have a working test foundation for all subsequent phases.
10. As a developer, I want a `chrome.storage` mock available in tests so that storage behavior can be verified without a real browser environment.
11. As a user, I want to open the extension popup and see a minimal placeholder so that I know the extension is installed correctly.
12. As a user, I want to open the extension options page so that I can configure the extension.
13. As a user, I want to see an API key input field on the options page so that I can enter my Anthropic API key.
14. As a user, I want to click a "Validate Key" button so that I can confirm my key is accepted before using the extension.
15. As a user, I want validation to run without spending tokens so that confirming my key has no cost.
16. As a user, I want to see a success indicator when my key is valid so that I know I can proceed.
17. As a user, I want to see a clear error message when my key is invalid so that I know to check or replace it.
18. As a user, I want to see a loading state while validation is in progress so that I know the extension is working.
19. As a user, I want my API key to persist across browser sessions so that I don't have to re-enter it every time I open Chrome.
20. As a user, I want the options page to load my previously saved API key on open so that I can see what is currently configured.
21. As a user, I want to update my API key and re-validate so that I can switch keys without reinstalling the extension.
22. As a user, I want the validate button to be disabled while validation is in progress so that I cannot trigger duplicate requests.

## Implementation Decisions

**Modules built in Phase 1:**

- **WXT config** (`wxt.config.ts`) — defines manifest (name: Buff, version: 0.1.0, permissions: storage + activeTab + scripting, host_permissions: \<all_urls\>); wires in the Angular Vite plugin via `@analogjs/vite-plugin-angular`
- **Popup entrypoint** (`entrypoints/popup.html`, `entrypoints/popup/main.ts`, `entrypoints/popup/app.component.ts`) — Angular standalone component bootstrap; renders a minimal placeholder (extension name + "coming soon" text); no interactive controls
- **Options entrypoint** (`entrypoints/options.html`, `entrypoints/options/main.ts`, `entrypoints/options/app.component.ts`) — Angular standalone component bootstrap; hosts the API key form component
- **API key form component** (`entrypoints/options/components/api-key-form/`) — standalone Angular component; uses signals for all reactive state (current key value, validation status); reads saved key from `chrome.storage.local` on init via storage module; saves key to storage then calls `validateAnthropicKey` on button click; displays one of four states: idle, validating, valid, invalid
- **Key validation** (`lib/apiClient.ts`) — provisioned with `validateAnthropicKey(apiKey: string): Promise<boolean>` implemented using Anthropic SDK `models.list()`; `generateCSS` and all OpenAI functions are absent or stubbed until Phase 2
- **Storage module stub** (`lib/storage.ts`) — all interfaces fully defined (`Settings`); all function signatures present with correct types; function bodies throw `NotImplementedError` or return typed empty values; full implementation deferred to Phase 2; the one exception is `getSettings` and `saveSettings` which must work in Phase 1 to support API key persistence
- **Test setup** — vitest configured; a `tests/setup.ts` file provides a `chrome` global mock that stubs `chrome.storage.local` with an in-memory Map; mock resets between tests

**Architectural decisions:**
- Angular standalone components throughout — no NgModules
- Signals used for all reactive state within components — no RxJS unless required by Angular internals
- `chrome.storage.local` is the source of truth for the API key; options component reads on init and writes on validate
- Anthropic-only validation in Phase 1; OpenAI validation deferred to Phase 2
- `validateAnthropicKey` calls `models.list()` — no token spend, no side effects
- `getSettings` and `saveSettings` are the only two storage functions that need working implementations in Phase 1; all others remain stubbed

## Testing Decisions

**What makes a good test:** Tests verify observable behavior — what a component renders, what it writes to storage, what a function returns — not internal implementation details like signal values or private methods. Tests should remain valid after an internal refactor that preserves external behavior.

**Modules tested in Phase 1:**

- **Popup AppComponent** — smoke test: component mounts without throwing; asserts placeholder text is present in the DOM
- **ApiKeyFormComponent** — asserts that on mount, the saved key is loaded from storage and pre-fills the input; asserts that clicking Validate writes the key to storage then calls `validateAnthropicKey`; asserts the status indicator reflects valid/invalid/loading states; asserts the validate button is disabled during validation
- **chrome.storage mock** — round-trip test: `set` followed by `get` returns the correct value; confirms the mock is reliable for use in all subsequent phase tests

**Approach:**
- Angular `TestBed` with standalone component imports for component tests
- `vi.mock` for `lib/apiClient.ts` to avoid real network calls in component tests
- `tests/setup.ts` vitest setup file provides the `chrome` global before each test file runs

## Out of Scope

- Provider selector (OpenAI support) — deferred to Phase 2
- Model selector — deferred to Phase 2
- Saved sites list in options — deferred to Phase 6
- Any popup interactivity or functional states — deferred to Phase 4
- Content script (`entrypoints/content.ts`) — Phase 3
- Background service worker (`entrypoints/background.ts`) — Phase 3
- `lib/extractPageStructure.ts`, `lib/buildPrompt.ts`, `lib/sanitizeCSS.ts` — Phase 2
- Full `lib/storage.ts` implementation beyond `getSettings`/`saveSettings` — Phase 2
- Full `lib/apiClient.ts` implementation (`generateCSS`, OpenAI functions) — Phase 2
- Tailwind component styling — Tailwind is installed but components are unstyled in Phase 1
- Progressive improvement — Phase 5
- Firefox support — Phase 2 roadmap
- Production build and Chrome Web Store listing — Phase 7

## Further Notes

- **Phase 1 checkpoint:** Extension installs in Chrome without errors; options page saves and loads an API key; validation correctly distinguishes a valid from an invalid Anthropic key; `npm test` passes.
- **Resumability:** Phase 1 ends at a clean boundary. Every subsequent phase has a working scaffold, typed storage contracts, a test runner, and a loadable extension to build on top of.
- Storage function stubs should match the final signatures exactly so Phase 2 can fill in bodies without changing call sites elsewhere in the codebase.
