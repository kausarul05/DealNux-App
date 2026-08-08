# DEALNUX — Apple In-App Purchase (RevenueCat) Integration Plan

**Goal:** Premium subscription-er payment iOS-e Apple In-App Purchase (RevenueCat diye) korte hobe.
**Principle:** Surgical change — **Android-er Stripe flow ekdom touch korbo na**. Physical products (Cart), Ads, Stripe Connect — sob age-er motoi thakbe. Shudhu `Subscription.tsx`-er Premium purchase flow-e iOS branch add hobe.

---

## 1. Architecture (kivabe kaj korbe)

```
iOS user "Subscribe" chape
        │
        ▼
RevenueCat SDK (app) ── Apple purchase sheet ── Apple charge kore
        │
        ▼
RevenueCat server ── receipt verify kore ── "premium" entitlement active
        │
        ├──► App: customerInfo.entitlements["premium"].isActive  →  UI unlock
        │
        └──► Webhook  →  DealNux backend  →  user ke Premium mark kore (DB)
                                              (renewal / cancel / refund-o ei webhook e ase)
```

- **Source of truth = RevenueCat.** Backend RevenueCat-er webhook shune Premium grant/revoke kore.
- **App user id = DealNux user id** (`Purchases.logIn(userId)`), jate webhook-e kon user bujhা jay.

---

## 2. Naming (fixed rakhbo)

| Jinis | Value |
|---|---|
| Entitlement (RevenueCat) | `premium` |
| iOS product — monthly | `com.dealnux.app.premium.monthly` |
| iOS product — yearly | `com.dealnux.app.premium.yearly` |
| Offering (RevenueCat) | `default` |

> Product id backend-er `plan_type` (MONTHLY/YEARLY)-er sathe map hobe. Backend plan table-e ekTA `apple_product_id` column add korle cleanest.

---

## 3. Part A — Dashboard setup (⚠️ Admin role lage)

### App Store Connect
1. My Apps → DEALNUX → **Subscriptions** (Monetization)
2. Subscription Group banao: `DealNux Premium`
3. 2 ta auto-renewable subscription:
   - `com.dealnux.app.premium.monthly` — price (backend-er monthly price-er sathe mil)
   - `com.dealnux.app.premium.yearly` — price
4. Free trial dorkar hole (backend `trial_days` ache) → **Introductory Offer** set
5. Localization + review screenshot (Apple subscription-e product screenshot chay)
6. **App Store Connect → Users and Access → Keys → In-App Purchase key** (App-Specific Shared Secret / API key) → RevenueCat-e dite hobe

