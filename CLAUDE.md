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
  `user` (Firebase Auth), `profile` (the Firestore `users` doc), and
  `emailVerified`. `AuthGate` in `app/_layout.tsx` sends any signed-in user
  whose email isn't verified to `app/verify-email.tsx` and lets nothing past
  it — see "Email verification" below.

### Shared pieces — use these, don't re-roll them

| File | What it owns |
|---|---|
| `components/theme.ts` | colors, spacing, radius, font sizes — brand is Northwestern Purple (`#4E2A84`); see "Theming" below |
| `components/PageHeader.tsx` | the purple banner on every screen |
| `components/ActionButton.tsx` | icon-in-a-purple-circle action cards |
| `components/DateSelect.tsx` | month-grid calendar picker, with a tap-to-jump year list |
| `components/TimeSelect.tsx` | 15-minute time list |
| `components/MajorSelect.tsx` | major picker (`types/user.ts`'s `MAJOR_OPTIONS`) with an "Other" free-text escape hatch |
| `components/CollapsibleSection.tsx` | header-only collapsible toggle (title, count badge, chevron) for a `SectionList`'s `renderSectionHeader` — always controlled, doesn't wrap children |
| `hooks/useNow.ts` | a `Date` that refreshes every 60s — use with `isEventPast` anywhere "has this event ended" needs to stay correct while a screen just sits open, not only when the underlying data changes |
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

### Email verification

Registration sends a Firebase verification link (`sendEmailVerification` in
`AuthContext.register`) and drops the user on `app/verify-email.tsx`. That
screen polls `currentUser.reload()` every few seconds and on app-foreground,
has a rate-limited Resend, and a manual re-check; `AuthGate` routes to the
app automatically once `emailVerified` flips. No backend — Firebase hosts the
email and the confirmation page.

- **`onAuthStateChanged` does not refire when the email becomes verified.**
  That's why `AuthContext` tracks `emailVerified` as its own state and
  `reloadUser()` updates it. `reload()` alone also doesn't refresh the ID
  token, so `reloadUser()` calls `getIdToken(true)` after a successful
  verify — otherwise the `email_verified` claim the rules read stays stale
  for up to an hour.
- **The rules enforce it too.** `isVerified()` in `firestore.rules` gates
  `events` / `announcements` / `checkIns` / `rsvps` / `pushTokens` and is
  folded into `isAdmin()` / `isExec()`. `users` *create* is exempt (the
  profile doc is written at sign-up, before verification); `users` update is
  not.
- **This locked out every account that existed before the feature shipped**
  until they verify — including organizers, since `isAdmin()`/`isExec()` now
  require a verified token. One-time click per person.
- Customize the sender name / reply-to in Firebase console → Authentication →
  Templates. The default template works as-is.

## Firestore data model

Collections are created implicitly on first write. No schema, no SQL.

| Collection | Created by |
|---|---|
| `users` | registration, keyed by Auth UID — never hand-create |
| `events` | the Create Event form (organizer tab) |
| `checkIns` | scanning an event QR, id `{uid}_{eventId}` |
| `announcements` | the Post Announcement form (organizer tab) |
| `rsvps` | tapping RSVP on the event detail page, id `{uid}_{eventId}` |
| `pushTokens` | registered automatically on sign-in, id = uid — see `AuthContext.tsx` |

```
events         title, description, location, category, checkInPoints,
               checkOutPoints, startsAt, endsAt, createdAt, createdBy
users          firstName, lastName, birthday, sexAtBirth, gender, pronouns,
               schoolLevel, majors[], minors[], memberId, email, isAdmin,
               isExec, createdAt
checkIns       userId, eventId, checkedInAt, pointsAwarded,
               checkedOutAt?, checkOutPointsAwarded?
announcements  title, body, createdAt, createdBy, createdByName
rsvps          userId, eventId, rsvpedAt
pushTokens     token, updatedAt
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
- **Past-event lists (`events.tsx`, `organizer.tsx`) use `SectionList`, not
  `ScrollView` + `.map()`.** Both used to mount every past card at once on
  expand; at real chapter history (~100+ events) that's real lag.
  `organizer.tsx`'s per-event attendance count is fetched inside each card's
  own mount effect, not by the parent looping over the whole list — that's
  what keeps the Firestore read count tied to what's actually scrolled into
  view instead of the total event count ever created. Don't move that fetch
  back up to an expand-time loop without re-reading why it moved.
- **`isEventPast` needs a live clock, not `new Date()` inline.** Calling it
  bare re-evaluates only when the component re-renders for some other
  reason (a Firestore update), not when the real-world clock actually
  passes the event's end time — a screen left open can show an event as
  active long after it's ended, with nothing wrong in the data. Pass
  `useNow()`'s value in as the second argument anywhere this matters
  (`events.tsx`, `organizer.tsx`, `events-info/[id].tsx` all do).

## Theming

The brand is **Northwestern Purple `#4E2A84`** and its official tints. Every
brand-colored pixel resolves from `components/theme.ts` — reskinning the app
for another chapter is an edit to the `colors` block there, not a hunt
through screens.

- `colors.purple` / `purpleDeep` / `purpleTint` / `onPurple` — the brand.
  Banners, primary buttons, selected states, accents, "today" markers.
- `colors.danger` (`#C0392B`, red) — **deliberately not part of the brand
  palette.** Validation-error text and destructive ("Delete") actions use
  it so they stay red regardless of the brand color. Don't fold it into
  `purple`.
- `colors.navy` / `colors.red` still exist as **deprecated aliases** (both
  point at the brand purple) so older code keeps working. Prefer the names
  above in new code.
- Neutral greys and the dark form-screen backgrounds (`surfaceDark`,
  `inputDark`, `#25292e`, `#3a3f47`) are brand-neutral and were left alone.
- History: the app was SHPE-red (`#D50032`) + navy (`#1B2A6B`). If you see a
  raw `#D50032` / `#1B2A6B` / `#001E62` anywhere, it's a stray that missed
  the purple migration — route it through `theme.ts`.

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
  path, `manage-users.tsx`, `profile.tsx`'s sign-out failure) haven't been
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

- **Scan windows and points are enforced client-side only, by deliberate
  choice.** `utils/scanWindow.ts` enforces the 30-min-before-start /
  midpoint / 30-min-after-end windows in the app, but the rules don't, so a
  request outside the window would still be accepted at the Firestore
  level. Considered and explicitly deferred — it's an integrity nuisance,
  not a way to farm extra points (the amount awarded is fixed either way),
  and not worth the added complexity right now.
- ~~No email verification~~ — **done.** See "Email verification" under
  Firebase. The domain check plus a verified Firebase link now means an
  address has to be a real chapter mailbox the person can open.
- `assets/images/UIC-SHPE-Webapp.png` is now fully unreferenced (real
  Northwestern branding replaced it everywhere — see `nu_shpe_logo.png` and
  the generated icon/splash files) and safe to delete whenever.
- Past events on `events.tsx`/`organizer.tsx` still show as one flat list —
  grouping by month would help browsing once there's real history, but isn't
  needed for performance (see below, that part's fixed).
- **`manage-users.tsx` loads the entire `checkIns` collection into memory
  on open**, to compute every member's point total in one query instead of
  one-per-member (Firestore's aggregation queries can count docs but can't
  sum a field, so there's no cheaper option that still shows a real total).
  Deliberately accepted for now — check-in docs are small and this is one
  query fired only when an admin opens this specific page, not on every
  app load. Revisit if the chapter's total historical check-in volume ever
  gets large (tens of thousands, not the low thousands a few years of a
  chapter this size would realistically produce).

### Planned

- **Roles beyond `isAdmin`/`isExec`.** Explicitly deferred — chapter is
  staying with just these two roles for now. Revisit only if a real need
  for a narrower role (e.g. secretary-only analytics access) comes up.
- **Points leaderboard**, matching the chapter website's existing one. Data's
  already there — same per-member sum used on the profile page and
  `manage-users.tsx` (`pointsAwarded + checkOutPointsAwarded` across a
  member's `checkIns` docs) — this is a ranking/display feature on top of
  it, not a new data model. No opt-out when it's built — chapter-members-only
  data, not public. Explicitly deferred for now, not pressing.
- **Member-to-member visibility** ("who else is in this club" — an
  aesthetic/social feature, not a functional need). `manage-users.tsx`
  gave admins a full-profile roster; if members ever get to see each other
  too, that should be a small, deliberately-scoped subset of fields (name,
  major) exposed through its own rule, never reopening the blanket
  `users` read that existed before this session tightened it to
  self-or-admin. Purely a future idea, not committed to.
- **Completion bonus.** Points are split evenly between check-in and check-out,
  so partial attendance earns half. An even split can't distinguish leaving
  early from arriving late — weighting either half rewards the other behavior.
  The fix is equal halves plus a bonus for having both, which makes full
  attendance worth meaningfully more than either half. Deferred — chapter
  wants to discuss with exec first before building it.
- **MentorSHPE points** — deferred for now. Longer-term idea if it happens:
  not a manual point entry, but its own mentor/mentee role pair, each
  mentor with their own dedicated QR code, mentees scanning it the same
  way event check-in already works.
- **Google Calendar sync** for chapter events, into the chapter's existing
  shared calendar. Considered and deferred — needs this app's first-ever
  backend (a Cloud Function holding a service-account credential, since
  that credential can never safely live in the mobile app itself) and the
  Blaze plan. Realistically ~$0/month at chapter traffic levels (Blaze
  unlocks the *ability* to make external API calls at all, which the free
  plan blocks outright — it's not primarily a usage-based cost at this
  scale), but still a real architecture change, not a quick add. The
  small, no-backend "Add to Calendar" personal button is already built —
  this is the separate, heavier, org-wide version of that idea.
