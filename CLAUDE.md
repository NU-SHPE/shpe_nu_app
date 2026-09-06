# SHPE Northwestern App

Expo (React Native) app for the SHPE chapter at Northwestern: events, QR-code
event check-in, member profiles with a points system, and an organizer view for
officers. Runs on iOS, Android, and web from one codebase.

## Repo state — read this first

- **`main` is the source of truth.** It must always be fully working — no
  errors, no broken features. Vercel deploys it to production on every push.
- **`develop` is the active working branch** — new features, experiments,
  testing happen here. Vercel gives it preview deploys. Merge to `main` only
  once it's verified solid.
- The two were briefly out of sync (an old stale `main`); resolved by
  fast-forwarding `main` to `develop` when the app went live.
- History note: originally built with UIC's SHPE chapter at
  `communicationsshpeuic/shpe-web-app`. This repo is a full mirror of that work,
  now maintained for Northwestern. Most commits are from UIC contributors.

## Commands

All app commands run from `frontend/`, not the repo root.

```bash
cd frontend
npx expo start        # then press w for web, or scan the QR with Expo Go
npx expo start --clear  # after adding a native dependency
npm run typecheck     # tsc --noEmit — the real gate, use this before committing
npm run lint          # expo lint — must be error-clean (warnings are tolerated)
npm test              # build web + Playwright smoke tests (see Testing below)
```

