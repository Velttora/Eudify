# Payments Architecture (Stripe Connect Express)

## Decision

- **Stripe Connect Express** was selected over Standard:
  - Better UX control (embedded onboarding redirects in app flow).
  - Platform can orchestrate payouts/fees with destination charges.
  - Easier to enforce business gates (`offers/availability` blocked until ready).

## High-Level Flow

1. Family creates account/profile (payment method optional).
2. Family adds card via Stripe Elements + SetupIntent.
3. Family can book only if has a default payment method.
4. Educator connects Stripe account via Connect onboarding link.
   Express accounts in Colombia are created as **recipient** accounts with only
   the `transfers` capability (`country: 'CO'`, `default_currency: 'cop'`).
   `card_payments` is **not** requested — local card acquiring is unavailable for
   CO connected accounts. Platform charges the family; funds move with
   destination charges / `transfer_data.destination`
   (see [cross-border payouts](https://stripe.com/docs/connect/cross-border-payouts)).
   Onboarding is complete when `details_submitted` + `payouts_enabled` (not `charges_enabled`).
5. Educator can publish offers/availability only when account is fully enabled.
6. On appointment acceptance:
   - API creates & confirms PaymentIntent (`off_session`).
   - `application_fee_amount` keeps platform fee (`PLATFORM_FEE_BPS`, default 5%).
   - `transfer_data.destination` sends net amount to educator connected account.
7. Webhooks confirm async status (`payment_intent.*`, `account.updated`).

## Backend Modules

- `apps/api/src/stripe`:
  - Stripe SDK initialization and webhook secret retrieval.
- `apps/api/src/payments`:
  - Customer/payment method management (families).
  - Connect onboarding/status (educators).
  - Automatic charge on booking acceptance.
- `apps/api/src/webhooks`:
  - Stripe signature validation.
  - Idempotent event persistence and state sync.

## Frontend Surfaces

- `apps/web/src/app/dashboard/consumer/pagos/page.tsx`
  - Add card (Elements), list methods, set default.
- `apps/web/src/app/dashboard/provider/pagos/page.tsx`
  - View Connect status, continue onboarding.
- `apps/web/src/features/payments/api/payments-api.ts`
  - Typed API layer for payments/connect calls.

## Data Model (Prisma)

Added entities:

- `StripeCustomer`
- `StripeAccount`
- `PaymentMethod`
- `Payment`
- `Payout`
- `StripeWebhookEvent`

And appointment pricing snapshot fields:

- `Appointment.quotedPriceMinor`
- `Appointment.quotedCurrency`

## Extensibility Hooks

- Subscription-ready foundation:
  - Webhook event store already in place.
  - Stripe module abstraction isolates provider SDK usage.
  - Payment state machine can be extended with invoice/subscription identifiers.
- Future wallet/internal balance:
  - `Payment` and `Payout` tables can map ledger entries later.
  - Keep Stripe identifiers as external references, not core business IDs.
