# 🖥️ DEALNUX — Mac Handoff (iOS App Store Submission)

> **Fresh Claude Code on the Mac: read this file first.** It carries the full state
> of the iOS App Store work so nothing is lost when moving from the Windows PC to
> the Mac. This chat session does NOT transfer between machines — this doc is the bridge.
>
> User: kausarul (kauserulislam0055@gmail.com). Communicates in romanized Bengali (Banglish) — reply in Banglish.

---

## 🎯 GOAL RIGHT NOW
Upload the already-built iOS app to App Store Connect from the Mac **using the
user's OWN Apple ID (no shared API key)**, test the In-App Purchases on the iPhone
via TestFlight + Sandbox, then submit for review.

## ✅ WHAT IS ALREADY DONE
- **Build DONE.** EAS produced an App Store–signed `.ipa` (App Store distribution).
  Artifact: `https://expo.dev/artifacts/eas/XzIzXX6qnxnqlRGFQWoT9tI0omExpNs0ICB8hmOnAxA.ipa`
  (EAS build id `cb7d069a-d3cb-4b90-918d-1e1d6564d3ec`). **A fresh build is NOT needed
  just to upload** — this .ipa is ready for Transporter/TestFlight.
- **Frontend IAP code DONE & pushed** (`src/screens/Subscriptions/Subscription.tsx`):
  4-tier product map, iOS purchase branch, `verifyApplePurchase()`, Restore button,
  Terms/Privacy links. Android Stripe flow UNTOUCHED. All committed to `main`.
- **4 subscription products CREATED** in App Store Connect (group "DealNux Premium",
  app Apple ID `6800175439`), all "Prepare for Submission", availability = 175 countries,
  English (U.S.) localization, price set:

  | Plan | plan_type | Product ID | Price | Apple ID |
  |---|---|---|---|---|
  | DealNux PRO | PRO_MONTHLY | `com.dealnux.app.pro.monthly` | $5.99/mo | 6800185261 |
  | DealNux ULTIMATE | ULTIMATE_MONTHLY | `com.dealnux.app.ultimate.monthly` | $24.99/mo | 6800185251 |
  | DealNux PRO MAX | PRO_MAX_YEARLY | `com.dealnux.app.promax.yearly` | $69.99/yr | 6800185133 |
  | DealNux ULTIMANIA | ULTIMANIA_YEARLY | `com.dealnux.app.ultimania.yearly` | $179.99/yr | 6800185403 |
