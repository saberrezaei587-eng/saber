const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json());

// Home page
app.get("/", (req, res) => {
  res.send("Welcome to Saber!");
});

// Get all tasks
app.get("/api/tasks", (req, res) => {
  res.json([
    {
      id: 1,
      title: "Learn Node.js",
      completed: false
    }
  ]);
});

// Create a task
app.post("/api/tasks", (req, res) => {
  res.status(201).json({
    message: "Task created successfully",
    task: req.body
  });
});

// Start server
app.listen(PORT, () => {
  console.log(Saber is running on port ${PORT});
});
