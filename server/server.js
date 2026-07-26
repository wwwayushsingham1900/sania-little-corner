require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const dbModule = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'secret_token';

app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Endpoint to receive telemetry events
app.post('/api/events', (req, res) => {
    const event = req.body;
    const userAgent = req.headers['user-agent'] || null;
    let ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    if (ipAddress && ipAddress.includes(',')) {
        ipAddress = ipAddress.split(',')[0].trim();
    }

    if (!event || !event.session_id || !event.event_name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    dbModule.insertEvent(event, userAgent, ipAddress, (err, id) => {
        if (err) {
            console.error('Error inserting event:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.status(201).json({ success: true, id });
    });
});

// API Endpoint for admin dashboard to retrieve events
app.get('/api/admin/events', (req, res) => {
    const token = req.headers['x-admin-token'];
    
    if (token !== ADMIN_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    dbModule.getAllEvents((err, rows) => {
        if (err) {
            console.error('Error fetching events:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ events: rows });
    });
});

// Fallback for missing routes
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