- **Webhook set** (Production + Sandbox) → `https://server.dealnux.shop/api/v1/payment/apple/notifications/`
- **iOS store assets** generated at `appstore-assets/` (1024 icon, 6.7" screenshots).

## 🚫 HARD CONSTRAINTS (do not break)
- **Client REFUSES to share ANY App Store Connect API key** (.p8 / Key ID / Issuer ID).
  So `eas submit` will NOT be used (it needs a key; App Manager can't create one → 403).
  Upload path = **Transporter/Xcode with the user's own Apple ID** only.
- **Claude must NOT enter passwords / 2FA / create accounts.** The user types every
  password and 2FA code themselves. For interactive terminal logins, tell the user to
  run it via the `! <command>` prefix in Claude Code.
- **Do NOT touch the Android Stripe flow.**
- Keystores / passwords / .p8 are secrets — never commit or print them.
- User's role on the client's Apple team: **Developer + App Manager** (NOT Admin/Account
  Holder). App Manager CAN upload builds and submit for review. It CANNOT create API keys,
  sign agreements, or do banking.

---

## 📋 MAC STEP-BY-STEP (do this with the user, live)

### Step 1 — Get the .ipa
Download from the EAS artifact URL above (or `eas build:list --platform ios` → latest).

### Step 2 — App-specific password (needed because Apple ID has 2FA)
User goes to appleid.apple.com → Sign-In & Security → App-Specific Passwords → create one
(e.g. "Transporter"). **User keeps this; Claude never sees it.**

### Step 3 — Install Transporter
Mac App Store → search **Transporter** (by Apple) → free install.

### Step 4 — Upload
Open Transporter → sign in with **kauserulislam0055@gmail.com** + the app-specific password
→ drag the `.ipa` in → **Deliver / Upload**. Apple processes ~10–15 min → build appears in
App Store Connect under **TestFlight** (status "Processing" then ready).

### Step 5 — Test on iPhone (Sandbox)
- iPhone: install **TestFlight** app → sign in → install the DealNux build.
- Settings → App Store → Sandbox Account → sign in with the **Sandbox tester** the user
  created (`dealnux.sandbox@test.com`). (User enters that password, not Claude.)
- In the app, open the subscription screen and buy each plan — Sandbox = fake money.
- **⚠️ Purchase will only unlock if the backend `apple/verify/` endpoint is LIVE** (see below).

### Step 6 — Per-product review screenshots
Take a screenshot of the app's subscription screen (from the TestFlight build) and attach
one to EACH of the 4 subscription products in App Store Connect (required for review).

### Step 7 — Submit for review
In App Store Connect → the app version → attach the 4 subscriptions + app screenshots,
fill store listing (name/desc — see store metadata below), add **reviewer test login +
notes** (a demo account + how to reach the subscription screen), then **Submit for Review**.
App Manager role can do this.

---

## ⏳ PENDING / BLOCKERS TO CONFIRM
1. **Backend endpoints LIVE?** Ask the backend dev whether these are deployed:
   - `POST /api/v1/payment/apple/verify/` — **keyless** offline JWS verify (StoreKit 2
     `signedTransaction` verified against Apple public certs, Apple Root CA G3; tool =
     Apple `app-store-server-library` `SignedDataVerifier`; **no .p8**).
   - `.../payment/apple/notifications/` — App Store Server Notifications V2 webhook.
   Without `verify/` live, Sandbox purchases won't unlock and the reviewer will reject.
2. **Reviewer demo login** — needed in the submission notes.
3. **Per-product review screenshots** — needs a real screenshot from the built app.
4. Play Store (separate track) — re-submit with corrected metadata (already fixed).

## 🔌 API CONTRACT (frontend ↔ backend, already implemented in Subscription.tsx)
- Endpoints: `payment/plans/`, `payment/subscribe/` (Android Stripe),
  `payment/subscription/status/`, `payment/apple/verify/` (iOS).
- iOS verify request: `{ purchase_token: <StoreKit2 JWS>, product_id, transaction_id }`
  with header `Authorization: Bearer <vToken>`.
- Success = `res.data.success === true || res.data.is_active === true`. Only then call
  `finishTransaction`. Restore = loop `getAvailablePurchases()` → same verify endpoint
  (backend is idempotent).

## 📁 KEY FILES / DOCS IN THIS REPO
- `src/screens/Subscriptions/Subscription.tsx` — the only frontend IAP file.
- `.claude/iOS-IAP-Plan.md` — full plan (Part D = keyless verification).
- `.claude/postman/frontend_ios_iap_guideline 1.md` — backend dev's contract (4 products).
- `.claude/Subscription/Monthly.png`, `Yearly.png` — plan features/pricing reference.
- `app.json` — bundleId `com.dealnux.app`; expo-build-properties has the CocoaPods
  `modular_headers` fix for GoogleUtilities + RecaptchaInterop (needed for a clean pod install).
- `package.json` — includes `react-native-nitro-modules ^0.36.5` (required by react-native-iap 16).

## 🏷️ STORE LISTING METADATA (Play Store–compliant, reuse for App Store)
Final approved app name/short/full description live in the Claude memory file
`dealnux-store-listing-metadata.md` (on the Windows PC's `~/.claude`). The key rule:
**no popularity/testimonial/"best/#1" claims** (that's what got Play Store rejected).
If needed, ask the user to paste that text, or re-derive from
`.claude/Problem/DEALNUX.App.Deployment.Write.Up.docx`.

---

## 🔁 HOW TO RESUME ON THE MAC
1. `git clone` the repo from GitHub, `cd` in, `npm install`.
2. Open Claude Code in the project. Say: **"Read `.claude/MAC-HANDOFF.md` and continue the
   iOS submission."**
3. Claude won't have the old chat, but this doc + the committed `.claude/` plans give it
   everything. The memory files from the PC won't be there — the important bits are captured above.
