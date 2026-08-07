# SHPE Northwestern App

Expo (React Native) app for the SHPE chapter at Northwestern: events, QR-code
event check-in, member profiles, and an organizer view for officers.

Runs on iOS, Android, and web from one codebase.

## Repo state — read this first

- **`develop` is the real app.** Work here.
- **`main` is stale** — it still holds the pre-Firebase stub, including a fake
  login that accepts `test` / `password`. Don't branch from it or trust it.
- History note: the app was originally built with UIC's SHPE chapter at
  `communicationsshpeuic/shpe-web-app`. This repo is a full mirror of that work,
  now maintained for Northwestern. Most commits are from UIC contributors.

## Commands

All app commands run from `frontend/`, not the repo root.

```bash
cd frontend
npx expo start        # then press w for web, or scan the QR with Expo Go
npx tsc --noEmit      # typecheck — the real gate, use this before committing
```

Firestore rules deploy from the **repo root** (where `firebase.json` lives):

```bash
firebase deploy --only firestore:rules
```

## Architecture

- **Expo Router** — file-based routing under `frontend/app/`. Any file there
  becomes a route, so shared components belong in `frontend/components/`.
- **Firebase** is the entire backend: Auth for credentials, Firestore for data.
  There is no server to run.
- `backend/server.js` and the root `package.json` are **dead** — leftovers from
  an abandoned Express/Mongoose approach. `mongoose`, `express`, `bcryptjs`,
  and `jsonwebtoken` in the root deps are unused. Don't build on them.
- Auth state flows through `frontend/contexts/AuthContext.tsx`, which exposes
  `user` (Firebase Auth) and `profile` (the Firestore `users` doc).

## Firebase

- Project: **`shpe-member-app`** — set in `.firebaserc`.
- **It previously pointed at UIC's project (`shpe-website-9ff71`).** If you ever
  see that ID, stop; deploying would write into another chapter's live database.
- Config comes from `frontend/.env` (gitignored) via `EXPO_PUBLIC_FIREBASE_*`
  vars. See `env_example.txt` for the shape. These keys are not secrets — they
  ship in the client bundle by design.

## Firestore data model

Collections are created implicitly on first write. There is no schema and no SQL.

| Collection | Created by | Notes |
|---|---|---|
| `users` | registration, keyed by Auth UID | never hand-create; wrong IDs break the rules |
| `checkIns` | scanning an event QR, id `{uid}_{eventId}` | |
| `events` | **by hand in the console** | no admin UI exists yet |
| `announcements` | **by hand in the console** | |

Field names read by the code:

```
events         title, date, startTime?, endTime?, location, description
announcements  title, body, time, createdAt
users          firstName, lastName, age, sexAtBirth, gender, pronouns,
               schoolLevel, major, memberId, email, isAdmin, createdAt
checkIns       userId, eventId, timestamp
```

### Gotchas that cost real time

- **A document missing the field you `orderBy` is silently dropped from
  results.** No error, just an empty list. Events without `date` and
  announcements without `createdAt` will never appear.
- `date` is a **string**, so `orderBy('date')` sorts alphabetically —
  "December" sorts before "February". Known flaw, not yet fixed.
- `isAdmin` can only be granted by editing the user doc in the Firebase
  console. `firestore.rules` deliberately blocks users from changing their own.
  This is what unlocks the Organizer tab.

## Conventions

- **Images use `require()`, not `import`.** Nothing declares `*.png` types, so
  `import icon from './x.png'` fails typecheck. `require()` is typed via metro.
- **`Alert.alert` button callbacks don't fire on web** — it maps to
  `window.alert`. Anything interactive needs a `Modal`. See the workaround
  comment in `app/(tabs)/check-in.tsx`.
- Chapter email domains live in `frontend/utils/validation.ts` as a list.
  Adding a domain is a one-line change — don't hardcode domains in screens.
- Member names are `firstName` + `lastName`. **Last name is free text and may
  contain multiple surnames** — never split it or validate it as one word.
  Compose display names with `displayName()` from `types/user.ts`.

## Environment

Windows / PowerShell. Notable differences from bash:

- No `&&` chaining — use `;` or separate lines
- `rm -rf x` → `Remove-Item -Recurse -Force x`
- If npm tools fail with "running scripts is disabled", use the `.cmd` variant
  (`npx.cmd`) or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

## Known gaps

- No admin UI for creating events — officers must use the Firestore console
- No email verification, so the domain check only validates the string, not
  that the person owns the address
- `app.json` still names the app `frontend`
- `assets/images/UIC-SHPE-Webapp.png` is an unreferenced leftover
