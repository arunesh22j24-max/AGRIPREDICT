-- User table for login system
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example: To add more user profile fields, add columns as needed.
-- You can use SQLite for local development, or MySQL/PostgreSQL for production.