Rules deploy from the **repo root** (where `firebase.json` lives). Deploy the
one you changed — never a bare `firebase deploy` (the `hosting` block there is
a stale leftover, the app is on Vercel):

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage        # storage.rules — the resume book
```

## Testing

There is no unit-test layer. What exists:

- **`npm test`** (`frontend/`) — `expo export -p web` then Playwright against
  the static build served as an SPA (`frontend/playwright.config.ts` spins up
  `serve -s dist`). Specs in `frontend/e2e/`.
- Coverage is **unauthenticated only**: login/register render, client-side
  validation, the chapter-email check, SPA deep-link resolution, AuthGate
  redirects, the not-found screen. **No Firebase calls** — CI feeds placeholder
  `EXPO_PUBLIC_FIREBASE_*` vars just so `initializeApp` doesn't throw.
- **Not covered, still a manual pass on a preview deploy:** real login, the
  email-verification round trip, Firestore reads under `isVerified()`, QR
  check-in, organizer screens.
- **`.github/workflows/ci.yml`** runs typecheck + lint + `npm test` on every
  push to `main`/`develop` and every PR.
- React Navigation keeps prior screens mounted under the active one, so a bare
  `getByText` can hit a hidden element from the previous screen. Target buttons
  by `testID` (`login-submit`, `register-submit`; add more as needed) and
  assert on text unique to the screen under test.

## Hosting

The web app is served from **Vercel** (same account as the chapter website,
`nushpe.org`), at `app.nushpe.org`. Vercel auto-deploys on every push to
`main`; PRs get preview URLs. Config is `frontend/vercel.json` (Vercel project
Root Directory is `frontend`): builds with `npx expo export -p web`, serves
`dist/`, rewrites all paths to `/index.html` (the app is `output: "single"`,
a client-rendered SPA — see `app.json`). `frontend/public/privacy-policy.html`
ships as a real file at `/privacy-policy.html`.

- The `EXPO_PUBLIC_FIREBASE_*` vars live in Vercel's env settings, mirrored
  from `frontend/.env`. Not secret (they ship in the bundle), but the build
  has no `.env`, so a missing var there = broken Firebase in prod.
- **Any hosting domain must be in Firebase Auth → Authorized domains** or
  login is rejected there: `app.nushpe.org` and the `*.vercel.app` preview
  domain both need adding (unlike Firebase Hosting's `*.web.app`, which was
  automatic).
- `firebase.json` still has a `hosting` block from an earlier Firebase
  Hosting deploy at `shpe-member-app.web.app`. Harmless, unused; `firebase
  deploy` in this repo should be `--only firestore:rules`, never `hosting`.

## Architecture

- **Expo Router** — file-based routing under `frontend/app/`. Any file there
  becomes a route, so shared components belong in `frontend/components/`.
- **Firebase** is the entire backend: Auth for credentials, Firestore for data,
  Cloud Storage for resume PDFs. There is no server to run.
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
| `hooks/useMyResume.ts` | the current member's own resume PDF — live metadata + pick/upload/replace/open/remove (Cloud Storage + the `resumes` doc) |
| `components/ResumeCard.tsx` | the resume upload/manage card on the Careers tab, built on `useMyResume` |
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
- **Auth + Firestore + Cloud Storage.** Storage is used by exactly one feature
  (the resume book) and needs the **Blaze plan** — this project's bucket is the
  newer `.firebasestorage.app` kind with no Spark free tier. Usage stays well
  inside Blaze's free allowance at chapter scale (~$0/mo); a Cloud Billing
  budget alert is the safety net. Still no server — Storage is client-SDK only.

### Password reset from Profile

Profile → "Change password" sends a reset link to the signed-in member's own
address (`AuthContext.resetPassword`, same as `app/forgot-password.tsx`) via a
confirm/sent `Modal` — not `updatePassword`, which would need a reauth flow.
The old dead "Privacy" row was split into this plus a "Privacy Policy" row that
opens `PRIVACY_POLICY_URL` (`app.nushpe.org/privacy-policy.html`) in a browser.

### Careers screen + resume book

`app/careers.tsx` — reached from a **"Careers" row on the Profile tab**
(same pattern as "Edit Profile", not a tab of its own). A member's whole
career profile in one place: the `ResumeCard` (upload/replace/view/remove
one PDF ≤5 MB) plus the career fields, edited inline with a Save button.

- Resume PDF → `resumes/{uid}/resume.pdf` in Storage + a `resumes/{uid}`
  metadata doc in Firestore (the Storage list API is too weak to build the
  admin list from).
- **Career fields** (`gradTerm`, `seeking[]`, `workAuthorized`, `needsSponsorship`) live on the **`users`
  profile** (options / helpers in `types/user.ts`), saved straight to the user
  doc from the Careers screen. `gradTerm` is `"YYYY-MM"` (month matters for
  recruiting — spring vs. fall grad); `formatGradTerm` renders "June 2027".
  The resume book joins these off the member's profile (it already loads the
  whole `users` collection).
- `app/organizer/resume-book.tsx` (admin-only, linked from the Organizer hub)
  is the browse/download/export screen.
- **Staleness** — `isResumeStale` (`types/resume.ts`, >6 months on the resume's
  `updatedAt`, i.e. the file-upload time). Shown on the member's card and as a
  badge in the admin list.
- **CSV export** on the resume-book screen: `buildCsv` → `exportCsv`, which
  downloads a file on web and falls back to `Share.share` on native (no extra
  deps). Member metadata (name, email, major, graduation, seeking, work-auth,
  resume-updated date) — **not** resume download links; bulk-handing PDFs to an
  outside recruiter is the deferred recruiter-access feature.

- **Read access = self or `isAdmin`**, in both `firestore.rules` and
  `storage.rules` — deliberately identical to the `users` doc rule. `isExec`
  can run events/QR/announcements but has never been able to read member PII,
  and a resume is PII. Don't widen this without a real decision (same category
  as the parked member-visibility feature).
- `storage.rules` also enforces PDF-only + 5 MB on the incoming object, so a
  console upload can't bypass the app's picker. Storage rules read Firestore
  for the admin check via `firestore.get(...users/$(uid)).data.isAdmin`.
- The resume-book screen loads the whole `users` collection to join names onto
  resumes — same accepted pattern as `manage-users.tsx`, admin-only, one screen.

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
- The email templates (verification *and* password reset) are **locked** for
  this project — Firebase console shows "mail template updates are currently
  unavailable." Google restricts this on many free-tier Auth projects for
  anti-phishing. The defaults ("… for shpe-member-app", from
  `noreply@shpe-member-app.firebaseapp.com`) go out as-is. Only fixes are
  custom SMTP or sending the mail yourself from a Cloud Function — neither
  done, neither blocking.

### Password reset

`app/forgot-password.tsx`, reached from a "Forgot password?" link on the
login screen (which passes the typed email through as a route param).
`AuthContext.resetPassword` → `sendPasswordResetEmail`; Firebase hosts the
"set a new password" page, same as verification. The screen shows the same
"if an account exists…" confirmation whether or not the address is
registered, and treats `auth/user-not-found` as success — Firebase's
email-enumeration protection may not throw for unknown emails, and we don't
confirm which addresses have accounts either way.

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
| `resumes` | uploading a resume from Careers, id = uid — metadata only, PDF is in Storage |

```
events         title, description, location, category, checkInPoints,
               checkOutPoints, startsAt, endsAt, createdAt, createdBy
