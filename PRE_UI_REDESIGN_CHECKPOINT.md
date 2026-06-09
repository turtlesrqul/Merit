# Pre-UI Redesign Checkpoint

Date created: 2026-06-09 16:07:18 +08:00

## Checkpoint Summary

- Local backup path: `C:\Users\turtl\OneDrive\projects\merit-pre-ui-redesign-local-backup`
- Safety branch: `pre-ui-redesign-working-tree-backup`
- Protected checkpoint branch: `pre-ui-redesign-checkpoint`
- Active redesign branch: `approved-ui-redesign`
- Checkpoint commit hash: `e028dd9`
- Checkpoint commit message: `checkpoint: preserve current Merit working tree before UI redesign`

## What Was Preserved

The checkpoint commit preserves the current Merit working tree as source history, including:

- Existing modified app routes, API routes, components, libraries, tests, package files, and configuration files
- New auth, moderation, project, privacy, terms, setup, project-detail, and profile-related source files
- New brand, design experiment, documentation, and V4 wireframe files
- New Supabase migrations
- Intentional tracked deletions: `.eslintrc.json`, prior `.gitignore` contents, and `vitest.config.ts` replaced by `vitest.config.mjs`
- Updated `.gitignore` rules to keep secrets and generated artifacts out of Git

## Excluded From Git

These generated, local, or disposable files/folders were intentionally excluded from the checkpoint commit where applicable:

- `.env`
- `.env.*`
- `.env.local`
- `node_modules/`
- `.next/`
- `.vercel/`
- `logs/`
- `*.log`
- `dist/`
- `build/`
- `coverage/`
- `.codex-backups/`
- `.tmp-chrome-live-desktop/`
- `.tmp-chrome-live-mobile/`
- `.tmp-chrome-pdf/`
- `tsconfig.tsbuildinfo`
- `.DS_Store`
- `Thumbs.db`

## Environment File Handling

`.env.local` was not committed. It remains ignored by `.gitignore` and was not printed or copied into this document.

`.env.example` is committed with variable names and placeholder/example values only.

## Restore Instructions

To restore the exact Git checkpoint:

```powershell
git switch pre-ui-redesign-checkpoint
```

To create a new working branch from the checkpoint:

```powershell
git switch -c restore-from-pre-ui-redesign pre-ui-redesign-checkpoint
```

To restore from the local filesystem backup if Git is unavailable, copy files from:

```text
C:\Users\turtl\OneDrive\projects\merit-pre-ui-redesign-local-backup
```

back into a clean project directory, then reinstall dependencies with the package manager used by the project.

## Warnings

- The local backup is outside the repository and includes local working files needed for recovery. Treat it as private.
- `.env.local` contains local environment configuration and must remain outside Git.
- The protected checkpoint branch `pre-ui-redesign-checkpoint` should not be modified or deleted.
- All redesign work should continue only on `approved-ui-redesign`.