### RevenueCat
1. [app.revenuecat.com](https://app.revenuecat.com) — free account, project `DEALNUX`
2. Apps → add **App Store** app → bundle id `com.dealnux.app` → App-Specific Shared Secret / App Store Connect API key boshao
3. **Entitlements** → `premium` banao
4. **Products** → upore-r 2 ta product id add
5. **Offerings** → `default` → 2 ta package (monthly, yearly) → entitlement `premium` attach
6. **Project settings → API Keys** → **iOS public SDK key** copy (app-e lagbe)
7. **Integrations → Webhooks** → backend-er webhook URL add (backend dev-er sathe)

---

## 4. Part B — Package install & Expo config

```bash
npx expo install react-native-purchases
```
- `react-native-purchases`-e Expo config plugin ache → `npx expo prebuild` / EAS build-e native part auto add hobe।
- `.env`-e add:
  ```
  REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxxxxx
  ```
- `env.d.ts`-e add: `export const REVENUECAT_IOS_API_KEY: string;`

---

## 5. Part C — Frontend code changes

### C1. `App.tsx` — RevenueCat init (iOS only)
Entry-te ekbar init. Android-e kichu hobe na (guard diye).
```tsx
import { useEffect } from 'react';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { REVENUECAT_IOS_API_KEY } from '@env';

// App() component-er bhitore:
useEffect(() => {
  if (Platform.OS === 'ios') {
    Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY });
  }
}, []);
```
> Login-er por (user id pele) `Purchases.logIn(String(userId))` call korte hobe — jate webhook user chine. Logout-e `Purchases.logOut()`. (Login flow-e ei 2 line add hobe — SignIn/SignUp success handler-e.)

### C2. `Subscription.tsx` — platform split (asol kaj)
`handleSubscribe(plan)` er bhitore branch:
```tsx
if (Platform.OS === 'ios') {
  // ── iOS: Apple IAP via RevenueCat ──
  const offerings = await Purchases.getOfferings();
  const pkg = /* plan.plan_type (MONTHLY/YEARLY) diye offering theke package select */;
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  if (customerInfo.entitlements.active['premium']) {
    await fetchSubscriptionStatus();   // backend webhook already grant koreche
    setSuccessPlanName(plan.name);
    setSuccessVisible(true);
  }
} else {
  // ── Android: EXISTING Stripe flow — jemon ache, ekdom unchanged ──
  // (current axios SUBSCRIBE_ENDPOINT + initPaymentSheet + presentPaymentSheet)
}
```
- **Android branch-e purono code hubohu thakbe** — ekTA line-o change hobe na.
- `StripeProvider` / `useStripe` iOS-e call hole problem nei, kintu iOS-e oi code path chalabo na.

### C3. `Subscription.tsx` — "Restore Purchases" button (⚠️ Apple baddhotamulok)
Apple reject kore jodi restore button na thake. iOS-e ekTA button:
```tsx
{Platform.OS === 'ios' && (
  <TouchableOpacity onPress={async () => {
    const info = await Purchases.restorePurchases();
    if (info.entitlements.active['premium']) { await fetchSubscriptionStatus(); }
  }}>
    <Text>Restore Purchases</Text>
  </TouchableOpacity>
)}
```

### C4. Premium unlock check (optional, robustness)
Je jaygায় Premium feature gate ache (ad-free, price alerts), iOS-e RevenueCat `customerInfo`-o check kora jete pare — tobe backend status endpoint already Premium bole, tai **minimum change**-e backend status-er upor-i nirbhor korbo.

**Changed files (frontend):**
- `App.tsx` (init + login/logout hook)
- `src/screens/Subscriptions/Subscription.tsx` (iOS branch + restore button)
- `src/screens/Auth/SignIn.tsx`, `SignUp.tsx` (login-e `Purchases.logIn`) — choto
- `.env`, `env.d.ts`, `package.json`

---

## 6. Part D — Backend changes (⚠️ backend dev-er kaj)

Backend RevenueCat use korle Apple receipt verify **nije korte hobe na** — RevenueCat webhook shunbe.

1. **Webhook endpoint** (e.g. `POST payment/revenuecat/webhook/`)
   - RevenueCat-er events: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `PRODUCT_CHANGE`, `BILLING_ISSUE`
   - `app_user_id` = DealNux user id → oi user-er Premium **grant/revoke**
   - Authorization header verify (RevenueCat webhook secret)
2. Existing `payment/subscription/status/` endpoint Premium ta **je source-ei asuk** (Stripe ba RevenueCat) same `is_active: true` return korbe — app change kom rakhe.
3. (Optional) plan table-e `apple_product_id` column.

> Backend dev-ke bolar moto choto scope: **"RevenueCat webhook receive korে user Premium on/off koro; status endpoint agei ache."**

---

## 7. Part E — Testing (Sandbox)

1. App Store Connect → **Sandbox → Test Account** (fake Apple id) banao
2. iPhone-e Settings → App Store → Sandbox account diye login
3. EAS **development / TestFlight** build-e purchase test (sandbox-e asol taka kate na)
4. RevenueCat dashboard-e event ase kina, backend webhook grant kore kina — verify

---

## 8. Part F — App Review requirements (na korle reject)

- ✅ **Restore Purchases** button (C3)
- ✅ Subscription-er **price, duration, auto-renew** clearly lekha (Apple subscription disclosure)
- ✅ **Terms of Use (EULA) + Privacy Policy** link subscription screen-e
- ✅ Reviewer-er জonno **test login** (client dibe)
- ✅ App Store Connect-e subscription **"Ready to Submit"** + app version-er sathe attach

---

## 9. Part G — Build & submit sequence

```
1. Dashboard setup (App Store Connect products + RevenueCat)   [Admin role]
2. package install + .env key
3. Frontend code (App.tsx + Subscription.tsx + login hooks)
4. Backend webhook (backend dev)
5. eas build --platform ios --profile production   [2FA — user]
6. Sandbox test (purchase + restore + backend grant)
7. Upload + store listing (assets ready) + submit for review
```

---

## 10. Open items / decision needed

- [ ] **Admin role** — client ekhono dey ni (product setup-e lage)
- [ ] **User id** — RevenueCat `logIn`-e DealNux user id lage. App-e ekhon user id kothায় ache (token decode / profile endpoint)? — confirm korte hobe
- [ ] **Backend dev** RevenueCat webhook add korte raji + somoy?
- [ ] **Trial** — backend `trial_days` ache; Apple Introductory Offer-e milাte hobe kina
- [ ] **Prices** — App Store Connect-e Apple-er price tier; backend price-er sathe exact mil na-o hote pare (Apple fixed tiers)

---

## 11. Effort estimate (rough)

| Part | Ke | Somoy |
|---|---|---|
| Dashboard setup | Ami/tumi (Admin lage) | ~2-3 ghonta |
| Frontend code | Ami | ~half day |
| Backend webhook | Backend dev | ~half–1 day |
| Sandbox testing | Ami/tumi | ~2-3 ghonta |

> Android + Stripe: **0 change** (untouched).
