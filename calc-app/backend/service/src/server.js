import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4010);

const deviceLimits = {
  laptop: Number(process.env.DEVICE_LIMIT_LAPTOP || 1),
  mobile: Number(process.env.DEVICE_LIMIT_MOBILE || 1),
  browser: Number(process.env.DEVICE_LIMIT_BROWSER || 1),
};

// Temporary in-memory store for scaffold/testing.
// Replace with PostgreSQL-backed sessions in next phase.
const sessionStore = new Map();

const nowIso = () => new Date().toISOString();
const getSessionKey = (userId, deviceType) => `${userId}:${deviceType}`;
const isValidDeviceType = (deviceType) => Object.hasOwn(deviceLimits, deviceType);
const getSessions = (userId, deviceType) => sessionStore.get(getSessionKey(userId, deviceType)) || [];
const setSessions = (userId, deviceType, sessions) => sessionStore.set(getSessionKey(userId, deviceType), sessions);
const countActiveSessions = (sessions) => sessions.filter((session) => !session.endedAt).length;

// Clean up ended and inactive sessions every hour to prevent memory exhaustion
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

setInterval(() => {
  const now = Date.now();
  for (const [key, sessions] of sessionStore.entries()) {
    const activeSessions = sessions.filter(session => {
      // Remove sessions that have ended or haven't sent a heartbeat within TTL
      const isEnded = !!session.endedAt;
      const heartbeatTime = session.lastHeartbeatAt ? new Date(session.lastHeartbeatAt).getTime() : now;
      const isInactive = now - heartbeatTime > SESSION_TTL_MS;
      return !isEnded && !isInactive;
    });

    if (activeSessions.length === 0) {
      sessionStore.delete(key);
    } else if (activeSessions.length !== sessions.length) {
      sessionStore.set(key, activeSessions);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();

const parseSessionRequest = (body) => ({
  userId: String(body?.userId || '').trim(),
  deviceType: String(body?.deviceType || '').trim(),
  deviceFingerprint: String(body?.deviceFingerprint || '').trim(),
  sessionId: String(body?.sessionId || '').trim(),
});

const validateSessionStart = ({ userId, deviceType, deviceFingerprint }) => {
  if (!userId || !deviceType || !deviceFingerprint) return 'invalid_request';
  if (!isValidDeviceType(deviceType)) return 'invalid_device_type';
  return null;
};

const validateSessionAction = ({ userId, deviceType, sessionId }) => {
  if (!userId || !deviceType || !sessionId) return 'invalid_request';
  if (!isValidDeviceType(deviceType)) return 'invalid_device_type';
  return null;
};

app.use(cors({ origin: process.env.APP_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'cowcalc-token-service' });
});

app.get('/v1/config/device-limits', (_req, res) => {
  res.json(deviceLimits);
});

app.post('/v1/device-sessions/start', (req, res) => {
  const { userId, deviceType, deviceFingerprint } = parseSessionRequest(req.body);
  const validationError = validateSessionStart({ userId, deviceType, deviceFingerprint });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const currentSessions = getSessions(userId, deviceType);
  const existing = currentSessions.find((session) =>
    session.deviceFingerprint === deviceFingerprint && !session.endedAt
  );

  if (existing) {
    return res.json({
      sessionId: existing.sessionId,
      reused: true,
      deviceType,
    });
  }

  const activeCount = countActiveSessions(currentSessions);
  if (activeCount >= deviceLimits[deviceType]) {
    return res.status(409).json({
      error: 'device_limit_exceeded',
      deviceType,
      limit: deviceLimits[deviceType],
      active: activeCount,
    });
  }

  const session = {
    sessionId: randomUUID(),
    userId,
    deviceType,
    deviceFingerprint,
    startedAt: nowIso(),
    lastHeartbeatAt: nowIso(),
    endedAt: null,
  };

  setSessions(userId, deviceType, [...currentSessions, session]);
  return res.status(201).json(session);
});

app.post('/v1/device-sessions/heartbeat', (req, res) => {
  const { userId, deviceType, sessionId } = parseSessionRequest(req.body);
  const validationError = validateSessionAction({ userId, deviceType, sessionId });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const currentSessions = getSessions(userId, deviceType);
  const sessionIndex = currentSessions.findIndex((session) => session.sessionId === sessionId && !session.endedAt);

  if (sessionIndex === -1) {
    return res.status(404).json({ error: 'session_not_found' });
  }

  const nextSessions = [...currentSessions];
  nextSessions[sessionIndex] = {
    ...nextSessions[sessionIndex],
    lastHeartbeatAt: nowIso(),
  };

  setSessions(userId, deviceType, nextSessions);
  return res.json({ ok: true });
});

app.post('/v1/device-sessions/end', (req, res) => {
  const { userId, deviceType, sessionId } = parseSessionRequest(req.body);
  const validationError = validateSessionAction({ userId, deviceType, sessionId });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const currentSessions = getSessions(userId, deviceType);
  const sessionIndex = currentSessions.findIndex((session) => session.sessionId === sessionId && !session.endedAt);

  if (sessionIndex === -1) {
    return res.status(404).json({ error: 'session_not_found' });
  }

  const nextSessions = [...currentSessions];
  nextSessions[sessionIndex] = {
    ...nextSessions[sessionIndex],
    endedAt: nowIso(),
  };

  setSessions(userId, deviceType, nextSessions);
  return res.json({ ok: true });
});

app.post('/v1/recovery/reset-device-sessions', (req, res) => {
  const { userId } = parseSessionRequest(req.body);
  if (!userId) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  for (const [key, sessions] of sessionStore.entries()) {
    if (!key.startsWith(`${userId}:`)) continue;
    const endedSessions = sessions.map((session) => ({
      ...session,
      endedAt: session.endedAt || nowIso(),
    }));
    sessionStore.set(key, endedSessions);
  }

  return res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`[token-service] listening on http://localhost:${port}`);
});
