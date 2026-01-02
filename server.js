const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Database setup
const db = new sqlite3.Database('./business_data.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Sales table
        db.run(`CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            item TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            total REAL NOT NULL,
            inventory_item_id INTEGER,
            inventory_quantity INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inventory_item_id) REFERENCES inventory (id)
        )`);

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
        )`);

        // Inventory table
        db.run(`CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            current_stock INTEGER NOT NULL,
            min_stock INTEGER NOT NULL,
            unit_cost REAL NOT NULL,
            total_value REAL NOT NULL,
            stock_date TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Settings table for bank balance and other settings
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Stock adjustments table for tracking damaged stock and free giveaways
        db.run(`CREATE TABLE IF NOT EXISTS stock_adjustments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inventory_item_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            reason TEXT NOT NULL,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inventory_item_id) REFERENCES inventory (id)
        )`);

        // Add new columns to sales table if they don't exist (for existing databases)
        db.run(`ALTER TABLE sales ADD COLUMN inventory_item_id INTEGER`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE sales ADD COLUMN inventory_quantity INTEGER`, (err) => {
            // Ignore error if column already exists
        });
        
        // Add stock_date column to inventory table if it doesn't exist
        db.run(`ALTER TABLE inventory ADD COLUMN stock_date TEXT`, (err) => {
            // Ignore error if column already exists
        });
    });
}

// Helper function to update timestamp
function updateTimestamp(table, id) {
    db.run(`UPDATE ${table} SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
}

// API Routes

// Sales API
app.get('/api/sales', (req, res) => {
    const { page = 1, limit = 50, date, search } = req.query;
    let query = 'SELECT * FROM sales';
    let params = [];
    let conditions = [];

    if (date) {
        conditions.push('date = ?');
        params.push(date);
    }

    if (search) {
        conditions.push('item LIKE ?');
        params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY date DESC, id DESC';
    
    if (limit !== 'all') {
        const offset = (page - 1) * limit;
        query += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/sales', (req, res) => {
    const { date, item, quantity, price, total, inventoryItemId } = req.body;
    const calculatedTotal = quantity * price;
    const finalTotal = total || calculatedTotal;

    // Start a transaction
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Insert the sale
        db.run(
            'INSERT INTO sales (date, item, quantity, price, total, inventory_item_id, inventory_quantity) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [date, item, quantity, price, finalTotal, inventoryItemId || null, inventoryItemId ? quantity : null],
            function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: err.message });
                    return;
                }

                const saleId = this.lastID;

                // Get current bank balance first
                db.get('SELECT value FROM settings WHERE key = ?', ['bankBalance'], (err, balanceRow) => {
                    if (err) {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    const currentBalance = parseFloat(balanceRow?.value || 0);
                    const newBalance = currentBalance + finalTotal;

                    // If inventoryItemId is provided, update inventory stock
                    if (inventoryItemId) {
                        // First check if the inventory item exists and has enough stock
                        db.get('SELECT current_stock, unit_cost FROM inventory WHERE id = ?', [inventoryItemId], (err, row) => {
                            if (err) {
                                db.run('ROLLBACK');
                                res.status(500).json({ error: err.message });
                                return;
                            }
                            if (!row) {
                                db.run('ROLLBACK');
                                res.status(404).json({ error: 'Inventory item not found' });
                                return;
                            }

                            const currentStock = row.current_stock;
                            const unitCost = row.unit_cost;
                            const newStock = currentStock - quantity;

                            if (newStock < 0) {
                                db.run('ROLLBACK');
                                res.status(400).json({ 
                                    error: `Insufficient stock for ${item}. Available: ${currentStock}, Requested: ${quantity}` 
                                });
                                return;
                            }

                            // Calculate total_value explicitly: newStock * unit_cost
                            const newTotalValue = newStock * unitCost;

                            // Update inventory stock
                            db.run(
                                'UPDATE inventory SET current_stock = ?, total_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                                [newStock, newTotalValue, inventoryItemId],
                                function(err) {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        res.status(500).json({ error: err.message });
                                        return;
                                    }

                                    // Update bank balance
                                    db.run(
                                        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                                        ['bankBalance', newBalance.toString()],
                                        (err) => {
                                            if (err) {
                                                db.run('ROLLBACK');
                                                res.status(500).json({ error: err.message });
                                                return;
                                            }

                                            // Commit the transaction
                                            db.run('COMMIT', (err) => {
                                                if (err) {
                                                    res.status(500).json({ error: err.message });
                                                    return;
                                                }
                                                res.json({ 
                                                    id: saleId, 
                                                    message: 'Sale added successfully and inventory updated',
                                                    inventoryUpdated: true,
                                                    newStock: newStock,
                                                    bankBalanceUpdated: true,
                                                    newBalance: newBalance
                                                });
                                            });
                                        }
                                    );
                                }
                            );
                        });
                    } else {
                        // No inventory update needed, just update bank balance
                        db.run(
                            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                            ['bankBalance', newBalance.toString()],
                            (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    res.status(500).json({ error: err.message });
                                    return;
                                }

                                // Commit the transaction
                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        res.status(500).json({ error: err.message });
                                        return;
                                    }
                                    res.json({ 
                                        id: saleId, 
                                        message: 'Sale added successfully',
                                        inventoryUpdated: false,
                                        bankBalanceUpdated: true,
                                        newBalance: newBalance
                                    });
                                });
                            }
                        );
                    }
                });
            }
        );
    });
});

