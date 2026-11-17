const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');
const { resetStore } = require('../src/data/store');

const ALI_ID = '11111111-1111-4111-8111-111111111111';
const SARA_ID = '22222222-2222-4222-8222-222222222222';
const ALI_TASK_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

async function withServer(run) {
  resetStore();
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  try { await run(base); }
  finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

async function jsonRequest(base, path, method = 'GET', body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { response, json: await response.json() };
}

test('GET /api/users returns the seeded users', async () => withServer(async base => {
  const { response, json } = await jsonRequest(base, '/api/users');
  assert.equal(response.status, 200);
  assert.equal(json.success, true);
  assert.equal(json.data.length, 2);
}));

test('POST /api/users rejects whitespace-only names and malformed emails', async () => withServer(async base => {
  const a = await jsonRequest(base, '/api/users', 'POST', { name: '   ', email: 'not-an-email' });
  assert.equal(a.response.status, 400);
  assert.equal(a.json.success, false);
}));

test('POST /api/users rejects duplicate emails case-insensitively', async () => withServer(async base => {
  const { response } = await jsonRequest(base, '/api/users', 'POST', { name: 'Another Ali', email: 'ALI@EXAMPLE.COM' });
  assert.equal(response.status, 400);
}));

test('POST /api/tasks accepts Boolean false and rejects string false', async () => withServer(async base => {
  const good = await jsonRequest(base, '/api/tasks', 'POST', { title: 'Boolean test', userId: ALI_ID, completed: false });
  assert.equal(good.response.status, 201);
  assert.equal(good.json.data.completed, false);
  const bad = await jsonRequest(base, '/api/tasks', 'POST', { title: 'Bad Boolean', userId: ALI_ID, completed: 'false' });
  assert.equal(bad.response.status, 400);
}));

test('DELETE user with assigned tasks returns 409 Conflict', async () => withServer(async base => {
  const { response, json } = await jsonRequest(base, `/api/users/${ALI_ID}`, 'DELETE');
  assert.equal(response.status, 409);
  assert.equal(json.error.code, 'USER_HAS_TASKS');
}));

test('PATCH updates only the supplied task field', async () => withServer(async base => {
  const { response, json } = await jsonRequest(base, `/api/tasks/${ALI_TASK_ID}`, 'PATCH', { completed: true });
  assert.equal(response.status, 200);
  assert.equal(json.data.completed, true);
  assert.equal(json.data.title, 'Learn Docker');
}));

test('GET tasks can filter by userId', async () => withServer(async base => {
  const { response, json } = await jsonRequest(base, `/api/tasks?userId=${SARA_ID}`);
  assert.equal(response.status, 200);
  assert.equal(json.data.length, 1);
  assert.equal(json.data[0].userId, SARA_ID);
}));

test('invalid UUID is distinguished from a valid but missing UUID', async () => withServer(async base => {
  const invalid = await jsonRequest(base, '/api/users/not-a-uuid');
  assert.equal(invalid.response.status, 400);
  const missing = await jsonRequest(base, '/api/users/33333333-3333-4333-8333-333333333333');
  assert.equal(missing.response.status, 404);
}));

test('GET /health returns healthy status', async () => withServer(async base => {
  const { response, json } = await jsonRequest(base, '/health');
  assert.equal(response.status, 200);
  assert.equal(json.status, 'healthy');
}));


test('PUT replaces task fields and applies documented defaults', async () => withServer(async base => {
  const { response, json } = await jsonRequest(base, `/api/tasks/${ALI_TASK_ID}`, 'PUT', {
    title: 'Replacement task',
    userId: SARA_ID
  });
  assert.equal(response.status, 200);
  assert.equal(json.data.title, 'Replacement task');
  assert.equal(json.data.userId, SARA_ID);
  assert.equal(json.data.description, '');
  assert.equal(json.data.completed, false);
}));

test('PATCH rejects an empty object and unknown fields', async () => withServer(async base => {
  const empty = await jsonRequest(base, `/api/tasks/${ALI_TASK_ID}`, 'PATCH', {});
  assert.equal(empty.response.status, 400);
  const unknown = await jsonRequest(base, `/api/tasks/${ALI_TASK_ID}`, 'PATCH', { admin: true });
  assert.equal(unknown.response.status, 400);
}));

test('POST task rejects a userId that does not exist', async () => withServer(async base => {
  const { response, json } = await jsonRequest(base, '/api/tasks', 'POST', {
    title: 'Orphan task',
    userId: '33333333-3333-4333-8333-333333333333'
  });
  assert.equal(response.status, 400);
  assert.equal(json.error.code, 'VALIDATION_ERROR');
}));

test('PATCH user rejects an email already used by another user', async () => withServer(async base => {
  const { response } = await jsonRequest(base, `/api/users/${ALI_ID}`, 'PATCH', {
    email: 'SARA@EXAMPLE.COM'
  });
  assert.equal(response.status, 400);
}));

test('malformed JSON returns a consistent 400 response', async () => withServer(async base => {
  const response = await fetch(`${base}/api/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{invalid json'
  });
  const json = await response.json();
  assert.equal(response.status, 400);
  assert.equal(json.error.code, 'INVALID_JSON');
}));

test('unknown routes return the documented JSON 404 format', async () => withServer(async base => {
  const { response, json } = await jsonRequest(base, '/api/unknown-resource');
  assert.equal(response.status, 404);
  assert.equal(json.error.code, 'ROUTE_NOT_FOUND');
}));

test('invalid pagination returns 400', async () => withServer(async base => {
  const { response, json } = await jsonRequest(base, '/api/tasks?page=0&limit=101');
  assert.equal(response.status, 400);
  assert.equal(json.error.code, 'INVALID_PAGINATION');
}));

test('a user without tasks can be deleted', async () => withServer(async base => {
  const created = await jsonRequest(base, '/api/users', 'POST', {
    name: 'Temporary User',
    email: 'temporary@example.com'
  });
  assert.equal(created.response.status, 201);
  const deleted = await jsonRequest(base, `/api/users/${created.json.data.id}`, 'DELETE');
  assert.equal(deleted.response.status, 200);
  assert.equal(deleted.json.message, 'User deleted');
}));
