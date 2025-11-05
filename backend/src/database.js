import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DATABASE_PATH || join(__dirname, '../data/playlist-studio.db');
const dbDir = dirname(dbPath);

// Ensure data directory exists
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

let db = null;

export function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      }
    });
  }
  return db;
}

export function initDatabase() {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      database.serialize(() => {
        // Users table
        database.run(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Projects table
        database.run(`
          CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            name TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);

        // Songs table (for individual song storage)
        database.run(`
          CREATE TABLE IF NOT EXISTS songs (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            artist TEXT,
            url TEXT,
            duration REAL,
            order_index INTEGER,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          )
        `);

        // Feedback table
        database.run(`
          CREATE TABLE IF NOT EXISTS feedback (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            song_id TEXT,
            title TEXT,
            text TEXT NOT NULL,
            timestamp REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
          )
        `);

        // Assets table
        database.run(`
          CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            user_id TEXT,
            type TEXT NOT NULL,
            url TEXT NOT NULL,
            filename TEXT,
            size INTEGER,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);

        // Create indexes for better performance
        database.run(`
          CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
        `);
        database.run(`
          CREATE INDEX IF NOT EXISTS idx_songs_project_id ON songs(project_id);
        `);
        database.run(`
          CREATE INDEX IF NOT EXISTS idx_feedback_project_id ON feedback(project_id);
        `);
        database.run(`
          CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
        `);
        database.run(`
          CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        `, (err) => {
          if (err) {
            console.error('❌ Database initialization failed:', err);
            reject(err);
          } else {
            console.log('✅ Database initialized successfully');
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      reject(error);
    }
  });
}

export function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

// Helper functions for promisified database operations
export const dbRun = (query, params) => {
  return new Promise((resolve, reject) => {
    getDatabase().run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const dbGet = (query, params) => {
  return new Promise((resolve, reject) => {
    getDatabase().get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (query, params) => {
  return new Promise((resolve, reject) => {
    getDatabase().all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