app.delete('/api/sales/:id', (req, res) => {
    const id = req.params.id;
    
    // Start a transaction to handle both sale deletion and inventory restoration
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First, get the sale details to check if it affected inventory and get the sale amount
        db.get('SELECT inventory_item_id, inventory_quantity, total FROM sales WHERE id = ?', [id], (err, sale) => {
            if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
            }
            
            if (!sale) {
                db.run('ROLLBACK');
                res.status(404).json({ error: 'Sale not found' });
                return;
            }

            // Get current bank balance to restore the sale amount
            db.get('SELECT value FROM settings WHERE key = ?', ['bankBalance'], (err, balanceRow) => {
                if (err) {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: err.message });
                    return;
                }

                const currentBalance = parseFloat(balanceRow?.value || 0);
                const newBalance = currentBalance - sale.total; // Subtract the sale amount from balance

                // If this sale affected inventory, restore the stock
                if (sale.inventory_item_id && sale.inventory_quantity) {
                    // Get current stock and unit_cost to calculate new total_value
                    db.get('SELECT current_stock, unit_cost FROM inventory WHERE id = ?', [sale.inventory_item_id], (err, invRow) => {
                        if (err) {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        if (!invRow) {
                            db.run('ROLLBACK');
                            res.status(404).json({ error: 'Inventory item not found' });
                            return;
                        }

                        const restoredStock = invRow.current_stock + sale.inventory_quantity;
                        const newTotalValue = restoredStock * invRow.unit_cost;

                        db.run(
                            'UPDATE inventory SET current_stock = ?, total_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                            [restoredStock, newTotalValue, sale.inventory_item_id],
                            function(err) {
                                if (err) {
                                    db.run('ROLLBACK');
                                    res.status(500).json({ error: err.message });
                                    return;
                                }

                                // Update bank balance
                            db.run(
                                'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                                ['bankBalance', newBalance.toString()],
                                (err) => {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        res.status(500).json({ error: err.message });
                                        return;
                                    }

                                    // Now delete the sale
                                    db.run('DELETE FROM sales WHERE id = ?', [id], function(err) {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            res.status(500).json({ error: err.message });
                                            return;
                                        }

                                        // Commit the transaction
                                        db.run('COMMIT', (err) => {
                                            if (err) {
                                                res.status(500).json({ error: err.message });
                                                return;
                                            }
                                            res.json({ 
                                                message: 'Sale deleted successfully, inventory restored, and bank balance updated',
                                                inventoryRestored: true,
                                                restoredQuantity: sale.inventory_quantity,
                                                inventoryItemId: sale.inventory_item_id,
                                                bankBalanceUpdated: true,
                                                newBalance: newBalance
                                            });
                                        });
                                    });
                                }
                            );
                        });
                    });
                } else {
                    // No inventory to restore, just update bank balance and delete the sale
                    db.run(
                        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                        ['bankBalance', newBalance.toString()],
                        (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                res.status(500).json({ error: err.message });
                                return;
                            }

                            // Delete the sale
                            db.run('DELETE FROM sales WHERE id = ?', [id], function(err) {
                                if (err) {
                                    db.run('ROLLBACK');
                                    res.status(500).json({ error: err.message });
                                    return;
                                }

                                // Commit the transaction
                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        res.status(500).json({ error: err.message });
                                        return;
                                    }
                                    res.json({ 
                                        message: 'Sale deleted successfully and bank balance updated',
                                        inventoryRestored: false,
                                        bankBalanceUpdated: true,
                                        newBalance: newBalance
                                    });
                                });
                            });
                        }
                    );
                }
            });
        });
    });
});

