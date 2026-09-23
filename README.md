# SHPE Northwestern Member Engagement App

The official app for the SHPE chapter at Northwestern:
events with QR-code check-in/check-out and RSVP functionality, a chapter-wide points system, announcements, profile customization, and an organizer dashboard for officers. Built with Expo (React Native) and runs on iOS, Android, and web from one codebase, with
Firebase (Auth, Firestore, Cloud Storage) as the entire backend. Deployed using Vercel.

Live at [app.nushpe.org](https://app.nushpe.org).

## Features

- **Events** — create, RSVP, and check in/out via QR code (separate codes for
  check-in and check-out), with points awarded per category and a personal
  attendance history
- **Auth** — chapter-email verification, password reset, and change-password
  from Profile
- **Organizer tools** — a dedicated tab for admins/exec to create events and
  post announcements, plus a dashboard for managing members and pulling
  chapter data for reporting/analytics
- **Careers** — upload/manage a resume and career fields (grad term, job
  search status, work authorization) from Profile, with an admin résumé-book
  view and CSV export
- **Two roles** — `admin` (full access) and `exec` (event/announcement/QR
  tools, no member PII)

## Getting started

All app commands run from `frontend/`:

```bash
cd frontend
npm install
npx expo start        # press w for web, or scan the QR with Expo Go
```

You'll need a `frontend/.env` with `EXPO_PUBLIC_FIREBASE_*` values — see
`env_example.txt` at the repo root.

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # expo lint
npm test              # Playwright smoke tests against a web build
```

## Deployment

The web build deploys to **Vercel** at `app.nushpe.org` — push to `main`
deploys to production, PRs and `develop` get preview URLs. Firestore and
Storage security rules deploy separately from the repo root via the Firebase
CLI (`firebase deploy --only firestore:rules` / `--only storage`).

See [CLAUDE.md](CLAUDE.md) for the full architecture, data model, and
conventions this codebase follows.

## Credits

Originally built by the SHPE UIC chapter team, who put together the app's
first UI and core structure:

- Giselle Lechuga
- Esteban Garcia Taquez
- Guillermo Ramirez
- Andres Popoca
- Victor Samuel Escudero
- Emilio Calvo
- Joselyn De Loera
- Ariel Garcia
- Diego Perez-Aguilar

Rewritten and extended for SHPE Northwestern by Diego Perez-Aguilar, who
finalized most of the current feature set — auth and role permissions, event
check-in/check-out, RSVP, announcements, the organizer dashboard, the
careers section, and the Northwestern rebrand — on top of that
original foundation.
