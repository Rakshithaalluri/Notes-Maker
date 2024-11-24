// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database('notes.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        createTable();
    }
});

// Create notes table if it doesn't exist
function createTable() {
    const sql = `
    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT DEFAULT 'Others',
        completed BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    db.run(sql, (err) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('Notes table ready');
        }
    });
}

// Middleware for input validation
const validateNote = (req, res, next) => {
    const { title, description, category } = req.body;
    const validCategories = ['Work', 'Personal', 'Others'];

    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
    }

    if (category && !validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
    }

    next();
};

// API Routes

// Create a new note
app.post('/api/notes', validateNote, (req, res) => {
    const { title, description, category = 'Others' } = req.body;
    const sql = `INSERT INTO notes (title, description, category) VALUES (?, ?, ?)`;
    
    db.run(sql, [title, description, category], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: 'Note created successfully' });
    });
});

// Get all notes with optional filtering
app.get('/api/notes', (req, res) => {
    const { search, category } = req.query;
    let sql = 'SELECT * FROM notes';
    let params = [];

    if (search && category) {
        sql += ` WHERE (title LIKE ? OR description LIKE ?) AND category = ?`;
        params = [`%${search}%`, `%${search}%`, category];
    } else if (search) {
        sql += ` WHERE title LIKE ? OR description LIKE ?`;
        params = [`%${search}%`, `%${search}%`];
    } else if (category) {
        sql += ` WHERE category = ?`;
        params = [category];
    }

    sql += ' ORDER BY created_at DESC';

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Update a note
app.put('/api/notes/:id', validateNote, (req, res) => {
    const { title, description, category, completed } = req.body;
    const sql = `
        UPDATE notes 
        SET title = ?, description = ?, category = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.run(sql, [title, description, category, completed, req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Note not found' });
            return;
        }
        res.json({ message: 'Note updated successfully' });
    });
});

// Delete a note
app.delete('/api/notes/:id', (req, res) => {
    const sql = 'DELETE FROM notes WHERE id = ?';
    
    db.run(sql, req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Note not found' });
            return;
        }
        res.json({ message: 'Note deleted successfully' });
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
