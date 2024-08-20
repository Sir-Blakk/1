require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const axios = require('axios');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create a MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'blacklove'
});

// Connect to the database and handle connection errors
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to the database');
});

// Create a transporter
let transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Register Route
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return res.status(400).send('Invalid email format');
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            console.error('Error checking email:', err);
            return res.status(500).send('Server error');
        }
        if (results.length > 0) return res.status(400).send('Email already in use');

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        db.query(
            'INSERT INTO users (name, email, password, verified, verification_token) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, false, verificationToken],
            (err) => {
                if (err) {
                    console.error('Error inserting user:', err);
                    return res.status(500).send('Server error');
                }

                console.log(`New user registered: ${name} (${email})`);

                const verificationUrl = `http://localhost:3000/verify-email?token=${verificationToken}`;
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'Email Verification',
                    text: `Please verify your email by clicking on the following link: ${verificationUrl}`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Error sending verification email:', error);
                    } else {
                        console.log('Verification email sent:', info.response);
                    }
                });

                const webhookUrl = process.env.SLACK_WEBHOOK_URL;

                axios.post(webhookUrl, {
                    text: `A new user has registered: ${name} (${email})`
                })
                .then(response => {
                    console.log('Notification sent to Slack');
                })
                .catch(error => {
                    console.error('Error sending Slack notification:', error);
                });

                res.status(201).send('User registered. Please check your email to verify your account.');
            }
        );
    });
});

// Email Verification Route
app.get('/verify-email', (req, res) => {
    const { token } = req.query;

    db.query('SELECT * FROM users WHERE verification_token = ?', [token], (err, results) => {
        if (err) {
            console.error('Error finding user by token:', err);
            return res.status(500).send('Server error');
        }

        if (results.length === 0) {
            return res.status(400).send('Invalid or expired verification token');
        }

        const user = results[0];

        db.query(
            'UPDATE users SET verified = ?, verification_token = NULL WHERE id = ?',
            [true, user.id],
            (err) => {
                if (err) {
                    console.error('Error updating user:', err);
                    return res.status(500).send('Server error');
                }

                res.send('Email verified successfully. You can now log in.');
            }
        );
    });
});

// Login Route
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).send('Server error');
        if (results.length === 0) return res.status(400).send('Invalid email or password');

        const user = results[0];

        if (!user.verified) {
            return res.status(403).send('Please verify your email before logging in.');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).send('Invalid email or password');

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    });
});

app.listen(3000, () => console.log('Server running on port 3000'));
