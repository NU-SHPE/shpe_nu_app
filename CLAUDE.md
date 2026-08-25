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
- Auth state flows through `frontend/contexts/AuthContext.tsx`, which exposes
  `user` (Firebase Auth) and `profile` (the Firestore `users` doc).

### Shared pieces — use these, don't re-roll them

| File | What it owns |
|---|---|
| `components/theme.ts` | colors, spacing, radius, font sizes |
| `components/PageHeader.tsx` | the navy banner on every screen |
| `components/ActionButton.tsx` | icon-in-a-red-circle action cards |
| `components/DateSelect.tsx` | month-grid calendar picker, with a tap-to-jump year list |
| `components/TimeSelect.tsx` | 15-minute time list |
| `components/MajorSelect.tsx` | major picker (`types/user.ts`'s `MAJOR_OPTIONS`) with an "Other" free-text escape hatch |
| `types/event.ts` | event categories and their point values |
| `utils/date.ts` | timestamp formatting and form parsing |
| `utils/qrPayload.ts` | check-in vs check-out QR payloads |
| `utils/scanWindow.ts` | when each code is valid |
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
| `rsvps` | tapping RSVP on the event detail page, id `{uid}_{eventId}` |

```
events         title, description, location, category, checkInPoints,
               checkOutPoints, startsAt, endsAt, createdAt, createdBy
users          firstName, lastName, birthday, sexAtBirth, gender, pronouns,
               schoolLevel, majors[], minors[], memberId, email, isAdmin,
               isExec, createdAt
checkIns       userId, eventId, checkedInAt, pointsAwarded,
               checkedOutAt?, checkOutPointsAwarded?
announcements  title, body, time, createdAt
rsvps          userId, eventId, rsvpedAt
```

### Check-in / check-out

One `checkIns` document per member per event, holding both halves. Each scan
fills in its own half with `setDoc(..., { merge: true })`, so **either half can
come first** — someone who arrives too late to check in can still check out.
Branch on the fields (`checkedInAt`, `checkedOutAt`), not on whether the
document exists.

Two QR codes per event, distinguished by payload: `eventId` for check-in,
`eventId:out` for check-out. See `utils/qrPayload.ts`. The code declares the
intent, so no server-side "which mode are we in" state is needed.

Scan windows, in `utils/scanWindow.ts`:

- **Check-in** — from 30 minutes before `startsAt` until the event's midpoint
- **Check-out** — from the midpoint until 30 minutes after `endsAt`

Both computed from the event document at scan time, so editing an event's times
moves the windows immediately. They don't overlap, which is deliberate.

Points are **copied onto the check-in document** rather than looked up later, so
changing a category's values next year doesn't silently rewrite past records.
The rules verify the copied values against the event.

### Event categories

Point values live in `types/event.ts` and are **never typed by hand** — officers
pick a category and points follow. Category *keys* are stored on documents;
*labels* are display-only, so renaming a label is free.

| Category | Check-in | Check-out | Total |
|---|---|---|---|
| General meeting | 1.5 | 1.5 | 3 |
| Social / collaboration | 1 | 1 | 2 |
| Study Table | 1 | 1 | 2 |
| Professional | 1.5 | 1.5 | 3 |
| Regional | 4 | — | 4 |
| Community service | 5 | — | 5 |

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
- **Auth persistence needs an odd import.** `getReactNativePersistence` ships
  only on Firebase's react-native entry point, which Metro resolves but tsc and
  the web bundle don't. `firebaseConfig.ts` pulls it in with `require()` inside
  the native branch for that reason — a top-level import breaks both.
- **Check-in rules key off the document ID.** `checkIns` docs are named
  `{uid}_{eventId}`, and the read rule parses the owner out of that name so it
  works even when the doc doesn't exist yet. If anything ever writes a check-in
  under a different ID scheme, reads break for that member — silently, since
  writes still succeed.

## Conventions

- **Images use `require()`, not `import`.** Nothing declares `*.png` types.
- **`Alert.alert` is a no-op on web** — in the installed react-native-web
  version it's `static alert() {}`, not even a `window.alert` fallback. Any
  message routed through it is silently invisible to web users. Errors and
  confirmations need inline UI (field-level text, a banner, or a `Modal`) —
  see `register.tsx` / `index.tsx` / `edit-profile.tsx` for the field-error
  pattern (a `validate()` returning per-field errors, plus a `formError`
  banner for anything not tied to one field). Screens that still call
  `Alert.alert` for anything user-facing (`create-event.tsx`'s save-failure
  path, `manage-roles.tsx`, `profile.tsx`'s sign-out failure) haven't been
  converted yet.
- **The QR scanner guard is a ref, not state.** The camera fires many times per
  second; async state updates can't keep up. It's a time-based cooldown so it
  expires on its own — an earlier boolean lock could wedge shut when an Android
  alert was dismissed without firing its callback.
- Chapter email domains live in `utils/validation.ts` as a list. Adding one is a
  one-line change — don't hardcode domains in screens.
- Names are `firstName` + `lastName`. **Last name is free text and may hold
  multiple surnames** — never split it or validate it as one word. Compose
  display names with `displayName()` from `types/user.ts`.
- **Dates and times are picked, never typed.** `components/DateSelect.tsx` is a
  month grid, `components/TimeSelect.tsx` a 15-minute list showing 12-hour
  labels and storing `HH:MM`. Both are custom rather than native so web and
  phone behave identically — free-text times let people enter "5:00 PM" into a
  field that only parsed "17:00". `@react-native-community/datetimepicker` is
  still installed but unused.
- **Form errors go under the field**, not in an alert. See the `FieldErrors`
  map in `create-event.tsx`. One combined alert can't say which field is wrong.

## Environment

Windows / PowerShell:

- No `&&` chaining — use `;` or separate lines
- `rm -rf x` → `Remove-Item -Recurse -Force x`
- If npm tools fail with "running scripts is disabled", use `npx.cmd` or run
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

---

## Backlog

### Known gaps

- **Scan windows are client-side only.** `utils/scanWindow.ts` enforces them in
  the app, but the rules don't, so a request outside the window would still be
  accepted. It awards the correct points either way, so this is an integrity
  nuisance rather than a way to farm points.
- **No email verification**, so the domain check only validates the string, not
  that the person owns the address. Until this exists, "Northwestern students
  only" isn't actually true — anyone can type an address they don't own.
- No UI for creating announcements; they're still hand-written in the console.
- `assets/images/UIC-SHPE-Webapp.png` is now fully unreferenced (real
  Northwestern branding replaced it everywhere — see `nu_shpe_logo.png` and
  the generated icon/splash files) and safe to delete whenever.
- `TimeSelect` opens at midnight when nothing is selected, so picking an evening
  time is a long scroll — and AM/PM entries look alike. A sensible default would
  help.
- **Organizer's Past Events section doesn't scale.** It renders every past
  event via `.map()` inside a `ScrollView` (no virtualization), and expanding
  the section fires one `getCountFromServer` attendance-count query per event
  in the list, all at once. Fine today; at a year or two of history (~100+
  events) this will visibly lag and hammer Firestore with reads for cards
  nobody's scrolled to yet. Fix is two parts: switch to a virtualized list
  (`FlatList`, which means restructuring the screen off one big `ScrollView`),
  and fire the count query per-card as it mounts rather than for the whole
  list on expand. Grouping past events by month is a separate, UX-only
  follow-up on top of that — worth doing, but the render/read fix is the part
  that actually prevents the app from getting slow.

### Planned

- **Roles beyond `isAdmin`.** Admins granting access to exec — e.g. letting the
  secretary run points analysis, or exec create events. Needs an admin-facing
  users screen to manage them. Three separate wishes all reduce to this.
- **Points / membership page** with analysis tools for officers.
- **Points leaderboard**, matching the chapter website's existing one. Data's
  already there — same per-member sum used on the profile page
  (`pointsAwarded + checkOutPointsAwarded` across a member's `checkIns`
  docs) — this is a ranking/display feature on top of it, not a new data
  model.
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
- **"Add to Calendar"** on the event detail page — generates a calendar link
  from `startsAt`/`endsAt`, no backend needed.
- **MentorSHPE points** — 1/meeting as a mentee, 1 per mentee for mentors,
  capped at 6 a quarter. Deliberately not an event category; needs its own
  model.
- **Google Calendar sync** for chapter events. Needs a Cloud Function and a
  service account, which means the Firebase Blaze plan.
