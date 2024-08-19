const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const axios = require('axios');
const crypto = require('crypto'); // Added for generating email verification tokens
const bodyParser = require('body-parser');
const cors = require('cors'); // Added CORS middleware

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

// Create a MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'blacklove'
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Register Route
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    // Check email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return res.status(400).send('Invalid email format');
    }

    // Check if the email already exists
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            console.error('Error checking email:', err);
            return res.status(500).send('Server error');
        }
        if (results.length > 0) return res.status(400).send('Email already in use');

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate email verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Insert new user
        db.query(
            'INSERT INTO users (name, email, password, verified, verification_token) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, false, verificationToken],
            (err) => {
                if (err) {
                    console.error('Error inserting user:', err);
                    return res.status(500).send('Server error');
                }

                console.log(`New user registered: ${name} (${email})`);

                // Send verification email
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

                // Send Slack notification
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

    // Find user by verification token
    db.query('SELECT * FROM users WHERE verification_token = ?', [token], (err, results) => {
        if (err) {
            console.error('Error finding user by token:', err);
            return res.status(500).send('Server error');
        }

        if (results.length === 0) {
            return res.status(400).send('Invalid or expired verification token');
        }

        const user = results[0];

        // Verify the user's email
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

    // Find user
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).send('Server error');
        if (results.length === 0) return res.status(400).send('Invalid email or password');

        const user = results[0];

        // Check if email is verified
        if (!user.verified) {
            return res.status(403).send('Please verify your email before logging in.');
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).send('Invalid email or password');

        // Create JWT token
        const token = jwt.sign({ id: user.id }, 'secret', { expiresIn: '1h' });
        res.json({ token });
    });
});

app.listen(3000, () => console.log('Server running on port 3000'));
