// Business Management System JavaScript - Database Version

class BusinessManager {
    constructor() {
        this.apiBaseUrl = window.location.origin;
        this.sales = [];
        this.expenses = [];
        this.inventory = [];
        this.bankBalance = 0;

        // Sales pagination state
        this.salesPage = 1;
        this.salesPageSize = 10;
        this.salesFiltered = null; // null = use full list

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.initDashboardMonthPicker();
        await this.loadAllData();
        this.updateDashboard();
        this.renderAllTables();
        this.setDefaultDates();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });

        // Form submissions
        document.getElementById('salesForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSale();
        });

        document.getElementById('expensesForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExpense();
        });

        document.getElementById('inventoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addInventoryItem();
        });

        document.getElementById('editInventoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateInventoryItem();
        });

        document.getElementById('bankBalanceForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateBankBalance();
        });

        // Search and filter functionality
        this.setupFilters();

        // Dashboard card clicks
        document.getElementById('bankBalance').addEventListener('click', () => {
            this.openModal('bankBalanceModal');
        });

        // Update inventory dropdown when sales modal is opened
        document.getElementById('salesModal').addEventListener('click', (e) => {
            if (e.target.id === 'salesModal' || e.target.classList.contains('close')) {
                // Modal is being closed, refresh inventory dropdown for next time
                this.populateInventoryDropdown();
            }
        });

        // Backup & Restore inputs
        const importAllInput = document.getElementById('importAllJsonInput');
        if (importAllInput) {
            importAllInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) this.handleImportAllJSON(file);
                e.target.value = '';
            });
        }

        const importSalesCsvInput = document.getElementById('importSalesCsvInput');
        if (importSalesCsvInput) {
            importSalesCsvInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) this.handleImportCSV('sales', file);
                e.target.value = '';
            });
        }

        const importExpensesCsvInput = document.getElementById('importExpensesCsvInput');
        if (importExpensesCsvInput) {
            importExpensesCsvInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) this.handleImportCSV('expenses', file);
                e.target.value = '';
            });
        }

        const importInventoryCsvInput = document.getElementById('importInventoryCsvInput');
        if (importInventoryCsvInput) {
            importInventoryCsvInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) this.handleImportCSV('inventory', file);
                e.target.value = '';
            });
        }
    }

    setupFilters() {
        // Sales filters
        document.getElementById('salesDateFilter').addEventListener('change', () => {
            this.filterSales();
        });
        document.getElementById('salesSearch').addEventListener('input', () => {
            this.filterSales();
        });

        // Expenses filters
        document.getElementById('expenseCategoryFilter').addEventListener('change', () => {
            this.filterExpenses();
        });
        document.getElementById('expensesDateFilter').addEventListener('change', () => {
            this.filterExpenses();
        });
        document.getElementById('expensesSearch').addEventListener('input', () => {
            this.filterExpenses();
        });

        // Inventory filters
        document.getElementById('inventoryCategoryFilter').addEventListener('change', () => {
            this.filterInventory();
        });
        document.getElementById('inventorySearch').addEventListener('input', () => {
            this.filterInventory();
        });

        // Update inventory summary when dropdown changes
        const inventoryDropdown = document.getElementById('saleInventoryItem');
        if (inventoryDropdown) {
            inventoryDropdown.addEventListener('change', () => {
                this.updateInventorySummary();
            });
        }
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('saleDate').value = today;
        document.getElementById('expenseDate').value = today;
        document.getElementById('inventoryStockDate').value = today;
    }

    switchTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
    }

    // API Helper Methods
    async apiRequest(url, options = {}) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api${url}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            this.showNotification('Network error. Please check your connection.', 'danger');
            throw error;
        }
    }

    async loadAllData() {
        try {
            // Load sales
            this.sales = await this.apiRequest('/sales?limit=all');
            
            // Load expenses
            this.expenses = await this.apiRequest('/expenses');
            
            // Load inventory
            this.inventory = await this.apiRequest('/inventory');
            
            // Load bank balance
            const balanceData = await this.apiRequest('/settings/bankBalance');
            this.bankBalance = balanceData.value ? parseFloat(balanceData.value) : 0;

            // Populate inventory dropdown for sales
            this.populateInventoryDropdown();

        } catch (error) {
            console.error('Failed to load data:', error);
            this.showNotification('Failed to load data from server', 'danger');
        }
    }

    // Sales Management
    async addSale() {
        try {
            const inventoryItemId = document.getElementById('saleInventoryItem').value;
            const saleData = {
                date: document.getElementById('saleDate').value,
                item: document.getElementById('saleItem').value,
                quantity: parseInt(document.getElementById('saleQuantity').value),
                price: parseFloat(document.getElementById('salePrice').value)
            };

            // Add inventory item ID if selected
            if (inventoryItemId) {
                saleData.inventoryItemId = parseInt(inventoryItemId);
            }

            const result = await this.apiRequest('/sales', {
                method: 'POST',
                body: JSON.stringify(saleData)
            });

            // Reload sales and inventory data
            this.sales = await this.apiRequest('/sales?limit=all');
            this.inventory = await this.apiRequest('/inventory');
            
            // Update inventory dropdown
            this.populateInventoryDropdown();
            
            this.updateDashboard();
            this.salesPage = 1;
            this.salesFiltered = null;
            this.renderSalesTable();
            this.renderInventoryTable();
            this.closeModal('salesModal');
            this.clearForm('salesForm');
            
            const message = result.inventoryUpdated ? 
                `Sale added successfully! Inventory updated. New stock: ${result.newStock}` : 
                'Sale added successfully!';
            this.showNotification(message, 'success');
        } catch (error) {
            console.error('Failed to add sale:', error);
            this.showNotification(error.message || 'Failed to add sale', 'danger');
        }
    }

    // Expenses Management
    async addExpense() {
        try {
            const expenseData = {
                date: document.getElementById('expenseDate').value,
                category: document.getElementById('expenseCategory').value,
                storeVendor: document.getElementById('expenseStoreVendor').value,
                description: document.getElementById('expenseDescription').value,
                amount: parseFloat(document.getElementById('expenseAmount').value)
            };

            const result = await this.apiRequest('/expenses', {
                method: 'POST',
                body: JSON.stringify(expenseData)
            });

            // Reload expenses data
            this.expenses = await this.apiRequest('/expenses');
            this.updateDashboard();
            this.renderExpensesTable();
            this.closeModal('expensesModal');
            this.clearForm('expensesForm');
            this.showNotification('Expense added successfully!', 'success');
        } catch (error) {
            console.error('Failed to add expense:', error);
            this.showNotification('Failed to add expense', 'danger');
        }
    }

    // Inventory Management
    async addInventoryItem() {
        try {
            const inventoryData = {
                name: document.getElementById('inventoryName').value,
                category: document.getElementById('inventoryCategory').value,
                currentStock: parseInt(document.getElementById('inventoryStock').value),
                minStock: parseInt(document.getElementById('inventoryMinStock').value),
                unitCost: parseFloat(document.getElementById('inventoryUnitCost').value),
                stockDate: document.getElementById('inventoryStockDate').value
            };

            const result = await this.apiRequest('/inventory', {
                method: 'POST',
                body: JSON.stringify(inventoryData)
            });

            // Reload inventory data
            this.inventory = await this.apiRequest('/inventory');
            this.renderInventoryTable();
            this.populateInventoryDropdown(); // Update the sales dropdown
            this.closeModal('inventoryModal');
            this.clearForm('inventoryForm');
            this.showNotification('Inventory item added successfully!', 'success');
        } catch (error) {
            console.error('Failed to add inventory item:', error);
            this.showNotification('Failed to add inventory item', 'danger');
        }
    }

    async updateInventoryItem() {
        try {
            const inventoryData = {
                name: document.getElementById('editInventoryName').value,
                category: document.getElementById('editInventoryCategory').value,
                currentStock: parseInt(document.getElementById('editInventoryStock').value),
                minStock: parseInt(document.getElementById('editInventoryMinStock').value),
                unitCost: parseFloat(document.getElementById('editInventoryUnitCost').value),
                stockDate: document.getElementById('editInventoryStockDate').value
            };

            const itemId = document.getElementById('editInventoryId').value;

            const result = await this.apiRequest(`/inventory/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify(inventoryData)
            });

            // Reload inventory data
            this.inventory = await this.apiRequest('/inventory');
            this.renderInventoryTable();
            this.populateInventoryDropdown(); // Update the sales dropdown
            this.closeModal('editInventoryModal');
            this.showNotification('Inventory item updated successfully!', 'success');
        } catch (error) {
            console.error('Failed to update inventory item:', error);
            this.showNotification('Failed to update inventory item', 'danger');
        }
    }

    async updateBankBalance() {
        try {
            const newBalance = parseFloat(document.getElementById('newBankBalance').value);
            
            await this.apiRequest('/settings/bankBalance', {
                method: 'POST',
                body: JSON.stringify({ value: newBalance })
            });

            this.bankBalance = newBalance;
            this.updateDashboard();
            this.closeModal('bankBalanceModal');
            this.showNotification('Bank balance updated successfully!', 'success');
        } catch (error) {
            console.error('Failed to update bank balance:', error);
            this.showNotification('Failed to update bank balance', 'danger');
        }
    }

    // Dashboard Updates
    async updateDashboard() {
        const { month: selectedMonth, year: selectedYear } = this.getSelectedMonthYear();

        try {
            // Get dashboard data from API
            const dashboardData = await this.apiRequest(`/dashboard/${selectedYear}/${selectedMonth + 1}`);

            // Update dashboard cards
            document.getElementById('totalSales').textContent = this.formatCurrency(dashboardData.sales);
            document.getElementById('totalExpenses').textContent = this.formatCurrency(dashboardData.expenses);
            document.getElementById('netProfit').textContent = this.formatCurrency(dashboardData.netProfit);
            document.getElementById('bankBalance').textContent = this.formatCurrency(dashboardData.bankBalance);

            // Update recent activity
            this.updateRecentActivity();
        } catch (error) {
            console.error('Failed to update dashboard:', error);
            // Fallback to local calculation
            this.updateDashboardLocal();
        }
    }

    updateDashboardLocal() {
        const { month: selectedMonth, year: selectedYear } = this.getSelectedMonthYear();

        // Calculate monthly totals locally
        const monthlySales = this.sales.filter(sale => {
            const saleDate = this.parseLocalDate(sale.date);
            return saleDate.getMonth() === selectedMonth && saleDate.getFullYear() === selectedYear;
        }).reduce((sum, sale) => sum + sale.total, 0);

        const monthlyExpenses = this.expenses.filter(expense => {
            const expenseDate = this.parseLocalDate(expense.date);
            return expenseDate.getMonth() === selectedMonth && expenseDate.getFullYear() === selectedYear;
        }).reduce((sum, expense) => sum + expense.amount, 0);

        const netProfit = monthlySales - monthlyExpenses;

        // Update dashboard cards
        document.getElementById('totalSales').textContent = this.formatCurrency(isNaN(monthlySales) ? 0 : monthlySales);
        document.getElementById('totalExpenses').textContent = this.formatCurrency(isNaN(monthlyExpenses) ? 0 : monthlyExpenses);
        document.getElementById('netProfit').textContent = this.formatCurrency(isNaN(netProfit) ? 0 : netProfit);
        document.getElementById('bankBalance').textContent = this.formatCurrency(this.bankBalance);

        // Update recent activity
        this.updateRecentActivity();
    }

    initDashboardMonthPicker() {
        const picker = document.getElementById('dashboardMonthPicker');
        if (!picker) return;
        const now = new Date();
        picker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        picker.addEventListener('change', () => {
            this.updateDashboard();
        });
    }

    getSelectedMonthYear() {
        const picker = document.getElementById('dashboardMonthPicker');
        if (picker && picker.value) {
            const [y, m] = picker.value.split('-').map(Number);
            return { month: (m - 1), year: y };
        }
        const now = new Date();
        return { month: now.getMonth(), year: now.getFullYear() };
    }

    changeDashboardMonth(direction) {
        const picker = document.getElementById('dashboardMonthPicker');
        if (!picker) return;
        const { month, year } = this.getSelectedMonthYear();
        let newMonth = month + direction;
        let newYear = year;
        if (newMonth < 0) { newMonth = 11; newYear -= 1; }
        if (newMonth > 11) { newMonth = 0; newYear += 1; }
        picker.value = `${newYear}-${String(newMonth + 1).padStart(2, '0')}`;
        this.updateDashboard();
    }

    updateRecentActivity() {
        const recentActivity = document.getElementById('recentActivity');
        const allActivities = [];

        // Add recent sales
        this.sales.slice(-5).forEach(sale => {
            allActivities.push({
                type: 'sale',
                description: `Sold ${sale.quantity}x ${sale.item}`,
                amount: sale.total,
                date: sale.date,
                icon: 'fas fa-dollar-sign',
                color: 'text-success'
            });
        });

        // Add recent expenses
        this.expenses.slice(-5).forEach(expense => {
            allActivities.push({
                type: 'expense',
                description: `${expense.category}: ${expense.description}`,
                amount: -expense.amount,
                date: expense.date,
                icon: 'fas fa-receipt',
                color: 'text-danger'
            });
        });

        // Sort by date (most recent first)
        allActivities.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allActivities.length === 0) {
            recentActivity.innerHTML = '<p class="no-data">No recent activity</p>';
            return;
        }

        recentActivity.innerHTML = allActivities.slice(0, 10).map(activity => `
            <div class="activity-item">
                <div class="activity-description">
                    <i class="${activity.icon}"></i> ${activity.description}
                </div>
                <div class="activity-amount ${activity.color}">
                    ${activity.amount >= 0 ? '+' : ''}${this.formatCurrency(activity.amount)}
                </div>
            </div>
        `).join('');
    }

    // Table Rendering
    renderSalesTable(dataOverride) {
        const tbody = document.getElementById('salesTableBody');
        const data = Array.isArray(dataOverride) ? dataOverride : (this.salesFiltered || this.sales);
        const sorted = [...data].sort((a, b) => {
            const da = this.parseLocalDate(a.date).getTime();
            const db = this.parseLocalDate(b.date).getTime();
            if (db !== da) return db - da;
            return (b.id || 0) - (a.id || 0);
        });

        const total = sorted.length;
        const pageSize = this.salesPageSize;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (this.salesPage > totalPages) this.salesPage = totalPages;
        if (this.salesPage < 1) this.salesPage = 1;
        const start = (this.salesPage - 1) * pageSize;
        const end = start + pageSize;
        const pageItems = sorted.slice(start, end);

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr class="no-data-row"><td colspan="${this.getColumnCount('sales')}">No sales recorded yet</td></tr>`;
        } else {
            this.renderTable(tbody, pageItems, 'sales');
        }

        this.renderSalesPagination(total, this.salesPage, totalPages);
    }

    renderSalesPagination(total, page, totalPages) {
        const container = document.getElementById('salesPagination');
        if (!container) return;
        if (total <= this.salesPageSize) {
            container.innerHTML = '';
            return;
        }
        const disablePrev = page <= 1;
        const disableNext = page >= totalPages;
        container.className = 'pagination';
        container.innerHTML = `
            <button ${disablePrev ? 'disabled' : ''} aria-label="Previous" onclick="businessManager.changeSalesPage(${page - 1})">Prev</button>
            <span style="align-self:center; color:#4a5568;">Page ${page} of ${totalPages}</span>
            <button ${disableNext ? 'disabled' : ''} aria-label="Next" onclick="businessManager.changeSalesPage(${page + 1})">Next</button>
        `;
    }

    changeSalesPage(nextPage) {
        this.salesPage = nextPage;
        this.renderSalesTable();
    }

    renderExpensesTable() {
        const tbody = document.getElementById('expensesTableBody');
        this.renderTable(tbody, this.expenses, 'expenses');
    }

    renderInventoryTable() {
        const tbody = document.getElementById('inventoryTableBody');
        this.renderTable(tbody, this.inventory, 'inventory');
    }

    renderAllTables() {
        this.renderSalesTable();
        this.renderExpensesTable();
        this.renderInventoryTable();
    }

    renderTable(tbody, data, type) {
        if (data.length === 0) {
            tbody.innerHTML = `<tr class="no-data-row"><td colspan="${this.getColumnCount(type)}">No ${type} recorded yet</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(item => {
            switch (type) {
                case 'sales':
                    const inventoryIcon = item.inventory_item_id ? 
                        `<i class="fas fa-boxes" title="This sale affected inventory" style="color: #667eea; margin-left: 5px;"></i>` : '';
                    return `
                        <tr>
                            <td>${this.formatDate(item.date)}</td>
                            <td>${item.item}${inventoryIcon}</td>
                            <td>${item.quantity}</td>
                            <td>${this.formatCurrency(item.price)}</td>
                            <td>${this.formatCurrency(item.total)}</td>
                            <td>
                                <button class="btn btn-danger btn-small" onclick="businessManager.deleteItem('sales', ${item.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                case 'expenses':
                    return `
                        <tr>
                            <td>${this.formatDate(item.date)}</td>
                            <td>${this.capitalizeFirst(item.category)}</td>
                            <td>${item.store_vendor}</td>
                            <td>${item.description}</td>
                            <td>${this.formatCurrency(item.amount)}</td>
                            <td>
                                <button class="btn btn-danger btn-small" onclick="businessManager.deleteItem('expenses', ${item.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                case 'inventory':
                    const stockStatus = item.current_stock <= item.min_stock ? 'text-danger' : 'text-success';
                    const stockWarning = item.current_stock <= item.min_stock ? 
                        `<i class="fas fa-exclamation-triangle" title="Low stock warning!"></i>` : '';
                    return `
                        <tr>
                            <td>${item.name} ${stockWarning}</td>
                            <td>${this.capitalizeFirst(item.category)}</td>
                            <td>${this.formatDate(item.stock_date || item.created_at)}</td>
                            <td class="${stockStatus}">${item.current_stock}</td>
                            <td>${item.min_stock}</td>
                            <td>${this.formatCurrency(item.unit_cost)}</td>
                            <td>${this.formatCurrency(item.total_value)}</td>
                            <td>
                                <button class="btn btn-primary btn-small" onclick="businessManager.openEditInventoryModal(${JSON.stringify(item).replace(/"/g, '&quot;')})" style="margin-right: 5px;">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-danger btn-small" onclick="businessManager.deleteItem('inventory', ${item.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
            }
        }).join('');
    }

    getColumnCount(type) {
        switch (type) {
            case 'sales': return 6;
            case 'expenses': return 6;
            case 'inventory': return 8;
            default: return 5;
        }
    }

    // Filtering Functions
    filterSales() {
        const dateFilter = document.getElementById('salesDateFilter').value;
        const searchFilter = document.getElementById('salesSearch').value.toLowerCase();

        let filteredSales = this.sales;

        if (dateFilter) {
            filteredSales = filteredSales.filter(sale => sale.date === dateFilter);
        }

        if (searchFilter) {
            filteredSales = filteredSales.filter(sale => 
                sale.item.toLowerCase().includes(searchFilter)
            );
        }

        this.salesFiltered = filteredSales;
        this.salesPage = 1;
        this.renderSalesTable(filteredSales);
    }

    filterExpenses() {
        const categoryFilter = document.getElementById('expenseCategoryFilter').value;
        const dateFilter = document.getElementById('expensesDateFilter').value;
        const searchFilter = document.getElementById('expensesSearch').value.toLowerCase();

        let filteredExpenses = this.expenses;

        if (categoryFilter) {
            filteredExpenses = filteredExpenses.filter(expense => expense.category === categoryFilter);
        }

        if (dateFilter) {
            filteredExpenses = filteredExpenses.filter(expense => expense.date === dateFilter);
        }

        if (searchFilter) {
            filteredExpenses = filteredExpenses.filter(expense => 
                expense.description.toLowerCase().includes(searchFilter) ||
                expense.category.toLowerCase().includes(searchFilter)
            );
        }

        this.renderFilteredTable('expensesTableBody', filteredExpenses, 'expenses');
    }

    filterInventory() {
        const categoryFilter = document.getElementById('inventoryCategoryFilter').value;
        const searchFilter = document.getElementById('inventorySearch').value.toLowerCase();

        let filteredInventory = this.inventory;

        if (categoryFilter) {
            filteredInventory = filteredInventory.filter(item => item.category === categoryFilter);
        }

        if (searchFilter) {
            filteredInventory = filteredInventory.filter(item => 
                item.name.toLowerCase().includes(searchFilter) ||
                item.category.toLowerCase().includes(searchFilter)
            );
        }

        this.renderFilteredTable('inventoryTableBody', filteredInventory, 'inventory');
    }

    renderFilteredTable(tbodyId, filteredData, type) {
        const tbody = document.getElementById(tbodyId);
        if (filteredData.length === 0) {
            tbody.innerHTML = `<tr class="no-data-row"><td colspan="${this.getColumnCount(type)}">No matching ${type} found</td></tr>`;
            return;
        }

        if (type === 'sales') {
            this.salesFiltered = filteredData;
            this.salesPage = 1;
            this.renderSalesTable(filteredData);
            return;
        }

        this.renderTable(tbody, filteredData, type);
    }

    // Utility Functions
    async deleteItem(type, id) {
        if (confirm('Are you sure you want to delete this item?')) {
            try {
                const result = await this.apiRequest(`/${type}/${id}`, { method: 'DELETE' });
                
                // Reload data
                switch (type) {
                    case 'sales':
                        this.sales = await this.apiRequest('/sales?limit=all');
                        this.renderSalesTable();
                        // Also reload inventory to reflect any stock restoration
                        this.inventory = await this.apiRequest('/inventory');
                        this.renderInventoryTable();
                        this.populateInventoryDropdown();
                        break;
                    case 'expenses':
                        this.expenses = await this.apiRequest('/expenses');
                        this.renderExpensesTable();
                        break;
                    case 'inventory':
                        this.inventory = await this.apiRequest('/inventory');
                        this.renderInventoryTable();
                        this.populateInventoryDropdown(); // Update the sales dropdown
                        break;
                }
                
                this.updateDashboard();
                
                // Show enhanced notification for sales deletion
                if (type === 'sales' && result.inventoryRestored) {
                    this.showNotification(`Sale deleted successfully! Stock restored: ${result.restoredQuantity} units`, 'success');
                } else {
                    this.showNotification('Item deleted successfully!', 'success');
                }
            } catch (error) {
                console.error('Failed to delete item:', error);
                this.showNotification('Failed to delete item', 'danger');
            }
        }
    }

    // Backup & Restore
    exportAllJSON() {
        const payload = {
            version: 2,
            exportedAt: new Date().toISOString(),
            data: {
                sales: this.sales,
                expenses: this.expenses,
                inventory: this.inventory,
                bankBalance: this.bankBalance
            }
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        this.downloadBlob(`business-backup-${this.getDateStamp()}.json`, blob);
        this.showNotification('Exported all data to JSON', 'success');
    }

    handleImportAllJSON(file) {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const parsed = JSON.parse(reader.result);
                const data = parsed.data || parsed;
                
                if (!data || !Array.isArray(data.sales) || !Array.isArray(data.expenses) || !Array.isArray(data.inventory)) {
                    throw new Error('Invalid JSON structure');
                }

                // Import sales
                for (const sale of data.sales) {
                    await this.apiRequest('/sales', {
                        method: 'POST',
                        body: JSON.stringify(this.normalizeSale(sale))
                    });
                }

                // Import expenses
                for (const expense of data.expenses) {
                    await this.apiRequest('/expenses', {
                        method: 'POST',
                        body: JSON.stringify(this.normalizeExpense(expense))
                    });
                }

                // Import inventory
                for (const item of data.inventory) {
                    await this.apiRequest('/inventory', {
                        method: 'POST',
                        body: JSON.stringify(this.normalizeInventoryItem(item))
                    });
                }

                // Update bank balance
                if (typeof data.bankBalance === 'number') {
                    await this.apiRequest('/settings/bankBalance', {
                        method: 'POST',
                        body: JSON.stringify({ value: data.bankBalance })
                    });
                }

                // Reload all data
                await this.loadAllData();
                this.renderAllTables();
                this.updateDashboard();
                this.showNotification('Imported JSON backup successfully', 'success');
            } catch (err) {
                console.error(err);
                this.showNotification('Failed to import JSON. Please check the file.', 'danger');
            }
        };
        reader.readAsText(file);
    }

    exportCSV(type) {
        let rows = [];
        switch (type) {
            case 'sales':
                rows = [['date','item','quantity','price','total'], ...this.sales.map(s => [s.date, s.item, s.quantity, s.price, s.total])];
                break;
            case 'expenses':
                rows = [['date','category','storeVendor','description','amount'], ...this.expenses.map(x => [x.date, x.category, x.store_vendor, x.description, x.amount])];
                break;
            case 'inventory':
                rows = [['name','category','currentStock','minStock','unitCost','totalValue'], ...this.inventory.map(i => [i.name, i.category, i.current_stock, i.min_stock, i.unit_cost, i.total_value])];
                break;
            default:
                this.showNotification('Unknown type for CSV export', 'danger');
                return;
        }
        const csv = rows.map(r => r.map(this.csvEscape).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        this.downloadBlob(`${type}-${this.getDateStamp()}.csv`, blob);
        this.showNotification(`Exported ${type} to CSV`, 'success');
    }

    handleImportCSV(type, file) {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const text = reader.result;
                const rows = this.parseCSV(text);
                if (rows.length <= 1) throw new Error('No data');
                const header = rows[0].map(h => h.trim().toLowerCase());
                const dataRows = rows.slice(1).filter(r => r.some(cell => String(cell).trim() !== ''));
                
                if (type === 'sales') {
                    const idx = this.indexes(header, ['date','item','quantity','price','total']);
                    for (const row of dataRows) {
                        const saleData = this.normalizeSale({
                            date: row[idx.date] || '',
                            item: row[idx.item] || '',
                            quantity: Number(row[idx.quantity] || 0),
                            price: Number(row[idx.price] || 0),
                            total: row[idx.total] !== undefined && row[idx.total] !== '' ? Number(row[idx.total]) : Number(row[idx.quantity] || 0) * Number(row[idx.price] || 0)
                        });
                        await this.apiRequest('/sales', {
                            method: 'POST',
                            body: JSON.stringify(saleData)
                        });
                    }
                } else if (type === 'expenses') {
                    const idx = this.indexes(header, ['date','category','storevendor','description','amount']);
                    for (const row of dataRows) {
                        const expenseData = this.normalizeExpense({
                            date: row[idx.date] || '',
                            category: row[idx.category] || '',
                            storeVendor: row[idx.storevendor] || '',
                            description: row[idx.description] || '',
                            amount: Number(row[idx.amount] || 0)
                        });
                        await this.apiRequest('/expenses', {
                            method: 'POST',
                            body: JSON.stringify(expenseData)
                        });
                    }
                } else if (type === 'inventory') {
                    const idx = this.indexes(header, ['name','category','currentstock','minstock','unitcost','totalvalue']);
                    for (const row of dataRows) {
                        const inventoryData = this.normalizeInventoryItem({
                            name: row[idx.name] || '',
                            category: row[idx.category] || '',
                            currentStock: Number(row[idx.currentstock] || 0),
                            minStock: Number(row[idx.minstock] || 0),
                            unitCost: Number(row[idx.unitcost] || 0),
                            totalValue: row[idx.totalvalue] !== undefined && row[idx.totalvalue] !== '' ? Number(row[idx.totalvalue]) : Number(row[idx.currentstock] || 0) * Number(row[idx.unitcost] || 0)
                        });
                        await this.apiRequest('/inventory', {
                            method: 'POST',
                            body: JSON.stringify(inventoryData)
                        });
                    }
                }
                
                // Reload data
                await this.loadAllData();
                this.renderAllTables();
                this.updateDashboard();
                this.showNotification(`Imported ${dataRows.length} ${type} record(s)`, 'success');
            } catch (err) {
                console.error(err);
                this.showNotification('Failed to import CSV. Please check the file/headers.', 'danger');
            }
        };
        reader.readAsText(file);
    }

    // Normalizers ensure correct types and required fields
    normalizeSale = (s) => {
        return {
            date: s.date,
            item: s.item,
            quantity: Number(s.quantity) || 0,
            price: Number(s.price) || 0,
            total: s.total !== undefined ? Number(s.total) : (Number(s.quantity) || 0) * (Number(s.price) || 0)
        };
    }

    normalizeExpense = (e) => {
        return {
            date: e.date,
            category: e.category,
            storeVendor: e.storeVendor,
            description: e.description,
            amount: Number(e.amount) || 0
        };
    }

    normalizeInventoryItem = (i) => {
        const currentStock = Number(i.currentStock) || 0;
        const unitCost = Number(i.unitCost) || 0;
        return {
            name: i.name,
            category: i.category,
            currentStock,
            minStock: Number(i.minStock) || 0,
            unitCost,
            totalValue: i.totalValue !== undefined ? Number(i.totalValue) : currentStock * unitCost
        };
    }

    // CSV helpers
    csvEscape = (value) => {
        const v = value === null || value === undefined ? '' : String(value);
        if (/[",\n]/.test(v)) {
            return '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
    }

    parseCSV(text) {
        const rows = [];
        let current = '';
        let row = [];
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (inQuotes) {
                if (char === '"') {
                    if (text[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    row.push(current);
                    current = '';
                } else if (char === '\n' || char === '\r') {
                    if (current !== '' || row.length) {
                        row.push(current);
                        rows.push(row);
                        row = [];
                        current = '';
                    }
                    if (char === '\r' && text[i + 1] === '\n') {
                        i++;
                    }
                } else {
                    current += char;
                }
            }
        }
        if (current !== '' || row.length) {
            row.push(current);
            rows.push(row);
        }
        return rows;
    }

    indexes(header, wanted) {
        const map = {};
        wanted.forEach(key => {
            map[key] = header.indexOf(key);
        });
        return map;
    }

    downloadBlob(filename, blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }

    getDateStamp() {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDate(dateString) {
        return this.parseLocalDate(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    parseLocalDate(dateString) {
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [y, m, d] = dateString.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? new Date() : d;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    clearForm(formId) {
        document.getElementById(formId).reset();
        this.setDefaultDates();
    }

    openEditInventoryModal(item) {
        // Populate the edit form with item data
        document.getElementById('editInventoryId').value = item.id;
        document.getElementById('editInventoryName').value = item.name;
        document.getElementById('editInventoryCategory').value = item.category;
        document.getElementById('editInventoryStock').value = item.current_stock;
        document.getElementById('editInventoryMinStock').value = item.min_stock;
        document.getElementById('editInventoryUnitCost').value = item.unit_cost;
        document.getElementById('editInventoryStockDate').value = item.stock_date || new Date().toISOString().split('T')[0];
        
        // Open the modal
        this.openModal('editInventoryModal');
    }

    populateInventoryDropdown() {
        const dropdown = document.getElementById('saleInventoryItem');
        if (!dropdown) return;

        // Clear existing options except the first one
        dropdown.innerHTML = '<option value="">No inventory update</option>';

        // Filter and sort inventory items
        const availableItems = this.inventory
            .filter(item => item.current_stock > 0) // Only show items with stock
            .sort((a, b) => {
                // Sort by stock level (lowest first) then by name
                if (a.current_stock <= a.min_stock && b.current_stock > b.min_stock) return -1;
                if (a.current_stock > a.min_stock && b.current_stock <= b.min_stock) return 1;
                return a.name.localeCompare(b.name);
            });

        // Add inventory items with enhanced display
        availableItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            
            // Create visual indicators for stock status
            let stockIndicator = '';
            let stockColor = '';
            
            if (item.current_stock <= item.min_stock) {
                stockIndicator = ' 🔴 LOW STOCK';
                stockColor = 'color: #e53e3e;';
            } else if (item.current_stock <= item.min_stock * 2) {
                stockIndicator = ' 🟡 MEDIUM STOCK';
                stockColor = 'color: #d69e2e;';
            } else {
                stockIndicator = ' 🟢 GOOD STOCK';
                stockColor = 'color: #38a169;';
            }
            
            option.textContent = `${item.name} (${item.current_stock} units)${stockIndicator}`;
            option.style.cssText = stockColor;
            dropdown.appendChild(option);
        });

        // Add a separator and out-of-stock items (disabled)
        if (availableItems.length > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '───────────────';
            dropdown.appendChild(separator);
        }

        // Show out-of-stock items as disabled options
        const outOfStockItems = this.inventory.filter(item => item.current_stock === 0);
        if (outOfStockItems.length > 0) {
            outOfStockItems.forEach(item => {
                const option = document.createElement('option');
                option.value = '';
                option.disabled = true;
                option.textContent = `${item.name} (OUT OF STOCK)`;
                option.style.cssText = 'color: #a0aec0; font-style: italic;';
                dropdown.appendChild(option);
            });
        }

        // Update the inventory summary
        this.updateInventorySummary();
    }

    updateInventorySummary() {
        const summaryDiv = document.getElementById('inventorySummary');
        if (!summaryDiv) return;

        const availableItems = this.inventory.filter(item => item.current_stock > 0);
        const lowStockItems = this.inventory.filter(item => item.current_stock > 0 && item.current_stock <= item.min_stock);
        const outOfStockItems = this.inventory.filter(item => item.current_stock === 0);

        let summaryHTML = `<strong>📦 Inventory Summary:</strong><br>`;
        summaryHTML += `✅ ${availableItems.length} items available<br>`;
        
        if (lowStockItems.length > 0) {
            summaryHTML += `⚠️ ${lowStockItems.length} items low on stock<br>`;
        }
        
        if (outOfStockItems.length > 0) {
            summaryHTML += `❌ ${outOfStockItems.length} items out of stock<br>`;
        }

        summaryDiv.innerHTML = summaryHTML;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${message}
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#38a169' : type === 'danger' ? '#e53e3e' : '#667eea'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            z-index: 1001;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Modal Functions
    openModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Refresh inventory dropdown when sales modal is opened
        if (modalId === 'salesModal') {
            this.populateInventoryDropdown();
        }
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Global functions for HTML onclick events
function openModal(modalId) {
    businessManager.openModal(modalId);
}

function closeModal(modalId) {
    businessManager.closeModal(modalId);
}

// Initialize the application
let businessManager;

document.addEventListener('DOMContentLoaded', () => {
    businessManager = new BusinessManager();
    // Expose export/import helpers for buttons wired via inline onclick
    window.exportAllJSON = () => businessManager.exportAllJSON();
    window.exportCSV = (type) => businessManager.exportCSV(type);
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
