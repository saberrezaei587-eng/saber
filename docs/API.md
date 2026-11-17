# Saber - API Design

## Project Description
Saber is a task management project.

## Users API

| Method | Endpoint | Description | Status |
|---|---|---|---|
| GET | /api/users | Get all users | 200 |
| POST | /api/users | Create a user | 201 |
| GET | /api/users/:id | Get one user | 200, 404 |
| DELETE | /api/users/:id | Delete a user | 200, 404 |

## Tasks API

| Method | Endpoint | Description | Status |
|---|---|---|---|
| GET | /api/tasks | Get all tasks | 200 |
| POST | /api/tasks | Create a task | 201 |
| GET | /api/tasks/:id | Get one task | 200, 404 |
| PUT | /api/tasks/:id | Update a task | 200, 404 |
| DELETE | /api/tasks/:id | Delete a task | 200, 404 |
