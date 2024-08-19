const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Create a MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'blacklove'
});

db.connect(err => {
    if (err) throw err;
    console.log('MySQL Connected...');
});

// Routes
app.get('/users', (req, res) => {
    db.query('SELECT * FROM users', (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

app.post('/users', (req, res) => {
    const { name, email, password, location, profile_picture } = req.body;
    const query = 'INSERT INTO users (name, email, password, location, profile_picture) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [name, email, password, location, profile_picture], (err, results) => {
        if (err) throw err;
        res.json({ id: results.insertId });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});