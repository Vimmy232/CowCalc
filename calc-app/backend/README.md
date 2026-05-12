# Backend Scaffold

This folder contains the first implementation artifacts for the token-based monetization platform.

## Included
- `sql/001_init_token_platform.sql`: PostgreSQL schema scaffold.
- `api/token-platform.md`: initial API contract draft.
- `service/`: runnable Node service scaffold with device session limit endpoints.

## Current Scope
Phase 1 groundwork only:
- Data model for users, plans, subscriptions, tokens, device sessions, reset requests, and audit events.
- API endpoint definitions for auth/token/device/reset/billing.

## Next Implementation Steps
1. Add migrations runner and apply `001_init_token_platform.sql`.
2. Replace in-memory sessions with PostgreSQL persistence.
3. Implement auth + token issue endpoints.
4. Add email-based reset flow.
5. Integrate billing webhooks.

## Run Service Scaffold
```bash
cd backend/service
npm install
npm run dev
```

Health check:
`GET http://localhost:4010/health`

## Notes
- Device limits are modeled as one active session per `device_type` (`laptop`, `mobile`, `browser`).
- Token persistence should store only token hash, not plain token.
