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

                // If inventoryItemId is provided, update inventory stock
                if (inventoryItemId) {
                    // First check if the inventory item exists and has enough stock
                    db.get('SELECT current_stock FROM inventory WHERE id = ?', [inventoryItemId], (err, row) => {
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
                        const newStock = currentStock - quantity;

                        if (newStock < 0) {
                            db.run('ROLLBACK');
                            res.status(400).json({ 
                                error: `Insufficient stock for ${item}. Available: ${currentStock}, Requested: ${quantity}` 
                            });
                            return;
                        }

                        // Update inventory stock
                        db.run(
                            'UPDATE inventory SET current_stock = ?, total_value = current_stock * unit_cost, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                            [newStock, inventoryItemId],
                            function(err) {
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
                                        newStock: newStock
                                    });
                                });
                            }
                        );
                    });
                } else {
                    // No inventory update needed, just commit
                    db.run('COMMIT', (err) => {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        res.json({ 
                            id: saleId, 
                            message: 'Sale added successfully',
                            inventoryUpdated: false
                        });
                    });
                }
            }
        );
    });
});

app.delete('/api/sales/:id', (req, res) => {
    const id = req.params.id;
    
    // Start a transaction to handle both sale deletion and inventory restoration
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First, get the sale details to check if it affected inventory
        db.get('SELECT inventory_item_id, inventory_quantity FROM sales WHERE id = ?', [id], (err, sale) => {
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

            // If this sale affected inventory, restore the stock
            if (sale.inventory_item_id && sale.inventory_quantity) {
                db.run(
                    'UPDATE inventory SET current_stock = current_stock + ?, total_value = current_stock * unit_cost, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [sale.inventory_quantity, sale.inventory_item_id],
                    function(err) {
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
                                    message: 'Sale deleted successfully and inventory restored',
                                    inventoryRestored: true,
                                    restoredQuantity: sale.inventory_quantity,
                                    inventoryItemId: sale.inventory_item_id
                                });
                            });
                        });
                    }
                );
            } else {
                // No inventory to restore, just delete the sale
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
                            message: 'Sale deleted successfully',
                            inventoryRestored: false
                        });
                    });
                });
            }
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
    
    db.run(
        'INSERT INTO expenses (date, category, store_vendor, description, amount) VALUES (?, ?, ?, ?, ?)',
        [date, category, storeVendor, description, amount],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Expense added successfully' });
        }
    );
});

app.delete('/api/expenses/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM expenses WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Expense not found' });
            return;
        }
        res.json({ message: 'Expense deleted successfully' });
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
        res.json(rows);
    });
});

app.post('/api/inventory', (req, res) => {
    const { name, category, currentStock, minStock, unitCost, totalValue, stockDate } = req.body;
    const calculatedTotal = currentStock * unitCost;
    const finalTotal = totalValue || calculatedTotal;
    const finalStockDate = stockDate || new Date().toISOString().split('T')[0]; // Default to today if not provided

    db.run(
        'INSERT INTO inventory (name, category, current_stock, min_stock, unit_cost, total_value, stock_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, category, currentStock, minStock, unitCost, finalTotal, finalStockDate],
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

    // First get current stock
    db.get('SELECT current_stock FROM inventory WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Inventory item not found' });
            return;
        }

        const currentStock = row.current_stock;
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

        // Update the stock
        db.run(
            'UPDATE inventory SET current_stock = ?, total_value = current_stock * unit_cost, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStock, id],
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
