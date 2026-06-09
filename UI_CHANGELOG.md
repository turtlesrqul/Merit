# Merit UI Changelog

## 2026-06-09

### Preservation

- `e028dd9` - `checkpoint: preserve current Merit working tree before UI redesign`
  - Preserved the dirty pre-redesign working tree.
  - Created `pre-ui-redesign-working-tree-backup` and `pre-ui-redesign-checkpoint`.
  - Kept `.env.local` out of Git.

- `f6e04d3c` - `docs: record pre-ui redesign checkpoint`
  - Added checkpoint documentation and restore instructions.

- `c407bfc8` - `docs: audit Merit UI redesign references`
  - Captured the reference audit and design direction before implementation.

### Stage 1-3

- `f988fa7f` - `stage 1-3: implement approved editorial UI redesign foundations`
  - Added the shared editorial visual language.
  - Reworked the app shell, landing page, explore grid, public profile, public project detail, project cards, and share/contact profile actions.
  - Preserved existing data, auth, asset, and route behavior.

### Stage 4-6

- `df6d3982` - `stage 4-6: polish dashboard editors search and auth`
  - Polished search, profile studio, project editor, sign-in/sign-up, and password recovery surfaces.
  - Kept editor upload, validation, and Supabase persistence behavior intact.
  - Re-ran typecheck, production build, and tests successfully.

### Final Handoff

- Added `UI_REDESIGN_HANDOFF.md`.
- Added after-redesign screenshot evidence under `ui-reference-screenshots/after-redesign/`.
- Documented rendered QA evidence, known limitations, and restore instructions.

## Verification Summary

- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run test`: passed, 6 test files and 23 tests.
- Browser QA on `http://localhost:3004`: landing, landing-to-explore navigation, explore data load, and explore search filtering passed with no console warnings/errors.
