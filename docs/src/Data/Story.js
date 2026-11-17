const { randomUUID } = require('node:crypto');

const seedUserIds = {
  ali: '11111111-1111-4111-8111-111111111111',
  sara: '22222222-2222-4222-8222-222222222222'
};

const initialUsers = [
  { id: seedUserIds.ali, name: 'Ali', email: 'ali@example.com' },
  { id: seedUserIds.sara, name: 'Sara', email: 'sara@example.com' }
];

const initialTasks = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    title: 'Learn Docker',
    description: 'Build the API image',
    userId: seedUserIds.ali,
    completed: false
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    title: 'Study networking',
    description: 'Review TCP/IP',
    userId: seedUserIds.sara,
    completed: true
  }
];

let users = structuredClone(initialUsers);
let tasks = structuredClone(initialTasks);

function resetStore() {
  users = structuredClone(initialUsers);
  tasks = structuredClone(initialTasks);
}

function getUsers() { return users; }
function getTasks() { return tasks; }
function createId() { return randomUUID(); }

module.exports = { getUsers, getTasks, createId, resetStore };