// Expenses API
app.get('/api/expenses', (req, res) => {
    const { category, date, search } = req.query;
    let query = 'SELECT * FROM expenses';
    let params = [];
    let conditions = [];

    if (category) {
        conditions.push('category = ?');
        params.push(category);
    }

    if (date) {
        conditions.push('date = ?');
        params.push(date);
    }

    if (search) {
        conditions.push('(description LIKE ? OR category LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY date DESC, id DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/expenses', (req, res) => {
    const { date, category, storeVendor, description, amount } = req.body;
    
    // Start a transaction to handle both expense creation and bank balance update
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Insert the expense
        db.run(
            'INSERT INTO expenses (date, category, store_vendor, description, amount) VALUES (?, ?, ?, ?, ?)',
            [date, category, storeVendor, description, amount],
            function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: err.message });
                    return;
                }

                const expenseId = this.lastID;

                // Get current bank balance and update it
                db.get('SELECT value FROM settings WHERE key = ?', ['bankBalance'], (err, balanceRow) => {
                    if (err) {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    const currentBalance = parseFloat(balanceRow?.value || 0);
                    const newBalance = currentBalance - amount;

                    // Update bank balance
                    db.run(
                        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                        ['bankBalance', newBalance.toString()],
                        (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                res.status(500).json({ error: err.message });
                                return;
                            }

                            // Commit the transaction
                            db.run('COMMIT', (err) => {
                                if (err) {
                                    res.status(500).json({ error: err.message });
                                    return;
                                }
                                res.json({ 
                                    id: expenseId, 
                                    message: 'Expense added successfully',
                                    bankBalanceUpdated: true,
                                    newBalance: newBalance
                                });
                            });
                        }
                    );
                });
            }
        );
    });
});

app.delete('/api/expenses/:id', (req, res) => {
    const id = req.params.id;
    
    // Start a transaction to handle both expense deletion and bank balance restoration
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First, get the expense details to restore the amount to bank balance
        db.get('SELECT amount FROM expenses WHERE id = ?', [id], (err, expense) => {
            if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
            }
            
            if (!expense) {
                db.run('ROLLBACK');
                res.status(404).json({ error: 'Expense not found' });
                return;
            }

            // Get current bank balance and restore the expense amount
            db.get('SELECT value FROM settings WHERE key = ?', ['bankBalance'], (err, balanceRow) => {
                if (err) {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: err.message });
                    return;
                }

                const currentBalance = parseFloat(balanceRow?.value || 0);
                const newBalance = currentBalance + expense.amount; // Add the expense amount back to balance

                // Update bank balance
                db.run(
                    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                    ['bankBalance', newBalance.toString()],
                    (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: err.message });
                            return;
                        }

                        // Now delete the expense
                        db.run('DELETE FROM expenses WHERE id = ?', [id], function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                res.status(500).json({ error: err.message });
                                return;
                            }

                            // Commit the transaction
                            db.run('COMMIT', (err) => {
                                if (err) {
                                    res.status(500).json({ error: err.message });
                                    return;
                                }
                                res.json({ 
                                    message: 'Expense deleted successfully and bank balance restored',
                                    bankBalanceUpdated: true,
                                    newBalance: newBalance,
                                    restoredAmount: expense.amount
                                });
                            });
                        });
                    }
                );
            });
        });
    });
});

// Inventory API
app.get('/api/inventory', (req, res) => {
    const { category, search } = req.query;
    let query = 'SELECT * FROM inventory';
    let params = [];
    let conditions = [];

    if (category) {
        conditions.push('category = ?');
        params.push(category);
    }

    if (search) {
        conditions.push('(name LIKE ? OR category LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY name ASC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Always calculate total_value correctly: current_stock * unit_cost
        // This ensures correct values even if database has incorrect entries
        const correctedRows = rows.map(row => {
            const correctTotalValue = row.current_stock * row.unit_cost;
            
            // If the value in database is incorrect, update it
            if (Math.abs(row.total_value - correctTotalValue) > 0.01) {
                // Update the database asynchronously (don't wait for it)
                db.run(
                    'UPDATE inventory SET total_value = ? WHERE id = ?',
                    [correctTotalValue, row.id],
                    (updateErr) => {
                        if (updateErr) {
                            console.error(`Failed to auto-repair inventory item ${row.id}:`, updateErr);
                        }
                    }
                );
            }
            
            return {
                ...row,
                total_value: correctTotalValue
            };
        });
        
        res.json(correctedRows);
    });
});

