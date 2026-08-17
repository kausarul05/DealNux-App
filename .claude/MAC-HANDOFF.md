# 🖥️ DEALNUX — Mac Handoff (finish the iOS App Store submission)

> **Fresh Claude Code on the Mac: read this file first.** It carries the full state
> of the work. The chat session does NOT transfer between machines — this doc is the bridge.
>
> User: kausarul (kauserulislam0055@gmail.com), replies in romanized Bengali (Banglish) — answer in Banglish.

---

## 🎯 THE MAC TASK (short version)
Upload the **already-built iOS `.ipa`** to App Store Connect using the user's OWN
Apple ID (no shared API key), test the In-App Purchases on the iPhone via TestFlight
+ Sandbox, then submit for review. **A heavy local dev setup is NOT required** — just
the free **Transporter** app + the `.ipa`.

## 📦 THE iOS BUILD
- Built via EAS (production profile), version **1.0.0**, buildNumber **1**, includes ALL
  the fixes below.
- **Direct `.ipa` download (CURRENT — includes the login/session fix):**
  `https://expo.dev/artifacts/eas/vzAWMLbENtv2EUeD4HJgysnyZxn6fqto-AvdyZ8Dc24.ipa`
  (Earlier `.ipa`s predate the session fix — do not use them.)
- Build page: `https://expo.dev/accounts/kausarul/projects/savvy-shopper/builds/b2a450b7-d18b-4f75-aacb-2b501eab5eca`
  (If a newer iOS build exists, use `eas build:list --platform ios` and take the latest finished one.)

## 📲 MAC STEPS (do this with the user, live)
1. **Transporter** — install from the Mac App Store (free, by Apple).
2. **App-specific password** — user goes to appleid.apple.com → Sign-In & Security →
   App-Specific Passwords → create one. (User keeps it; Claude never sees it.)
3. **Download the `.ipa`** from the build page above.
4. **Upload** — open Transporter → sign in with **kauserulislam0055@gmail.com** + the
   app-specific password → drag the `.ipa` → **Deliver**. ~10–15 min → the build appears
   in App Store Connect → **TestFlight** (Processing, then ready).
5. **Test on the iPhone (Sandbox)** — install via the **TestFlight** app → iPhone
   Settings → App Store → **Sandbox Account** → sign in with the Sandbox tester
   (`dealnux.sandbox@test.com`; user types the password) → open the app → buy each of the
   4 subscription plans (Sandbox = fake money).
   - ⚠️ Purchases only unlock if the backend `payment/apple/verify/` endpoint is LIVE (see Pending).
6. **Per-product review screenshots** — screenshot the subscription screen from the
   TestFlight build; attach one to EACH of the 4 subscription products in App Store Connect.
7. **Submit for review** — App Store Connect → the app version → attach the 4 subscriptions
   + app screenshots, add a **reviewer demo login + notes** (how to reach the subscription
   screen), then **Submit for Review**. The user's App Manager role can do this.

## 🚫 HARD CONSTRAINTS (do not break)
- **No shared App Store Connect API key** — client refuses. Upload only via Transporter/Xcode
  with the user's OWN Apple ID. Do NOT use `eas submit` (needs an API key → 403).
- **Claude must NOT enter passwords / 2FA / create accounts.** User types every password.
  For interactive terminal logins, tell the user to run it with the `! <command>` prefix.
- Do NOT touch the Android Stripe flow. Keystores/passwords/.p8 are secrets — never commit/print.

## 📁 FILES TO BRING TO THE MAC (not in git!)
- **`.env`** (gitignored) — API endpoints. Copy it from the Windows PC into the project root,
  or the app won't connect. **Required.**
- For iOS work you do NOT need `credentials.json` or `release.jks` (those are Android signing only).

## 🔁 RESUME WITH CLAUDE ON THE MAC (optional — only if you want Claude's help there)
```
brew install node
npm install -g @anthropic-ai/claude-code
git clone https://github.com/kausarul05/DealNux-App.git
cd DealNux-App
npm install          # then copy .env into this folder
claude               # then say: "Read .claude/MAC-HANDOFF.md and continue the iOS submission"
```

