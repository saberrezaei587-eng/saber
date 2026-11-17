const app = require('./app');
const PORT = Number(process.env.PORT) || 3000;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Task Manager API listening on port ${PORT}`);
  });
}

module.exports = app;