app.post('/api/inventory', (req, res) => {
    const { name, category, currentStock, minStock, unitCost, stockDate } = req.body;
    // Always calculate total_value from current_stock * unit_cost, ignore any provided totalValue
    const totalValue = currentStock * unitCost;
    const finalStockDate = stockDate || new Date().toISOString().split('T')[0]; // Default to today if not provided

    db.run(
        'INSERT INTO inventory (name, category, current_stock, min_stock, unit_cost, total_value, stock_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, category, currentStock, minStock, unitCost, totalValue, finalStockDate],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Inventory item added successfully' });
        }
    );
});

app.delete('/api/inventory/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM inventory WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Inventory item not found' });
            return;
        }
        res.json({ message: 'Inventory item deleted successfully' });
    });
});

// Update inventory item
app.put('/api/inventory/:id', (req, res) => {
    const id = req.params.id;
    const { name, category, currentStock, minStock, unitCost, stockDate } = req.body;
    
    if (!name || !category || currentStock === undefined || minStock === undefined || !unitCost) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    const totalValue = currentStock * unitCost;

    db.run(
        'UPDATE inventory SET name = ?, category = ?, current_stock = ?, min_stock = ?, unit_cost = ?, total_value = ?, stock_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, category, currentStock, minStock, unitCost, totalValue, stockDate, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Inventory item not found' });
                return;
            }
            res.json({ 
                message: 'Inventory item updated successfully',
                updatedItem: {
                    id: id,
                    name: name,
                    category: category,
                    currentStock: currentStock,
                    minStock: minStock,
                    unitCost: unitCost,
                    totalValue: totalValue,
                    stockDate: stockDate
                }
            });
        }
    );
});

// Update inventory stock
app.put('/api/inventory/:id/stock', (req, res) => {
    const id = req.params.id;
    const { quantity, operation = 'subtract' } = req.body; // operation can be 'subtract' or 'add'
    
    if (!quantity || quantity <= 0) {
        res.status(400).json({ error: 'Invalid quantity' });
        return;
    }

    // First get current stock and unit_cost
    db.get('SELECT current_stock, unit_cost FROM inventory WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Inventory item not found' });
            return;
        }

        const currentStock = row.current_stock;
        const unitCost = row.unit_cost;
        let newStock;
        
        if (operation === 'subtract') {
            newStock = currentStock - quantity;
            if (newStock < 0) {
                res.status(400).json({ error: 'Insufficient stock. Available: ' + currentStock });
                return;
            }
        } else if (operation === 'add') {
            newStock = currentStock + quantity;
        } else {
            res.status(400).json({ error: 'Invalid operation. Use "add" or "subtract"' });
            return;
        }

        // Calculate total_value explicitly
        const newTotalValue = newStock * unitCost;

        // Update the stock
        db.run(
            'UPDATE inventory SET current_stock = ?, total_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStock, newTotalValue, id],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ 
                    message: 'Stock updated successfully',
                    newStock: newStock,
                    operation: operation,
                    quantity: quantity
                });
            }
        );
    });
});

