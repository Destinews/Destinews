const express = require('express');
const mysql = require('mysql2');
const router = express.Router();

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'mypass',
  database: 'destiny_com',
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to MySQL database.');
});


module.exports = router;
