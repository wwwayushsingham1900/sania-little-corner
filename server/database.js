const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

async function initDb() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            session_id TEXT NOT NULL,
            event_name TEXT NOT NULL,
            event_data JSONB,
            client_timestamp BIGINT,
            server_timestamp BIGINT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    try {
        await pool.query(createTableQuery);
        await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS ip_address TEXT;`);
        await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS location TEXT;`);
        console.log('Events table ready.');
    } catch (err) {
        console.error('Error creating events table:', err.message);
    }
}

// Call initDb when database module is loaded
initDb();

function insertEvent(event, userAgent, ipAddress, location, callback) {

    const { session_id, event_name, data, timestamp } = event;
    const serverTimestamp = Date.now();
    const eventDataString = data ? JSON.stringify(data) : null;

    const query = `
        INSERT INTO events (session_id, event_name, event_data, client_timestamp, server_timestamp, user_agent, ip_address, location)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
    `;

    pool.query(query, [session_id, event_name, eventDataString, timestamp, serverTimestamp, userAgent, ipAddress, location], (err, res) => {
        if (callback) {
            callback(err, res && res.rows[0] ? res.rows[0].id : null);
        }
    });
}

function getAllEvents(callback) {
    const query = `SELECT * FROM events ORDER BY server_timestamp DESC`;
    pool.query(query, [], (err, res) => {
        if (callback) callback(err, res ? res.rows : null);
    });
}

module.exports = {
    pool,
    insertEvent,
    getAllEvents
};