// Stock adjustments API (for damaged stock and free giveaways)
app.post('/api/inventory/adjustments', (req, res) => {
    const { inventoryItemId, date, quantity, reason, notes } = req.body;
    
    if (!inventoryItemId || !date || !quantity || !reason) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    if (quantity <= 0) {
        res.status(400).json({ error: 'Quantity must be greater than 0' });
        return;
    }

    if (!['damaged', 'free_giveaway'].includes(reason)) {
        res.status(400).json({ error: 'Reason must be "damaged" or "free_giveaway"' });
        return;
    }

    // Start a transaction
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First check if the inventory item exists and has enough stock
        db.get('SELECT current_stock, unit_cost FROM inventory WHERE id = ?', [inventoryItemId], (err, row) => {
            if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
            }

            if (!row) {
                db.run('ROLLBACK');
                res.status(404).json({ error: 'Inventory item not found' });
                return;
            }

            const currentStock = row.current_stock;
            const unitCost = row.unit_cost;
            const newStock = currentStock - quantity;

            if (newStock < 0) {
                db.run('ROLLBACK');
                res.status(400).json({ error: `Insufficient stock. Available: ${currentStock}` });
                return;
            }

            // Calculate total_value explicitly
            const newTotalValue = newStock * unitCost;

            // Record the adjustment
            db.run(
                'INSERT INTO stock_adjustments (inventory_item_id, date, quantity, reason, notes) VALUES (?, ?, ?, ?, ?)',
                [inventoryItemId, date, quantity, reason, notes || null],
                function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    // Update inventory stock
                    db.run(
                        'UPDATE inventory SET current_stock = ?, total_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [newStock, newTotalValue, inventoryItemId],
                        function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                res.status(500).json({ error: err.message });
                                return;
                            }

                            db.run('COMMIT');
                            res.json({
                                message: 'Stock adjustment recorded successfully',
                                adjustmentId: this.lastID,
                                newStock: newStock,
                                reason: reason
                            });
                        }
                    );
                }
            );
        });
    });
});

