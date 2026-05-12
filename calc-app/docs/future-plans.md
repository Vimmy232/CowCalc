# Future Plans

## Goal
Build a paid token-based access model for CowCalc with device limits, self-service recovery, and server-hosted plan sync.

## Product Direction
- Monthly subscription target: USD 5-6.
- Core value: quality-of-life workflow, team sharing, and cloud persistence.
- Future differentiator: more accurate upkeep/economic controls over time.

## Phased Roadmap

### Phase 1: Platform Foundation
- Define plans and entitlements.
- Add PostgreSQL schema for users, tokens, subscriptions, and device sessions.
- Define backend API contract for auth, token lifecycle, and device registration.

### Phase 2: Auth + Token Lifecycle
- Create account + email verification.
- Issue token on active subscription.
- Add revoke/rotate endpoints.
- Add token status endpoint for client validation.

### Phase 3: Device Session Limits
- Enforce max 1 laptop, 1 mobile, 1 browser session per account.
- Track heartbeat and expire stale sessions.
- Return actionable errors for limit collisions.

### Phase 4: Recovery + Reset
- Email OTP or magic-link reset flow.
- Allow user to clear stuck device bindings.
- Add cooldown and audit logging.

### Phase 5: Billing
- Integrate payment provider for recurring monthly plan.
- Handle webhook states: active, past_due, canceled.
- Gate token issuance and feature access based on subscription state.

### Phase 6: Cloud Storage + Sharing
- Server-side plan storage with quota per tier.
- Team sharing with owner/editor permissions.
- Evaluate Oracle-hosted deployment for managed persistence and collaboration.

### Phase 7: Admin + Ops
- Internal admin panel for support actions.
- Search users/tokens, force reset devices, inspect audit trail.
- Add monitoring/alerts for auth, billing, and sync failures.

## Initial Data Model Status
Implemented as SQL scaffold in backend/sql/001_init_token_platform.sql.

## API Contract Status
Implemented as draft endpoints in backend/api/token-platform.md.

## Success Criteria
- A subscribed user can access the app with a valid token.
- Device limits are enforced exactly (1 laptop, 1 mobile, 1 browser session).
- A locked-out user can self-reset via email.
- Subscription changes immediately affect token access.