users          firstName, lastName, birthday, sexAtBirth, gender, pronouns,
               schoolLevel, majors[], minors[], memberId, email, isAdmin,
               isExec, createdAt, gradTerm?, seeking[]?, workAuthorized?, needsSponsorship?
checkIns       userId, eventId, checkedInAt, pointsAwarded,
               checkedOutAt?, checkOutPointsAwarded?
announcements  title, body, createdAt, createdBy, createdByName
rsvps          userId, eventId, rsvpedAt
pushTokens     token, updatedAt
resumes        userId, fileName, size, updatedAt
               (PDF: Storage resumes/{uid}/resume.pdf)
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
- **The past-event list in `events.tsx` uses `SectionList`, not `ScrollView` +
  `.map()`.** It used to mount every past card at once on expand; at real
  chapter history (~100+ events) that's real lag. (`organizer.tsx` used to
  carry a copy of this list too — that's gone; see below.)
- **`isEventPast` needs a live clock, not `new Date()` inline.** Calling it
  bare re-evaluates only when the component re-renders for some other
  reason (a Firestore update), not when the real-world clock actually
  passes the event's end time — a screen left open can show an event as
  active long after it's ended, with nothing wrong in the data. Pass
  `useNow()`'s value in as the second argument anywhere this matters
  (`events.tsx`, `events-info/[id].tsx`).
- **There is one events list.** `organizer.tsx` is now just a tools hub (Create
  Event, Post Announcement, Manage Users, Resume Book). Event management — the
  check-in/check-out QR buttons, Edit, and the admin-only attendance count —
  lives in a "Manage" card on `events-info/[id].tsx`, shown when
  `isAdmin || isExec`, with `canManage` (admin, or exec who created it)
  gating Edit. The attendance count there is a single `getCountFromServer`
  on open, admin-only (checkIns read is `isAdmin()`-only in the rules).

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
  converted yet. `check-in.tsx` routes results through a `showResult()` helper
  — inline banner on web, `Alert.alert` unchanged on native.
- **The QR scanner guard is a ref, not state.** The camera fires many times per
  second; async state updates can't keep up. It's a time-based cooldown so it
  expires on its own — an earlier boolean lock could wedge shut when an Android
  alert was dismissed without firing its callback.
- **QR scanning on web is our own decoder, not the browser's.** iOS Safari
  (and every iOS browser — all WebKit) has no `BarcodeDetector`, which
  `expo-camera`'s web path needs, so `CameraView.onBarcodeScanned` never fires
  there. `components/WebQRScanner.web.tsx` grabs the camera with `getUserMedia`
  and decodes frames with `jsQR` in JS; `check-in.tsx` renders it on
  `Platform.OS === 'web'` and `CameraView` on native. The native stub
  `WebQRScanner.tsx` just returns null. Camera *access* works on iOS Safari
  over https; only the decoding was missing.
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
- Past events on `events.tsx` still show as one flat list —
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
