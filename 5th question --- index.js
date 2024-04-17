// index.js
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(bodyParser.json());

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', 
  database: 'CRUD' 
});

connection.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

// Middleware to check role-based access
const checkPermission = (req, res, next) => {
  const { role, collegeId, section, studentId } = req.query;

  switch (role) {
    case 'superAdmin':
      next();
      break;
    case 'admin':
      if (collegeId) {
        next();
      } else {
        res.status(403).json({ error: 'Admin permission denied. Provide collegeId.' });
      }
      break;
    case 'teacher':
      if (section) {
        next();
      } else {
        res.status(403).json({ error: 'Teacher permission denied. Provide section.' });
      }
      break;
    case 'student':
      if (studentId === req.params.id) {
        next();
      } else {
        res.status(403).json({ error: 'Student permission denied. Access only your data.' });
      }
      break;
    default:
      res.status(403).json({ error: 'Invalid role.' });
  }
};


// READ data
app.get('/students/:id', checkPermission, (req, res) => {
  const { role, section } = req.query;
  const { id } = req.params;

  let query = 'SELECT * FROM students';

  switch (role) {
    case 'admin':
      query += ` WHERE collegeId = ${collegeId}`;
      break;
    case 'teacher':
      query += ` WHERE section = '${section}'`;
      break;
    case 'student':
      query += ` WHERE id = ${id}`;
      break;
    default:
      break;
  }

  connection.query(query, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});


// WRITE data
app.post('/students', checkPermission, (req, res) => {
  const { role } = req.body;

  if (role === 'superAdmin') {
    const student = req.body;
    connection.query('INSERT INTO students SET ?', student, (err, result) => {
      if (err) throw err;
      res.status(201).json({ message: 'Student created successfully.' });
    });
  } else {
    res.status(403).json({ error: 'Write permission denied. Only Super Admin can create students.' });
  }
});

// UPDATE data
app.put('/students/:id', checkPermission, (req, res) => {
  const { role } = req.body;
  const { id } = req.params;

  if (role === 'student' && id !== req.body.studentId) {
    res.status(403).json({ error: 'Update permission denied. Access only your data.' });
    return;
  }

  const student = req.body;
  connection.query('UPDATE students SET ? WHERE id = ?', [student, id], (err, result) => {
    if (err) throw err;
    res.json({ message: 'Student updated successfully.' });
  });
});

// DELETE data
app.delete('/students/:id', checkPermission, (req, res) => {
  const { role } = req.body;
  const { id } = req.params;

  if (role === 'superAdmin' || (role === 'student' && id === req.body.studentId)) {
    connection.query('DELETE FROM students WHERE id = ?', id, (err, result) => {
      if (err) throw err;
      res.json({ message: 'Student deleted successfully.' });
    });
  } else {
    res.status(403).json({ error: 'Delete permission denied.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}` );
});

