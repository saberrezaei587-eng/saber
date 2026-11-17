const express = require('express');
const { getUsers, getTasks, createId } = require('../data/store');
const router = express.Router();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validId(id) { return UUID_PATTERN.test(id); }
function findTask(id) { return getTasks().find(task => task.id === id); }
function pagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 10 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) return null;
  return { page, limit };
}
function validateTaskFields(body, { partial = false } = {}) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return ['Request body must be a JSON object'];
  const allowedFields = ['title', 'description', 'userId', 'completed'];
  for (const field of Object.keys(body)) {
    if (!allowedFields.includes(field)) errors.push(`unknown field: ${field}`);
  }
  if (partial && Object.keys(body).length === 0) errors.push('PATCH body must contain at least one field');
  if (!partial || Object.hasOwn(body, 'title')) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) errors.push('title must be a non-empty string');
  }
  if (Object.hasOwn(body, 'description') && typeof body.description !== 'string') errors.push('description must be a string');
  if (!partial || Object.hasOwn(body, 'userId')) {
    if (typeof body.userId !== 'string' || !UUID_PATTERN.test(body.userId)) errors.push('userId must be a valid user UUID');
    else if (!getUsers().some(user => user.id === body.userId)) errors.push('userId does not identify an existing user');
  }
  if (Object.hasOwn(body, 'completed') && typeof body.completed !== 'boolean') errors.push('completed must be a boolean (true or false)');
  return errors;
}

router.get('/', (req, res) => {
  const paging = pagination(req.query);
  if (!paging) return res.status(400).json({ success: false, error: { code: 'INVALID_PAGINATION', message: 'page must be >= 1 and limit must be between 1 and 100' } });
  if (req.query.userId !== undefined && !validId(req.query.userId)) return res.status(400).json({ success: false, error: { code: 'INVALID_USER_ID', message: 'userId must be a valid UUID' } });
  if (req.query.userId !== undefined && !getUsers().some(user => user.id === req.query.userId)) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  const filtered = req.query.userId ? getTasks().filter(task => task.userId === req.query.userId) : getTasks();
  const { page, limit } = paging;
  const start = (page - 1) * limit;
  return res.status(200).json({ success: true, data: filtered.slice(start, start + limit), pagination: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) } });
});

router.get('/:id', (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Task id must be a valid UUID' } });
  const task = findTask(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } });
  return res.status(200).json({ success: true, data: task });
});

router.post('/', (req, res) => {
  const errors = validateTaskFields(req.body);
  if (errors.length) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Task data is invalid', details: errors } });
  const task = {
    id: createId(),
    title: req.body.title.trim(),
    description: req.body.description === undefined ? '' : req.body.description.trim(),
    userId: req.body.userId,
    completed: req.body.completed === undefined ? false : req.body.completed
  };
  getTasks().push(task);
  return res.status(201).json({ success: true, data: task });
});

// PUT replaces all editable task fields; description and completed have documented defaults.
router.put('/:id', (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Task id must be a valid UUID' } });
  const task = findTask(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } });
  const errors = validateTaskFields(req.body);
  if (errors.length) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'PUT requires a valid title and userId', details: errors } });
  task.title = req.body.title.trim();
  task.description = req.body.description === undefined ? '' : req.body.description.trim();
  task.userId = req.body.userId;
  task.completed = req.body.completed === undefined ? false : req.body.completed;
  return res.status(200).json({ success: true, data: task });
});

router.patch('/:id', (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Task id must be a valid UUID' } });
  const task = findTask(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } });
  const errors = validateTaskFields(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Task data is invalid', details: errors } });
  if (Object.hasOwn(req.body, 'title')) task.title = req.body.title.trim();
  if (Object.hasOwn(req.body, 'description')) task.description = req.body.description.trim();
  if (Object.hasOwn(req.body, 'userId')) task.userId = req.body.userId;
  if (Object.hasOwn(req.body, 'completed')) task.completed = req.body.completed;
  return res.status(200).json({ success: true, data: task });
});

router.delete('/:id', (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Task id must be a valid UUID' } });
  const index = getTasks().findIndex(task => task.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: { code: 'TASK_NOT_FOUND', message: 'Task not found' } });
  const [deleted] = getTasks().splice(index, 1);
  return res.status(200).json({ success: true, data: deleted, message: 'Task deleted' });
});

module.exports = router;
