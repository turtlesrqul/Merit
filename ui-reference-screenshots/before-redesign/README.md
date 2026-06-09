# Before Redesign Screenshots

Baseline screenshot capture was attempted on 2026-06-09 after starting the current app at `http://localhost:3004`.

The Next dev server responded successfully, but screenshot capture was blocked by local tooling:

- Browser plugin attempt 1: in-app webview did not attach.
- Browser plugin attempt 2: navigation timed out.
- Browser plugin visible retry: navigation failed before loading the target URL.
- Local Playwright was not installed.
- No Chrome, Edge, or Chromium executable was available on PATH or in standard install locations.

The current working app is preserved in Git at checkpoint commit `e028dd9` and in the external backup at `C:\Users\turtl\OneDrive\projects\merit-pre-ui-redesign-local-backup`.
