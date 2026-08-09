# SHPE Northwestern App

Expo (React Native) app for the SHPE chapter at Northwestern: events, QR-code
event check-in, member profiles with a points system, and an organizer view for
officers. Runs on iOS, Android, and web from one codebase.

## Repo state — read this first

- **`develop` is the real app.** Work here.
- **`main` is stale** — it still holds the pre-Firebase stub, including a fake
  login that accepts `test` / `password`. Don't branch from it or trust it.
- History note: originally built with UIC's SHPE chapter at
  `communicationsshpeuic/shpe-web-app`. This repo is a full mirror of that work,
  now maintained for Northwestern. Most commits are from UIC contributors.

## Commands

All app commands run from `frontend/`, not the repo root.

```bash
cd frontend
npx expo start        # then press w for web, or scan the QR with Expo Go
npx expo start --clear  # after adding a native dependency
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
  an abandoned Express/Mongoose approach. Safe to delete.
- Auth state flows through `frontend/contexts/AuthContext.tsx`, which exposes
  `user` (Firebase Auth) and `profile` (the Firestore `users` doc).

### Shared pieces — use these, don't re-roll them

| File | What it owns |
|---|---|
| `components/theme.ts` | colors, spacing, radius, font sizes |
| `components/PageHeader.tsx` | the navy banner on every screen |
| `components/ActionButton.tsx` | icon-in-a-red-circle action cards |
| `types/event.ts` | event categories and their point values |
| `utils/date.ts` | timestamp formatting and form parsing |
| `utils/validation.ts` | chapter email domains |

## Firebase

- Project: **`shpe-member-app`** — set in `.firebaserc`.
- **It previously pointed at UIC's project (`shpe-website-9ff71`).** If you ever
  see that ID, stop; deploying would write into another chapter's live database.
- Config comes from `frontend/.env` (gitignored) via `EXPO_PUBLIC_FIREBASE_*`
  vars. See `env_example.txt`. These keys aren't secrets — they ship in the
  client bundle by design.

## Firestore data model

Collections are created implicitly on first write. No schema, no SQL.

| Collection | Created by |
|---|---|
| `users` | registration, keyed by Auth UID — never hand-create |
| `events` | the Create Event form (organizer tab) |
| `checkIns` | scanning an event QR, id `{uid}_{eventId}` |
| `announcements` | by hand in the console — no UI yet |

```
events         title, description, location, category, checkInPoints,
               checkOutPoints, checkOutOpen, startsAt, endsAt, createdAt,
               createdBy
users          firstName, lastName, age, sexAtBirth, gender, pronouns,
               schoolLevel, major, minor, memberId, email, isAdmin, createdAt
checkIns       userId, eventId, timestamp
announcements  title, body, time, createdAt
```

### Event categories

Point values live in `types/event.ts` and are **never typed by hand** — officers
pick a category and points follow. Category *keys* are stored on documents;
*labels* are display-only, so renaming a label is free.

| Category | Check-in | Check-out |
|---|---|---|
| General meeting | 1 | 2 |
| Social / collaboration | 1 | 1 |
| Study Table | 1 | 1 |
| Professional | 1 | 2 |
| Regional | 4 | — |
| Community service | 5 | — |

Regional and community service have no check-out: showing up is the effort, so
the whole award lands on check-in. `checkOutPoints: 0` is what signals that.

### Gotchas that cost real time

- **A document missing the field you `orderBy` is silently dropped from
  results.** No error, just an empty list. Events without `startsAt` vanish.
- **Use `onSnapshot`, not `getDocs`.** Tabs stay mounted when you navigate away,
  so a one-time fetch shows stale data forever. This bit us three times: the
  profile check-in count, the events list, and newly created events not
  appearing on the organizer screen.
- `isAdmin` can only be granted by editing the user doc in the Firebase console.
  `firestore.rules` deliberately blocks users from changing their own.
- **Check-in rules key off the document ID.** `checkIns` docs are named
  `{uid}_{eventId}`, and the read rule parses the owner out of that name so it
  works even when the doc doesn't exist yet. If anything ever writes a check-in
  under a different ID scheme, reads break for that member — silently, since
  writes still succeed.

## Conventions

- **Images use `require()`, not `import`.** Nothing declares `*.png` types.
- **`Alert.alert` button callbacks don't fire on web** — it maps to
  `window.alert`. Anything interactive needs a `Modal`.
- **The QR scanner guard is a ref, not state.** The camera fires many times per
  second; async state updates can't keep up. It's a time-based cooldown so it
  expires on its own — an earlier boolean lock could wedge shut when an Android
  alert was dismissed without firing its callback.
- Chapter email domains live in `utils/validation.ts` as a list. Adding one is a
  one-line change — don't hardcode domains in screens.
- Names are `firstName` + `lastName`. **Last name is free text and may hold
  multiple surnames** — never split it or validate it as one word. Compose
  display names with `displayName()` from `types/user.ts`.
- `@react-native-community/datetimepicker` has no usable web build. The
  create-event form branches on `Platform.OS` and uses text inputs in browsers.

## Environment

Windows / PowerShell:

- No `&&` chaining — use `;` or separate lines
- `rm -rf x` → `Remove-Item -Recurse -Force x`
- If npm tools fail with "running scripts is disabled", use `npx.cmd` or run
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

---

## Backlog

### Known gaps

- **Points aren't validated by rules.** Nothing stops a member writing their own
  `pointsAwarded`. Must be fixed before real members are on it — the rule needs
  to compare against the event's `checkInPoints`.
- **No email verification**, so the domain check only validates the string, not
  that the person owns the address.
- Auth doesn't persist on phones — no AsyncStorage configured, so members log in
  again every launch. See the warning in the Expo logs.
- Profile still shows `eventsAttended * 20` for points instead of summing real
  awards.
- Create-event form needs stronger field validation.
- No UI for creating announcements.
- `app.json` still names the app `frontend`, and points at Android icon files
  that don't exist.
- `assets/images/UIC-SHPE-Webapp.png` is unreferenced.

### Planned

- **Check-out flow.** `checkedOutAt` on the check-in doc, `checkOutOpen` toggled
  by organizers on the event, member scans the same QR again.
- **Roles beyond `isAdmin`.** Admins granting access to exec — e.g. letting the
  secretary run points analysis, or exec create events. Needs an admin-facing
  users screen to manage them.
- **Points / membership page** with analysis tools for officers.
- **Completion bonus.** Points are split evenly between check-in and check-out,
  so partial attendance earns half. An even split can't distinguish leaving
  early from arriving late — weighting either half rewards the other behavior.
  The fix is equal halves plus a bonus for having both, which makes full
  attendance worth meaningfully more than either half. Deferred; it needs a
  `completionBonus` field on events and the second scan to award it.
- **Whether exec should earn points at their own events.** Easier for them to
  collect the completion bonus at an event they're running. Policy question, not
  a technical one — events already store `createdBy`, so it's enforceable
  whenever the chapter decides.
- **Announcements**, with push notifications.
- **Birthday instead of age.** Store a date so age updates itself rather than
  going stale the moment someone has a birthday.
- **"Add to Calendar"** on the event detail page — generates a calendar link
  from `startsAt`/`endsAt`, no backend needed.
- **MentorSHPE points** — 1/meeting as a mentee, 1 per mentee for mentors,
  capped at 6 a quarter. Deliberately not an event category; needs its own
  model.
- **Google Calendar sync** for chapter events. Needs a Cloud Function and a
  service account, which means the Firebase Blaze plan.
