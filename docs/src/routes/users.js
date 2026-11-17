const express = require('express');
const { getUsers, getTasks, createId } = require('../data/store');
const router = express.Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validId(id) { return UUID_PATTERN.test(id); }
function findUser(id) { return getUsers().find(user => user.id === id); }
function validateUserFields(body, { partial = false, currentId = null } = {}) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return ['Request body must be a JSON object'];
  }
  const allowedFields = ['name', 'email'];
  for (const field of Object.keys(body)) {
    if (!allowedFields.includes(field)) errors.push(`unknown field: ${field}`);
  }
  if (partial && Object.keys(body).length === 0) errors.push('PATCH body must contain at least one field');

  if (!partial || Object.hasOwn(body, 'name')) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) errors.push('name must be a non-empty string');
  }
  if (!partial || Object.hasOwn(body, 'email')) {
    if (typeof body.email !== 'string' || !EMAIL_PATTERN.test(body.email.trim())) errors.push('email must be a valid email address');
    else {
      const normalized = body.email.trim().toLowerCase();
      const duplicate = getUsers().some(user => user.id !== currentId && user.email.toLowerCase() === normalized);
      if (duplicate) errors.push('email is already registered');
    }
  }
  return errors;
}

function pagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 10 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) return null;
  return { page, limit };
}

router.get('/', (req, res) => {
  const paging = pagination(req.query);
  if (!paging) return res.status(400).json({ success: false, error: { code: 'INVALID_PAGINATION', message: 'page must be >= 1 and limit must be between 1 and 100' } });
  const { page, limit } = paging;
  const all = getUsers();
  const start = (page - 1) * limit;
  return res.status(200).json({ success: true, data: all.slice(start, start + limit), pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } });
});

router.get('/:id/tasks', (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'User id must be a valid UUID' } });
  const user = findUser(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  return res.status(200).json({ success: true, data: getTasks().filter(task => task.userId === user.id) });
});

router.get('/:id', (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'User id must be a valid UUID' } });
  const user = findUser(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  return res.status(200).json({ success: true, data: user });
});

router.post('/', (req, res) => {
  const errors = validateUserFields(req.body);
  if (errors.length) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'User data is invalid', details: errors } });
  const user = { id: createId(), name: req.body.name.trim(), email: req.body.email.trim().toLowerCase() };
  getUsers().push(user);
  return res.status(201).json({ success: true, data: user });
});

// PUT replaces the complete editable representation of a user.
router.put('/:id', (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'User id must be a valid UUID' } });
  const user = findUser(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  const errors = validateUserFields(req.body, { currentId: user.id });
  if (errors.length) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'PUT requires a valid name and email', details: errors } });
  user.name = req.body.name.trim();
  user.email = req.body.email.trim().toLowerCase();
  return res.status(200).json({ success: true, data: user });
});

// PATCH updates only the supplied fields.
router.patch('/:id', (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'User id must be a valid UUID' } });
  const user = findUser(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  const errors = validateUserFields(req.body, { partial: true, currentId: user.id });
  if (errors.length) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'User data is invalid', details: errors } });
  if (Object.hasOwn(req.body, 'name')) user.name = req.body.name.trim();
  if (Object.hasOwn(req.body, 'email')) user.email = req.body.email.trim().toLowerCase();
  return res.status(200).json({ success: true, data: user });
});

router.delete('/:id', (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'User id must be a valid UUID' } });
  const index = getUsers().findIndex(user => user.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  const hasTasks = getTasks().some(task => task.userId === req.params.id);
  if (hasTasks) return res.status(409).json({ success: false, error: { code: 'USER_HAS_TASKS', message: 'User cannot be deleted while tasks are assigned to them' } });
  const [deleted] = getUsers().splice(index, 1);
  return res.status(200).json({ success: true, data: deleted, message: 'User deleted' });
});

module.exports = router;
