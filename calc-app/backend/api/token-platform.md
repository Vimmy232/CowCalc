# Token Platform API Draft

This document defines the first API surface for token-based access.

## Auth + User

### POST /v1/auth/register
Creates an account and sends verification email.

Request:
```json
{
  "email": "user@example.com",
  "displayName": "User"
}
```

Response:
```json
{
  "userId": "uuid",
  "emailVerificationRequired": true
}
```

### POST /v1/auth/verify-email
Confirms email verification link/OTP.

### POST /v1/auth/login
Creates app session and returns current subscription + token status.

## Token Lifecycle

### POST /v1/tokens/issue
Issues access token when subscription is active.

Response:
```json
{
  "token": "plain-text-token-once",
  "tokenHint": "****ABCD",
  "expiresAt": null
}
```

### POST /v1/tokens/revoke
Revokes active token.

### GET /v1/tokens/current
Returns active token metadata and access state.

## Device Sessions

### POST /v1/device-sessions/start
Registers a device session and enforces limits by type.

Request:
```json
{
  "deviceType": "laptop",
  "deviceFingerprint": "sha256-fingerprint",
  "userAgent": "..."
}
```

Responses:
- 200: session started
- 409: device_limit_exceeded

Error shape:
```json
{
  "error": "device_limit_exceeded",
  "deviceType": "laptop",
  "limit": 1,
  "active": 1
}
```

### POST /v1/device-sessions/heartbeat
Updates `lastHeartbeatAt` for active session.

### POST /v1/device-sessions/end
Ends active session.

## Recovery

### POST /v1/recovery/request-reset
Sends email reset code/link.

### POST /v1/recovery/confirm-reset
Consumes reset code and clears active device sessions + rotates token.

## Billing

### POST /v1/billing/webhooks/provider
Receives subscription events and updates subscription status.

### GET /v1/billing/subscription
Returns current plan and billing status.

## Storage + Sharing (Phase 2+)

### POST /v1/plans
Create server-saved plan.

### GET /v1/plans/:id
Load plan.

### POST /v1/plans/:id/share
Share plan with another account.