// Get stock adjustments
app.get('/api/inventory/adjustments', (req, res) => {
    const { inventoryItemId } = req.query;
    
    let query = `
        SELECT sa.*, i.name as item_name 
        FROM stock_adjustments sa
        JOIN inventory i ON sa.inventory_item_id = i.id
    `;
    const params = [];
    
    if (inventoryItemId) {
        query += ' WHERE sa.inventory_item_id = ?';
        params.push(inventoryItemId);
    }
    
    query += ' ORDER BY sa.date DESC, sa.created_at DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Repair inventory total_value calculations (fixes any incorrect total_value entries)
app.post('/api/inventory/repair', (req, res) => {
    db.serialize(() => {
        // Get all inventory items
        db.all('SELECT id, current_stock, unit_cost, total_value FROM inventory', [], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            if (rows.length === 0) {
                res.json({
                    message: 'No inventory items to repair',
                    fixedCount: 0
                });
                return;
            }

            let fixedCount = 0;
            let errors = [];
            let processed = 0;
            const totalItems = rows.length;

            const checkComplete = () => {
                processed++;
                if (processed === totalItems) {
                    res.json({
                        message: `Repaired ${fixedCount} inventory item(s)`,
                        fixedCount: fixedCount,
                        totalItems: totalItems,
                        errors: errors.length > 0 ? errors : undefined
                    });
                }
            };

            // Update each item's total_value to be current_stock * unit_cost
            rows.forEach((row) => {
                const correctTotalValue = row.current_stock * row.unit_cost;
                
                // Only update if the value is incorrect (allowing for small floating point differences)
                if (Math.abs(row.total_value - correctTotalValue) > 0.01) {
                    db.run(
                        'UPDATE inventory SET total_value = ? WHERE id = ?',
                        [correctTotalValue, row.id],
                        function(updateErr) {
                            if (updateErr) {
                                errors.push(`Failed to update item ${row.id}: ${updateErr.message}`);
                            } else {
                                fixedCount++;
                            }
                            checkComplete();
                        }
                    );
                } else {
                    // Value is already correct, just mark as processed
                    checkComplete();
                }
            });
        });
    });
});

// Reports API
app.get('/api/reports/sales', (req, res) => {
    const { period, year, month } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (period === 'yearly' && year) {
        dateFilter = "WHERE strftime('%Y', date) = ?";
        params.push(year);
    } else if (period === 'monthly' && year && month) {
        dateFilter = "WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?";
        params.push(year, String(month).padStart(2, '0'));
    } else if (period === 'weekly') {
        // Get current week
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        dateFilter = "WHERE date >= ? AND date <= ?";
        params.push(startOfWeek.toISOString().split('T')[0], endOfWeek.toISOString().split('T')[0]);
    } else if (period === 'daily' && year && month) {
        dateFilter = "WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?";
        params.push(year, String(month).padStart(2, '0'));
    }
    
    let groupBy = '';
    if (period === 'daily') {
        groupBy = "GROUP BY date ORDER BY date";
    } else if (period === 'weekly') {
        groupBy = "GROUP BY date ORDER BY date";
    } else if (period === 'monthly') {
        groupBy = "GROUP BY strftime('%m', date) ORDER BY strftime('%m', date)";
    } else if (period === 'yearly') {
        groupBy = "GROUP BY strftime('%Y', date) ORDER BY strftime('%Y', date)";
    }
    
    const query = `
        SELECT 
            ${period === 'daily' ? 'date as period' : period === 'weekly' ? 'date as period' : period === 'monthly' ? "strftime('%m', date) as period" : "strftime('%Y', date) as period"},
            COUNT(*) as transaction_count,
            SUM(quantity) as total_quantity,
            SUM(total) as total_sales,
            AVG(total) as avg_sale
        FROM sales
        ${dateFilter}
        ${groupBy}
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/reports/best-selling', (req, res) => {
    const { limit = 10, year, month } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (year && month) {
        dateFilter = "WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?";
        params.push(year, String(month).padStart(2, '0'));
    } else if (year) {
        dateFilter = "WHERE strftime('%Y', date) = ?";
        params.push(year);
    }
    
    const query = `
        SELECT 
            item,
            SUM(quantity) as total_quantity,
            SUM(total) as total_revenue,
            COUNT(*) as transaction_count,
            AVG(price) as avg_price
        FROM sales
        ${dateFilter}
        GROUP BY item
        ORDER BY total_quantity DESC
        LIMIT ?
    `;
    
    params.push(parseInt(limit));
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/reports/expenses', (req, res) => {
    const { period, year, month } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (period === 'yearly' && year) {
        dateFilter = "WHERE strftime('%Y', date) = ?";
        params.push(year);
    } else if (period === 'monthly' && year && month) {
        dateFilter = "WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?";
        params.push(year, String(month).padStart(2, '0'));
    } else if (period === 'weekly') {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        dateFilter = "WHERE date >= ? AND date <= ?";
        params.push(startOfWeek.toISOString().split('T')[0], endOfWeek.toISOString().split('T')[0]);
    } else if (period === 'daily' && year && month) {
        dateFilter = "WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?";
        params.push(year, String(month).padStart(2, '0'));
    }
    
    let groupBy = '';
    if (period === 'daily') {
        groupBy = "GROUP BY date, category ORDER BY date, category";
    } else if (period === 'weekly') {
        groupBy = "GROUP BY date, category ORDER BY date, category";
    } else if (period === 'monthly') {
        groupBy = "GROUP BY strftime('%m', date), category ORDER BY strftime('%m', date), category";
    } else if (period === 'yearly') {
        groupBy = "GROUP BY strftime('%Y', date), category ORDER BY strftime('%Y', date), category";
    }
    
    const query = `
        SELECT 
            ${period === 'daily' ? 'date as period' : period === 'weekly' ? 'date as period' : period === 'monthly' ? "strftime('%m', date) as period" : "strftime('%Y', date) as period"},
            category,
            SUM(amount) as total_amount,
            COUNT(*) as transaction_count
        FROM expenses
        ${dateFilter}
        ${groupBy}
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/reports/profit-margin', (req, res) => {
    const { year, month } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (year && month) {
        dateFilter = "WHERE strftime('%Y', s.date) = ? AND strftime('%m', s.date) = ?";
        params.push(year, String(month).padStart(2, '0'));
    } else if (year) {
        dateFilter = "WHERE strftime('%Y', s.date) = ?";
        params.push(year);
    }
    
    // Get sales with inventory costs if linked
    const query = `
        SELECT 
            s.item,
            SUM(s.quantity) as total_quantity,
            SUM(s.total) as total_revenue,
            AVG(s.price) as avg_selling_price,
            CASE 
                WHEN s.inventory_item_id IS NOT NULL THEN
                    SUM(s.inventory_quantity * i.unit_cost)
                ELSE 0
            END as total_cost,
            COUNT(*) as transaction_count
        FROM sales s
        LEFT JOIN inventory i ON s.inventory_item_id = i.id
        ${dateFilter}
        GROUP BY s.item
        ORDER BY total_revenue DESC
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Calculate profit margins
        const results = rows.map(row => {
            const revenue = row.total_revenue || 0;
            const cost = row.total_cost || 0;
            const profit = revenue - cost;
            const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
            
            return {
                ...row,
                total_cost: cost,
                profit: profit,
                margin: margin
            };
        });
        
        res.json(results);
    });
});

app.get('/api/reports/year-over-year', (req, res) => {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();
    const previousYear = currentYear - 1;
    
    // Get sales for both years
    const salesQuery = `
        SELECT 
            strftime('%Y', date) as year,
            strftime('%m', date) as month,
            SUM(total) as total_sales,
            COUNT(*) as transaction_count
        FROM sales
        WHERE strftime('%Y', date) IN (?, ?)
        GROUP BY year, month
        ORDER BY year, month
    `;
    
    // Get expenses for both years
    const expensesQuery = `
        SELECT 
            strftime('%Y', date) as year,
            strftime('%m', date) as month,
            SUM(amount) as total_expenses,
            COUNT(*) as transaction_count
        FROM expenses
        WHERE strftime('%Y', date) IN (?, ?)
        GROUP BY year, month
        ORDER BY year, month
    `;
    
    db.all(salesQuery, [currentYear.toString(), previousYear.toString()], (err, salesRows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        db.all(expensesQuery, [currentYear.toString(), previousYear.toString()], (err, expensesRows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Calculate totals
            const currentYearSales = salesRows
                .filter(r => r.year === currentYear.toString())
                .reduce((sum, r) => sum + (r.total_sales || 0), 0);
            const previousYearSales = salesRows
                .filter(r => r.year === previousYear.toString())
                .reduce((sum, r) => sum + (r.total_sales || 0), 0);
            
            const currentYearExpenses = expensesRows
                .filter(r => r.year === currentYear.toString())
                .reduce((sum, r) => sum + (r.total_expenses || 0), 0);
            const previousYearExpenses = expensesRows
                .filter(r => r.year === previousYear.toString())
                .reduce((sum, r) => sum + (r.total_expenses || 0), 0);
            
            const currentYearProfit = currentYearSales - currentYearExpenses;
            const previousYearProfit = previousYearSales - previousYearExpenses;
            
            res.json({
                currentYear: currentYear,
                previousYear: previousYear,
                sales: {
                    current: currentYearSales,
                    previous: previousYearSales,
                    change: currentYearSales - previousYearSales,
                    changePercent: previousYearSales > 0 ? ((currentYearSales - previousYearSales) / previousYearSales) * 100 : 0,
                    monthly: salesRows
                },
                expenses: {
                    current: currentYearExpenses,
                    previous: previousYearExpenses,
                    change: currentYearExpenses - previousYearExpenses,
                    changePercent: previousYearExpenses > 0 ? ((currentYearExpenses - previousYearExpenses) / previousYearExpenses) * 100 : 0,
                    monthly: expensesRows
                },
                profit: {
                    current: currentYearProfit,
                    previous: previousYearProfit,
                    change: currentYearProfit - previousYearProfit,
                    changePercent: previousYearProfit !== 0 ? ((currentYearProfit - previousYearProfit) / Math.abs(previousYearProfit)) * 100 : 0
                }
            });
        });
    });
});

// Settings API (for bank balance and other settings)
app.get('/api/settings/:key', (req, res) => {
    const key = req.params.key;
    db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.json({ value: null });
            return;
        }
        res.json({ value: row.value });
    });
});

app.post('/api/settings/:key', (req, res) => {
    const key = req.params.key;
    const value = req.body.value;
    
    db.run(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [key, value],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Setting updated successfully' });
        }
    );
});

// Dashboard API - get monthly totals
app.get('/api/dashboard/:year/:month', (req, res) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;

    // Get sales total for the month
    db.get(
        'SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE date LIKE ?',
        [`${monthStr}%`],
        (err, salesRow) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            // Get expenses total for the month
            db.get(
                'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date LIKE ?',
                [`${monthStr}%`],
                (err, expensesRow) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    // Get bank balance
                    db.get(
                        'SELECT value FROM settings WHERE key = ?',
                        ['bankBalance'],
                        (err, balanceRow) => {
                            if (err) {
                                res.status(500).json({ error: err.message });
                                return;
                            }

                            const salesTotal = salesRow.total;
                            const expensesTotal = expensesRow.total;
                            const netProfit = salesTotal - expensesTotal;
                            const bankBalance = balanceRow ? parseFloat(balanceRow.value) : 0;

                            res.json({
                                sales: salesTotal,
                                expenses: expensesTotal,
                                netProfit: netProfit,
                                bankBalance: bankBalance
                            });
                        }
                    );
                }
            );
        }
    );
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Business Manager API server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
        process.exit(0);
    });
});
