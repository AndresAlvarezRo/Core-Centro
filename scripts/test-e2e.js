#!/usr/bin/env node
/**
 * Core-Hogar end-to-end smoke test.
 *
 * Flow:
 *   1. Login on Centro-Hogar to obtain a JWT.
 *   2. Hit GET /auth/validate, /profile, /apps on Core-Hogar with that JWT.
 *   3. Simulate Boslei publishing a notification.
 *   4. Simulate Piggy-Bank publishing a notification.
 *   5. Read GET /notifications and assert both appear, newest first.
 *
 * Usage:
 *   CH_USER=admin@home CH_PASS=secret node scripts/test-e2e.js
 *   # or override hosts:
 *   CH_BASE=http://localhost CORE_BASE=http://localhost:6100 node scripts/test-e2e.js
 *
 * Exits 0 on success, non-zero with a clear message on failure.
 * Uses only Node 20 built-ins (global fetch).
 */

const CH_BASE = (process.env.CH_BASE || 'http://localhost').replace(/\/$/, '');
const CORE_BASE = (process.env.CORE_BASE || 'http://localhost:6100').replace(/\/$/, '');
const CH_USER = process.env.CH_USER;
const CH_PASS = process.env.CH_PASS;

if (!CH_USER || !CH_PASS) {
  console.error('Set CH_USER and CH_PASS env vars (Centro-Hogar credentials).');
  process.exit(2);
}

function step(label) {
  console.log(`\n→ ${label}`);
}

function assertEq(actual, expected, label) {
  if (actual !== expected) {
    console.error(`✗ ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    process.exit(1);
  }
  console.log(`✓ ${label}`);
}

function assertTrue(cond, label) {
  if (!cond) {
    console.error(`✗ ${label}`);
    process.exit(1);
  }
  console.log(`✓ ${label}`);
}

async function jsonFetch(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function main() {
  // 1. Login on Centro-Hogar
  step(`Logging in on ${CH_BASE}/api/auth/login`);
  const login = await jsonFetch(`${CH_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CH_USER, password: CH_PASS }),
  });
  assertEq(login.status, 200, 'login status 200');
  assertTrue(login.body && login.body.token, 'login returned token');
  const token = login.body.token;
  const userId = login.body.user.id;
  const auth = { Authorization: `Bearer ${token}` };

  // 2. validate / profile / apps
  step(`GET ${CORE_BASE}/auth/validate`);
  const validate = await jsonFetch(`${CORE_BASE}/auth/validate`, { headers: auth });
  assertEq(validate.status, 200, 'validate status 200');
  assertEq(validate.body.valid, true, 'validate.valid === true');
  assertEq(String(validate.body.user_id), String(userId), 'validate.user_id matches');

  step(`GET ${CORE_BASE}/profile`);
  const profile = await jsonFetch(`${CORE_BASE}/profile`, { headers: auth });
  assertEq(profile.status, 200, 'profile status 200');
  assertTrue(profile.body && profile.body.id, 'profile has id');
  assertTrue(profile.body && profile.body.email, 'profile has email');
  assertTrue(profile.body && profile.body.name, 'profile has name');

  step(`GET ${CORE_BASE}/apps`);
  const apps = await jsonFetch(`${CORE_BASE}/apps`, { headers: auth });
  assertEq(apps.status, 200, 'apps status 200');
  assertTrue(Array.isArray(apps.body), 'apps body is array');
  assertTrue(apps.body.length > 0, 'apps non-empty');
  for (const a of apps.body) {
    assertTrue(typeof a.id === 'string' && a.id.length > 0, `app has id: ${a.id}`);
  }

  // 3-4. Publish notifications from two different apps
  const boscleiMsg = `[e2e] Boslei sprint cerrado @ ${new Date().toISOString()}`;
  const piggyMsg = `[e2e] Piggy-Bank gasto registrado @ ${new Date().toISOString()}`;

  step(`POST ${CORE_BASE}/events/notification (boslei)`);
  const ingestB = await jsonFetch(`${CORE_BASE}/events/notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: String(userId), source_app: 'boslei', message: boscleiMsg }),
  });
  assertEq(ingestB.status, 201, 'ingest boslei status 201');
  assertEq(ingestB.body.status, 'stored', 'ingest boslei stored');

  step(`POST ${CORE_BASE}/events/notification (piggy-bank)`);
  const ingestP = await jsonFetch(`${CORE_BASE}/events/notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: String(userId), source_app: 'piggy-bank', message: piggyMsg }),
  });
  assertEq(ingestP.status, 201, 'ingest piggy-bank status 201');

  // Negative: unknown source_app must be rejected
  step(`POST ${CORE_BASE}/events/notification (unknown app — must reject)`);
  const ingestX = await jsonFetch(`${CORE_BASE}/events/notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: String(userId), source_app: 'martian', message: 'should fail' }),
  });
  assertEq(ingestX.status, 403, 'unknown source_app rejected with 403');

  // 5. List notifications and verify both are there
  step(`GET ${CORE_BASE}/notifications`);
  const list = await jsonFetch(`${CORE_BASE}/notifications`, { headers: auth });
  assertEq(list.status, 200, 'notifications status 200');
  assertTrue(Array.isArray(list.body), 'notifications body is array');
  const messages = list.body.map((n) => n.message);
  assertTrue(messages.includes(boscleiMsg), 'boslei notification present');
  assertTrue(messages.includes(piggyMsg), 'piggy-bank notification present');

  // Order check: newest first means piggy-bank should appear before boslei
  // among the two we just inserted.
  const idxB = messages.indexOf(boscleiMsg);
  const idxP = messages.indexOf(piggyMsg);
  assertTrue(idxP < idxB, 'piggy-bank (newer) appears before boslei (older)');

  console.log('\n✅ Core-Hogar E2E test passed.');
}

main().catch((err) => {
  console.error('\n💥 E2E test crashed:', err && err.message ? err.message : err);
  process.exit(1);
});
