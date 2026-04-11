# Backend Contracts — New & Modified Types

Generated from the `contract` pass. Use this as the single source of truth for
frontend binding generation.

---

## Modified: `types/wallet-recharge.mo`

### `RechargeApiConfig` — new field added

| Field | Type | Notes |
|---|---|---|
| `apiUrl` | `Text` | |
| `apiKey` | `Text` | |
| `responseParam` | `Text` | |
| `isActive` | `Bool` | |
| `autoRefundEnabled` ✨ | `Bool` | When `true`, setting status to "Failed" triggers automatic refund (implement in develop pass) |

> **Breaking change for existing callers of `updateRechargeApiConfig`:** signature now includes `autoRefundEnabled : Bool` as a 5th parameter.

---

## New: `types/offer-portal.mo`

### `OfferUser`

| Field | Type | Notes |
|---|---|---|
| `id` | `Nat` | Auto-incremented |
| `userId` | `Text` | Prefixed `"offer_user_<id>"` — isolated from main User IDs |
| `email` | `Text` | Login credential |
| `passwordHash` | `Text` | Stored as plaintext initially; hash in future |
| `referralCode` | `Text` | Unique per user |
| `referredBy` | `?Text` | Referral code of the referrer |
| `totalEarnings` | `Nat` | Lifetime credited (paise) |
| `pendingEarnings` | `Nat` | Credited-but-not-withdrawn (paise) |
| `createdAt` | `Int` | Nanoseconds |

### `OfferTransaction`

| Field | Type | Notes |
|---|---|---|
| `id` | `Nat` | |
| `offerUserId` | `Nat` | FK → `OfferUser.id` |
| `txType` | `{ #cpalead; #referralBonus; #manualCredit }` | Variant |
| `amount` | `Nat` | Paise |
| `description` | `Text` | |
| `createdAt` | `Int` | |
| `status` | `{ #pending; #credited; #reversed }` | |

### `OfferWithdrawal`

| Field | Type | Notes |
|---|---|---|
| `id` | `Nat` | |
| `offerUserId` | `Nat` | |
| `upiId` | `Text` | User-supplied UPI ID |
| `amount` | `Nat` | Paise |
| `status` | `{ #pending; #approved; #rejected; #paid }` | |
| `requestedAt` | `Int` | |
| `processedAt` | `?Int` | Set when resolved |
| `adminNote` | `?Text` | Admin comment on resolution |

### `OfferPortalConfig`

| Field | Type | Notes |
|---|---|---|
| `isEnabled` | `Bool` | Master on/off toggle |
| `cpaLeadWebhookSecret` | `Text` | Shared secret to verify postbacks |
| `adminProfitPct` | `Nat` | Default 60 |
| `userProfitPct` | `Nat` | Default 40; must sum with admin to 100 |

### `SmsConfig`

| Field | Type | Notes |
|---|---|---|
| `fast2smsApiKey` | `Text` | Fast2SMS API key (admin-managed) |
| `senderId` | `Text` | Sender ID, default `"DZNAGI"` |
| `isEnabled` | `Bool` | |

### `RechargeReceipt`

| Field | Type | Notes |
|---|---|---|
| `id` | `Nat` | |
| `txnId` | `Nat` | FK → `RechargeTransaction.id` |
| `userId` | `Nat` | |
| `mobile` | `Text` | |
| `operator` | `Text` | |
| `circle` | `Text` | |
| `amount` | `Nat` | In paise (note: RechargeTransaction uses `Float`) |
| `commission` | `Nat` | |
| `netCost` | `Nat` | |
| `referenceId` | `Text` | API-returned reference |
| `generatedAt` | `Int` | |

---

## New public functions in `main.mo`

### Offer Portal — user-facing

| Function | Return | Notes |
|---|---|---|
| `registerOfferUser(email, passwordHash, referralCode)` | `async Nat` | Returns new offerUserId |
| `loginOfferUser(email, passwordHash)` | `async OfferUser` | |
| `getOfferEarningsSummary(offerUserId)` | `async { totalEarnings; pendingEarnings; referralCode }` | query |
| `getMyOfferTransactions(offerUserId)` | `async [OfferTransaction]` | query |
| `requestOfferWithdrawal(offerUserId, upiId, amount)` | `async Nat` | Returns withdrawalId |
| `getMyOfferWithdrawals(offerUserId)` | `async [OfferWithdrawal]` | query |

### Offer Portal — CPALead postback

| Function | Return | Notes |
|---|---|---|
| `processCpaLeadPostback(offerUserId, grossAmount, webhookSecret)` | `async Bool` | Verifies secret, splits 60/40, credits earnings, fires 1% referral bonus |

### Offer Portal — Admin (🚀 OFFER CONTROL CENTER)

| Function | Return | Notes |
|---|---|---|
| `adminListOfferUsers()` | `async [OfferUser]` | Admin only |
| `adminListPendingWithdrawals()` | `async [OfferWithdrawal]` | Admin only |
| `adminResolveWithdrawal(id, newStatus, adminNote)` | `async Bool` | Admin only; `newStatus ∈ {#approved; #rejected; #paid}` |
| `getOfferPortalConfig()` | `async OfferPortalConfig` | Admin only |
| `updateOfferPortalConfig(isEnabled, cpaLeadWebhookSecret, adminProfitPct, userProfitPct)` | `async Bool` | Admin only |

### SMS Config

| Function | Return | Notes |
|---|---|---|
| `getSmsConfig()` | `async SmsConfig` | Admin only |
| `updateSmsConfig(fast2smsApiKey, senderId, isEnabled)` | `async Bool` | Admin only |

### Recharge Receipts

| Function | Return | Notes |
|---|---|---|
| `getRechargeReceipt(txnId)` | `async ?RechargeReceipt` | |
| `getMyRechargeReceipts()` | `async [RechargeReceipt]` | Returns all receipts for caller |

### Modified: `updateRechargeApiConfig`

New signature (breaking):
```
updateRechargeApiConfig(apiUrl, apiKey, responseParam, isActive, autoRefundEnabled) : async Bool
```

---

## Architecture notes

- **Offer Portal users are completely isolated** from main app users. Their IDs (`offer_user_<N>`) do not overlap with main `User.id : Nat`.
- **CPALead postback** flow: `processCpaLeadPostback` → verify `webhookSecret == offerPortalConfig.cpaLeadWebhookSecret` → `calculateProfitSplit` (40% to user) → credit `OfferTransaction` → fire 1% referral bonus if `referredBy` is set → (in develop pass) trigger SMS via `lib/sms.mo` + http-outcalls extension.
- **Receipts** are generated in the develop pass inside `initiateRecharge` after a successful status update.
- **Auto-refund** (`autoRefundEnabled`): in the develop pass, `updateRechargeStatus` will detect `status == "Failed"` and auto-call `refundRecharge` when the flag is true.
- **SMS** (`lib/sms.mo`) builds the `HttpRequest`; the mixin must call the `http-outcalls` platform extension to actually transmit.
