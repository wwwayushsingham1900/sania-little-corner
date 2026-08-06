require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const dbModule = require('./database');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'secret_token';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Endpoint to receive telemetry events
app.post('/api/events', async (req, res) => {
    const event = req.body;
    const userAgent = req.headers['user-agent'] || null;
    let ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    if (ipAddress && ipAddress.includes(',')) {
        ipAddress = ipAddress.split(',')[0].trim();
    }

    if (!event || !event.session_id || !event.event_name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    let location = 'Unknown';
    if (ipAddress && ipAddress !== '::1' && ipAddress !== '127.0.0.1') {
        try {
            const locRes = await fetch(`http://ip-api.com/json/${ipAddress}`);
            const locData = await locRes.json();
            if (locData.status === 'success') {
                location = `${locData.city}, ${locData.country}`;
            }
        } catch (e) {
            console.error('Location fetch failed', e);
        }
    }

    dbModule.insertEvent(event, userAgent, ipAddress, location, (err, id) => {
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

let telegramChatId = process.env.TELEGRAM_CHAT_ID || null;

app.post('/api/ping', async (req, res) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        return res.status(500).json({ error: 'Telegram bot token not configured' });
    }

    try {
        if (!telegramChatId) {
            const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
            const updatesData = await updatesRes.json();
            if (updatesData.ok && updatesData.result.length > 0) {
                const messageUpdate = updatesData.result.reverse().find(u => u.message && u.message.chat);
                if (messageUpdate) {
                    telegramChatId = messageUpdate.message.chat.id;
                    console.log("Found Telegram Chat ID:", telegramChatId);
                }
            }
        }

        if (!telegramChatId) {
            console.error("Could not determine Telegram Chat ID.");
            return res.status(500).json({ error: 'Could not determine Telegram Chat ID. Please send a message to the bot first.' });
        }

        const message = "🐻‍❄️🚨 Sania just sent a silent ping from the tracker app. She might need you right now.";
        const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: telegramChatId,
                text: message
            })
        });

        const sendData = await sendRes.json();
        if (sendData.ok) {
            res.json({ success: true });
        } else {
            console.error('Telegram send failed:', sendData);
            res.status(500).json({ error: 'Failed to send message' });
        }
    } catch (e) {
        console.error('Error sending silent ping:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Fallback for missing routes
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Send Voice Ping
app.post('/api/voice-ping', async (req, res) => {
    try {
        const { audioBase64 } = req.body;
        if (!audioBase64) return res.status(400).json({ error: 'No audio data provided' });

        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) return res.status(500).json({ error: 'Bot token not configured' });

        let telegramChatId = process.env.TELEGRAM_CHAT_ID;
        if (!telegramChatId) {
            const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
            const updatesData = await updatesRes.json();
            if (updatesData.ok && updatesData.result.length > 0) {
                const message = updatesData.result.find(u => u.message && u.message.chat);
                if (message) telegramChatId = message.message.chat.id;
            }
        }

        if (!telegramChatId) return res.status(500).json({ error: 'Could not determine Chat ID' });

        // Parse Base64
        const matches = audioBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: 'Invalid base64 string' });
        }

        const type = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        const form = new FormData();
        form.append('chat_id', telegramChatId);
        form.append('voice', buffer, { filename: 'voice-note.webm', contentType: type });
        form.append('caption', '🎙️ Sania sent you a voice note from the app!');

        const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendVoice`, {
            method: 'POST',
            headers: form.getHeaders(),
            body: form
        });

        const sendData = await sendRes.json();
        if (sendData.ok) {
            res.json({ success: true });
        } else {
            console.error('Telegram sendVoice failed:', sendData);
            res.status(500).json({ error: 'Failed to send voice message' });
        }
    } catch (e) {
        console.error('Error sending voice ping:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
