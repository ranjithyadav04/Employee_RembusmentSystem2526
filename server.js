const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// --- 1. MIDDLEWARE (IMPORTANT: Order is Critical) ---
// CORS must be first to allow the browser to connect
app.use(cors()); 

// These two lines parse the incoming data so req.body is NOT undefined
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// --- 2. DATABASE CONNECTION ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: 'root', 
    database: 'reimbursement_db'
});

db.connect(err => {
    if (err) {
        console.error('CRITICAL: MySQL Connection Failed >', err.message);
        return;
    }
    console.log('✅ Connected to MySQL Database: reimbursement_db');
});

// --- 3. API ROUTES ---

// LOGIN ROUTE
app.post('/api/login', (req, res) => {
    // Safety check: if req.body is missing, stop the crash here
    if (!req.body || !req.body.email) {
        console.error("❌ Error: Received empty request body from frontend.");
        return res.status(400).json({ 
            success: false, 
            message: "Server received no data. Check your Frontend Headers." 
        });
    }

    const { email, password, role } = req.body;
    console.log(`Log: Login attempt for ${email} as ${role}`);

    const query = "SELECT id, full_name, email, role FROM users WHERE email = ? AND password = ? AND role = ?";
    
    db.query(query, [email, password, role], (err, results) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        if (results.length > 0) {
            res.json({ success: true, user: results[0] });
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials or role" });
        }
    });
});

// SUBMIT REQUEST (Employee)
app.post('/api/requests', (req, res) => {
    const { user_id, title, amount, description } = req.body;
    
    if (!user_id || !title || !amount) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const query = "INSERT INTO requests (user_id, title, amount, description) VALUES (?, ?, ?, ?)";
    db.query(query, [user_id, title, amount, description], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: "Reimbursement request submitted!" });
    });
});

// GET EMPLOYEE SPECIFIC REQUESTS
app.get('/api/requests/employee/:id', (req, res) => {
    const query = "SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC";
    db.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// GET ALL PENDING (Admin View)
app.get('/api/requests/admin', (req, res) => {
    const query = `
        SELECT r.*, u.full_name 
        FROM requests r
        JOIN users u ON r.user_id = u.id 
        WHERE r.status = 'pending'
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// UPDATE STATUS (Approve/Reject)
app.put('/api/requests/:id', (req, res) => {
    const { status } = req.body; // 'approved' or 'rejected'
    const query = "UPDATE requests SET status = ? WHERE id = ?";
    
    db.query(query, [status, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: `Request updated to ${status}` });
    });
});

// --- 4. START SERVER ---
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});