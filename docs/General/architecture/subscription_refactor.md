# Pro Credits & Subscription Refactor - Implementation Specification

## Objective

Implement a centralized Pro Credits system that controls access to all Pro Features.

The system must support:

* Guest users
* Free registered users
* Pro subscribers

This refactor must reuse the existing authentication, registration and subscription infrastructure.

---

# Critical Requirements

Before implementing any code, review the current quota, subscription, auth, modal and feature-access logic.

The goal is to EXTEND the current system, not create a second parallel quota system.

Do not introduce:

* duplicate quota checks
* duplicate access checks
* competing feature gates
* recursive modal triggers
* modal loops
* multiple sources of truth for credit counts

The final implementation must have a single centralized Pro Credits service responsible for all Pro Feature access decisions.

---

# Existing Components

The following components already work and must be reused without modification:

* Register Modal
* Login Modal
* Subscription / Upgrade Modal
* Stripe integration
* Supabase Auth
* Existing checkout flows

Do not redesign, replace or refactor these components unless absolutely necessary.

Only connect them to the new Pro Credits service.

---

# Environment Variables

All limits must be configurable through environment variables.

Do not hardcode any quota values.

Add the following variables to the environment configuration:

```env
VITE_GUEST_DAILY_PRO_CREDITS=1

VITE_FREE_DAILY_PRO_CREDITS=3

VITE_PRO_DAILY_PRO_CREDITS=25

VITE_FREE_WARNING_THRESHOLD=1

VITE_PRO_WARNING_THRESHOLD=10
```

The application must read all limits from the environment.

This allows future pricing and quota changes without code modifications.

---

# User Tiers

Three tiers exist:

## Guest

Anonymous visitor.

No account.

Daily Pro Credits:

```text
1
```

When credits reach:

```text
0
```

All Pro Features become unavailable.

Attempting to use a Pro Feature must open the existing registration modal.

---

## Free User

Registered account without subscription.

Daily Pro Credits:

```text
3
```

When remaining credits are:

```text
1
```

Show upgrade messaging.

Do not block usage.

When credits reach:

```text
0
```

Block all Pro Features.

Attempting to use a Pro Feature must open the existing subscription modal.

---

## Pro User

Active subscriber.

Daily Pro Credits:

```text
25
```

When remaining credits are:

```text
10 or less
```

Show warning state.

Do not block usage.

When credits reach:

```text
0
```

Block Pro Features for the remainder of the day.

Attempting to use a Pro Feature must open the existing quota exhausted modal.

---

# Centralized Service

Create:

```text
services/proCreditsService.ts
```

This service becomes the only authority for:

* credit calculations
* remaining credits
* warning states
* access checks
* daily resets

Suggested API:

```typescript
getUserTier()

getRemainingCredits()

canUseProFeature()

consumeCredit()

getWarningState()

getBatteryState()

resetDailyCreditsIfNeeded()
```

No feature should implement its own credit logic.

---

# Data Model

Store:

```typescript
{
  tier: "guest" | "free" | "pro",

  dailyCreditsUsed: number,

  lastCreditResetDate: string
}
```

If an equivalent structure already exists, reuse it.

Do not create duplicate storage.

---

# Daily Reset

Use lazy reset logic.

Every access to the Pro Credits service should verify:

```typescript
today > lastCreditResetDate
```

If true:

```typescript
dailyCreditsUsed = 0

lastCreditResetDate = today
```

No cron jobs.

No scheduled jobs.

No background workers.

---

# Global Provider

Create:

```text
providers/ProCreditsProvider
```

Responsibilities:

* current tier
* remaining credits
* battery state
* warning state

This provider should be used by all Pro Features.

Avoid repeated quota calculations throughout the application.

---

# Battery Indicator

Add a very small battery indicator similar to the macOS battery icon.

Location:

```text
Home page
Below the promotional banner
Above the main content
```

Requirements:

* minimal footprint
* not visually dominant
* always visible
* reflects remaining Pro Credits

States:

Full:
Green battery

Medium:
Yellow battery

Low:
Red battery

Exhausted:
Broken/disabled battery

This is a status indicator, not a call-to-action.

---

# Movie / Video Integration (Phase 1)

Only integrate Movie / Video first.

Avatar integration will come later.

---

# Swipe Selector

Current title:

```text
Swipes
```

Change to:

```text
Swipes [PRO]
```

The PRO badge must appear immediately to the right of the title.

---

# Badge Tooltip

Hover text:

```text
Selecting any swipe outside Core consumes 1 Pro Credit.
```

---

# Consumption Rules

Only non-Core swipes consume credits.

Flow:

```text
User selects premium swipe
        ↓
Check credits
        ↓
Allowed?
        ↓
YES → Consume 1 Credit
        ↓
Execute Swipe

NO → Open Modal
```

---

# Feature Lock State

When remaining credits reach zero:

* Pro badges become gray
* Pro badges become visually disabled
* Cursor changes to disabled state

Suggested styling:

```css
opacity: 0.5;
cursor: not-allowed;
filter: grayscale(100%);
```

---

# Modal Routing

Guest:

```typescript
openRegisterModal()
```

Free:

```typescript
openUpgradeModal()
```

Pro:

```typescript
openQuotaExhaustedModal()
```

Reuse existing modals.

Do not create new modal implementations.

---

# Future Expansion

The implementation must be generic.

Future features such as:

* Avatar
* Image Generation
* Premium Search
* Future Pro Tools

must only need:

```typescript
isProFeature = true
```

and automatically inherit:

* quota checks
* battery status
* warnings
* credit consumption
* modal routing
* daily reset behavior

without additional business logic.

Con esto el agente tiene instrucciones mucho más precisas para evitar uno de los riesgos más comunes en estos refactors: terminar con una lógica nueva de créditos corriendo en paralelo a la lógica actual de acceso, generando dobles bloqueos, contadores inconsistentes o loops de modales.
