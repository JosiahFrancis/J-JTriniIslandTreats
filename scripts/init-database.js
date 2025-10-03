const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Create database file if it doesn't exist
const dbPath = './business_data.db';

console.log('Initializing database...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error creating database:', err.message);
        process.exit(1);
    } else {
        console.log('Database created successfully');
    }
});

// Initialize tables
db.serialize(() => {
    console.log('Creating tables...');

    // Sales table
    db.run(`CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        item TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        total REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating sales table:', err.message);
        } else {
            console.log('✓ Sales table created');
        }
    });

    // Expenses table
    db.run(`CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        store_vendor TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating expenses table:', err.message);
        } else {
            console.log('✓ Expenses table created');
        }
    });

    // Inventory table
    db.run(`CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        current_stock INTEGER NOT NULL,
        min_stock INTEGER NOT NULL,
        unit_cost REAL NOT NULL,
        total_value REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating inventory table:', err.message);
        } else {
            console.log('✓ Inventory table created');
        }
    });

    // Settings table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating settings table:', err.message);
        } else {
            console.log('✓ Settings table created');
        }
    });

    // Insert default bank balance
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('bankBalance', '0')`, (err) => {
        if (err) {
            console.error('Error inserting default bank balance:', err.message);
        } else {
            console.log('✓ Default settings initialized');
        }
    });
});

db.close((err) => {
    if (err) {
        console.error('Error closing database:', err.message);
        process.exit(1);
    } else {
        console.log('\n✅ Database initialization completed successfully!');
        console.log(`Database file: ${dbPath}`);
        console.log('\nNext steps:');
        console.log('1. Run: npm install');
        console.log('2. Run: npm start');
        console.log('3. Open http://localhost:3000 in your browser');
    }
});
