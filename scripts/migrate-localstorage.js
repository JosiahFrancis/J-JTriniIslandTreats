const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// This script helps migrate existing localStorage data to the database
// You'll need to export your localStorage data first using the browser's developer tools

console.log('LocalStorage to Database Migration Tool');
console.log('=====================================\n');

const dbPath = './business_data.db';

// Check if database exists
if (!fs.existsSync(dbPath)) {
    console.error('❌ Database file not found. Please run "npm run init-db" first.');
    process.exit(1);
}

const db = new sqlite3.Database(dbPath);

function migrateFromJSON(jsonFilePath) {
    console.log(`Reading data from: ${jsonFilePath}`);
    
    if (!fs.existsSync(jsonFilePath)) {
        console.error(`❌ File not found: ${jsonFilePath}`);
        process.exit(1);
    }

    try {
        const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
        const data = jsonData.data || jsonData; // Handle both wrapped and raw formats

        console.log('Found data structure:');
        console.log(`- Sales: ${data.sales ? data.sales.length : 0} records`);
        console.log(`- Expenses: ${data.expenses ? data.expenses.length : 0} records`);
        console.log(`- Inventory: ${data.inventory ? data.inventory.length : 0} records`);
        console.log(`- Bank Balance: ${data.bankBalance || 0}\n`);

        db.serialize(() => {
            let completed = 0;
            const total = (data.sales ? data.sales.length : 0) + 
                         (data.expenses ? data.expenses.length : 0) + 
                         (data.inventory ? data.inventory.length : 0) + 
                         (data.bankBalance !== undefined ? 1 : 0);

            function checkCompletion() {
                completed++;
                if (completed >= total) {
                    console.log('\n✅ Migration completed successfully!');
                    db.close();
                }
            }

            // Migrate sales
            if (data.sales && data.sales.length > 0) {
                console.log('Migrating sales...');
                const stmt = db.prepare(`INSERT INTO sales (date, item, quantity, price, total) 
                                       VALUES (?, ?, ?, ?, ?)`);
                
                data.sales.forEach((sale, index) => {
                    stmt.run([sale.date, sale.item, sale.quantity, sale.price, sale.total], (err) => {
                        if (err) {
                            console.error(`Error migrating sale ${index + 1}:`, err.message);
                        } else {
                            console.log(`✓ Migrated sale: ${sale.item}`);
                        }
                        checkCompletion();
                    });
                });
                stmt.finalize();
            } else {
                checkCompletion();
            }

            // Migrate expenses
            if (data.expenses && data.expenses.length > 0) {
                console.log('Migrating expenses...');
                const stmt = db.prepare(`INSERT INTO expenses (date, category, store_vendor, description, amount) 
                                       VALUES (?, ?, ?, ?, ?)`);
                
                data.expenses.forEach((expense, index) => {
                    stmt.run([expense.date, expense.category, expense.storeVendor, expense.description, expense.amount], (err) => {
                        if (err) {
                            console.error(`Error migrating expense ${index + 1}:`, err.message);
                        } else {
                            console.log(`✓ Migrated expense: ${expense.description}`);
                        }
                        checkCompletion();
                    });
                });
                stmt.finalize();
            } else {
                checkCompletion();
            }

            // Migrate inventory
            if (data.inventory && data.inventory.length > 0) {
                console.log('Migrating inventory...');
                const stmt = db.prepare(`INSERT INTO inventory (name, category, current_stock, min_stock, unit_cost, total_value) 
                                       VALUES (?, ?, ?, ?, ?, ?)`);
                
                data.inventory.forEach((item, index) => {
                    stmt.run([item.name, item.category, item.currentStock, item.minStock, item.unitCost, item.totalValue], (err) => {
                        if (err) {
                            console.error(`Error migrating inventory item ${index + 1}:`, err.message);
                        } else {
                            console.log(`✓ Migrated inventory: ${item.name}`);
                        }
                        checkCompletion();
                    });
                });
                stmt.finalize();
            } else {
                checkCompletion();
            }

            // Migrate bank balance
            if (data.bankBalance !== undefined) {
                console.log('Migrating bank balance...');
                db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('bankBalance', ?)`, 
                       [data.bankBalance.toString()], (err) => {
                    if (err) {
                        console.error('Error migrating bank balance:', err.message);
                    } else {
                        console.log(`✓ Migrated bank balance: $${data.bankBalance}`);
                    }
                    checkCompletion();
                });
            } else {
                checkCompletion();
            }
        });

    } catch (error) {
        console.error('❌ Error reading JSON file:', error.message);
        db.close();
        process.exit(1);
    }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('Usage: node migrate-localstorage.js <path-to-exported-json-file>');
    console.log('\nExample:');
    console.log('  node migrate-localstorage.js ./backup-2024-01-15.json');
    console.log('\nTo export your current localStorage data:');
    console.log('1. Open your browser\'s Developer Tools (F12)');
    console.log('2. Go to the Console tab');
    console.log('3. Run this command:');
    console.log('   JSON.stringify({sales: JSON.parse(localStorage.getItem("snowIce_sales") || "[]"), expenses: JSON.parse(localStorage.getItem("snowIce_expenses") || "[]"), inventory: JSON.parse(localStorage.getItem("snowIce_inventory") || "[]"), bankBalance: parseFloat(localStorage.getItem("snowIce_bankBalance") || "0")})');
    console.log('4. Copy the output and save it to a JSON file');
    console.log('5. Run this migration script with the file path');
    process.exit(1);
}

const jsonFilePath = args[0];
migrateFromJSON(jsonFilePath);