---

## ✅ WHAT WAS FIXED THIS SESSION (client feedback from Randy A)
All in git on `main`. The iOS build + Android v4 build both include these:
1. App name **DEALNUX → DealNux** (also fbsdk displayName).
2. New client logo (`assets/Dealnux_Final.png`) as **app icon** (full-bleed) + **splash screen**
   (there was no splash config before → a default flashed on launch).
3. Chatbot → **"DealNux AI"**: robot icon, website welcome message + suggestions, "Online · Ready to help".
   (`src/components/ChatModal.tsx`)
4. **Auto token-refresh interceptor** (`src/utils/authInterceptor.ts`) — fixes app freeze / "no data" /
   crash after ~30 min. The refresh token was stored but never used. **Needs backend to set the
   `REFRESH_TOKEN` endpoint** in `.env` AND in the **EAS production environment** (see Pending).
5. **Comparison crash fixed** — `pollForCompareData` was used before its declaration (temporal dead
   zone) and crashed ProductDetails. (`src/screens/Home/ProductDetails.tsx`)
6. **Legal & Policies**: all 14 website policy tabs via a shared `PolicyViewer` screen (was only 3,
   and Privacy showed EMI-policy content). (`src/screens/Settings/PolicyViewer.tsx`, `Profile.tsx`)
7. **Copyright** line matching the website footer added to Profile.
8. **Contact "Send Message"** button alignment fixed (`ContactUs.tsx`).
9. **AD_ID permission stripped** via config plugin (`plugins/withRemoveAdId.js`) so Play Console
   "advertising ID = No" is valid on Android.

## 🤖 ANDROID / PLAY STORE (separate track — needs only a browser, no Mac)
- **AAB ready (versionCode 4, AD_ID-fixed, signed with release.jks):**
  `https://expo.dev/artifacts/eas/aq5LfkMId3sJQ4md9ln1Snctv06PnB4lpGuoaZNS1-Q.aab`
- Play Console → DealNux → Test and release → Production → Create new release (this is an UPDATE to
  the existing app, NOT a new app) → upload the `.aab` → **App content → Advertising ID → "No"** →
  add the **512×512 store icon** (`appstore-assets/playstore_icon_512.png`) under Store presence →
  Main store listing → ensure store-listing text is the compliant version → Send for review.
- Version config: `eas.json` uses `appVersionSource: local`; Android versionCode lives in
  `app.json` (`android.versionCode`), iOS in `app.json` (`ios.buildNumber`). Bump manually per release.
- Android production is signed with the **local `release.jks`** (SHA1 `1FB9ACC1…`, the Play upload
  key) forced via `credentialsSource: local` + `credentials.json` (gitignored). Keep release.jks safe.

## ⏳ PENDING (backend — message the backend dev)
1. **Token refresh** — give the refresh endpoint path (e.g. `account/login/refresh/`); set it in
   `.env` `REFRESH_TOKEN` AND in the **EAS production environment**. Also raise ACCESS_TOKEN_LIFETIME.
2. **Contact Us** — `POST policy/contact/send/` is failing ("Failed to send message"); confirm it's
   live and returns `{ ticket_id }`.
3. **Apple IAP** — `payment/apple/verify/` (keyless offline JWS verify) + `payment/apple/notifications/`
   (Server Notifications V2) must be live, or Sandbox purchases won't unlock and the reviewer rejects.

## 🗂️ KEY PROJECT DOCS
- `.claude/iOS-IAP-Plan.md` — full IAP plan (Part D = keyless verification).
- `.claude/postman/frontend_ios_iap_guideline 1.md` — backend contract (4 subscription products).
- 4 subscription products already created in App Store Connect (group "DealNux Premium", app Apple ID
  6800175439): pro.monthly $5.99, ultimate.monthly $24.99, promax.yearly $69.99, ultimania.yearly $179.99.
