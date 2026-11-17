const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const usersRouter = require('./src/routes/users');
const tasksRouter = require('./src/routes/tasks');
const { notFoundHandler, errorHandler } = require('./src/middleware/errors');

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests; try again later' } })
}));

app.get('/', (req, res) => res.status(200).json({ success: true, message: 'Task Manager API is running', api: '/api/users and /api/tasks' }));
app.get('/health', (req, res) => res.status(200).json({ success: true, status: 'healthy' }));
app.use('/api/users', usersRouter);
app.use('/api/tasks', tasksRouter);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
