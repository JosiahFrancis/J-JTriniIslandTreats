// Business Management System JavaScript

class BusinessManager {
    constructor() {
        this.sales = this.loadData('sales') || [];
        this.expenses = this.loadData('expenses') || [];
        this.inventory = this.loadData('inventory') || [];
        this.bankBalance = this.loadData('bankBalance') || 0;

        // Sales pagination state
        this.salesPage = 1;
        this.salesPageSize = 10;
        this.salesFiltered = null; // null = use full list

        // Expenses pagination state
        this.expensesPage = 1;
        this.expensesPageSize = 10;
        this.expensesFiltered = null; // null = use full list

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initDashboardMonthPicker();
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
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('saleDate').value = today;
        document.getElementById('expenseDate').value = today;
    }

    switchTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
    }

    // Sales Management
    addSale() {
        const sale = {
            id: Date.now(),
            date: this.formatDateForStorage(document.getElementById('saleDate').value),
            item: document.getElementById('saleItem').value,
            quantity: parseInt(document.getElementById('saleQuantity').value),
            price: parseFloat(document.getElementById('salePrice').value),
            total: parseInt(document.getElementById('saleQuantity').value) * parseFloat(document.getElementById('salePrice').value)
        };

        this.sales.push(sale);
        this.saveData('sales', this.sales);
        this.updateDashboard();
        this.salesPage = 1; // show newest
        this.salesFiltered = null;
        this.renderSalesTable();
        this.closeModal('salesModal');
        this.clearForm('salesForm');
        this.showNotification('Sale added successfully!', 'success');
    }

    // Expenses Management
    addExpense() {
        const expense = {
            id: Date.now(),
            date: this.formatDateForStorage(document.getElementById('expenseDate').value),
            category: document.getElementById('expenseCategory').value,
            storeVendor: document.getElementById('expenseStoreVendor').value,
            description: document.getElementById('expenseDescription').value,
            amount: parseFloat(document.getElementById('expenseAmount').value)
        };

        this.expenses.push(expense);
        this.saveData('expenses', this.expenses);
        this.updateDashboard();
        this.expensesPage = 1; // show newest
        this.expensesFiltered = null;
        this.renderExpensesTable();
        this.closeModal('expensesModal');
        this.clearForm('expensesForm');
        this.showNotification('Expense added successfully!', 'success');
    }

    // Inventory Management
    addInventoryItem() {
        const item = {
            id: Date.now(),
            name: document.getElementById('inventoryName').value,
            category: document.getElementById('inventoryCategory').value,
            currentStock: parseInt(document.getElementById('inventoryStock').value),
            minStock: parseInt(document.getElementById('inventoryMinStock').value),
            unitCost: parseFloat(document.getElementById('inventoryUnitCost').value),
            totalValue: parseInt(document.getElementById('inventoryStock').value) * parseFloat(document.getElementById('inventoryUnitCost').value)
        };

        this.inventory.push(item);
        this.saveData('inventory', this.inventory);
        this.renderInventoryTable();
        this.closeModal('inventoryModal');
        this.clearForm('inventoryForm');
        this.showNotification('Inventory item added successfully!', 'success');
    }

    updateBankBalance() {
        this.bankBalance = parseFloat(document.getElementById('newBankBalance').value);
        this.saveData('bankBalance', this.bankBalance);
        this.updateDashboard();
        this.closeModal('bankBalanceModal');
        this.showNotification('Bank balance updated successfully!', 'success');
    }

    // Dashboard Updates
    updateDashboard() {
        const { month: selectedMonth, year: selectedYear } = this.getSelectedMonthYear();

        // Calculate monthly totals
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

    renderExpensesPagination(total, page, totalPages) {
        const container = document.getElementById('expensesPagination');
        if (!container) return;
        if (total <= this.expensesPageSize) {
            container.innerHTML = '';
            return;
        }
        const disablePrev = page <= 1;
        const disableNext = page >= totalPages;
        container.className = 'pagination';
        container.innerHTML = `
            <button ${disablePrev ? 'disabled' : ''} aria-label="Previous" onclick="businessManager.changeExpensesPage(${page - 1})">Prev</button>
            <span style="align-self:center; color:#4a5568;">Page ${page} of ${totalPages}</span>
            <button ${disableNext ? 'disabled' : ''} aria-label="Next" onclick="businessManager.changeExpensesPage(${page + 1})">Next</button>
        `;
    }

    changeExpensesPage(nextPage) {
        this.expensesPage = nextPage;
        this.renderExpensesTable();
    }

    renderExpensesTable(dataOverride) {
        const tbody = document.getElementById('expensesTableBody');
        const data = Array.isArray(dataOverride) ? dataOverride : (this.expensesFiltered || this.expenses);
        const sorted = [...data].sort((a, b) => {
            const da = this.parseLocalDate(a.date).getTime();
            const db = this.parseLocalDate(b.date).getTime();
            if (db !== da) return db - da;
            return (b.id || 0) - (a.id || 0);
        });

        const total = sorted.length;
        const pageSize = this.expensesPageSize;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (this.expensesPage > totalPages) this.expensesPage = totalPages;
        if (this.expensesPage < 1) this.expensesPage = 1;
        const start = (this.expensesPage - 1) * pageSize;
        const end = start + pageSize;
        const pageItems = sorted.slice(start, end);

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr class="no-data-row"><td colspan="${this.getColumnCount('expenses')}">No expenses recorded yet</td></tr>`;
        } else {
            this.renderTable(tbody, pageItems, 'expenses');
        }

        this.renderExpensesPagination(total, this.expensesPage, totalPages);
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
                    return `
                        <tr>
                            <td>${this.formatDate(item.date)}</td>
                            <td>${item.item}</td>
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
                            <td>${item.storeVendor}</td>
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
                    const stockStatus = item.currentStock <= item.minStock ? 'text-danger' : 'text-success';
                    return `
                        <tr>
                            <td>${item.name}</td>
                            <td>${this.capitalizeFirst(item.category)}</td>
                            <td class="${stockStatus}">${item.currentStock}</td>
                            <td>${item.minStock}</td>
                            <td>${this.formatCurrency(item.unitCost)}</td>
                            <td>${this.formatCurrency(item.totalValue)}</td>
                            <td>
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
            case 'expenses': return 5;
            case 'inventory': return 7;
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

        this.expensesFiltered = filteredExpenses;
        this.expensesPage = 1;
        this.renderExpensesTable(filteredExpenses);
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

        if (type === 'expenses') {
            this.expensesFiltered = filteredData;
            this.expensesPage = 1;
            this.renderExpensesTable(filteredData);
            return;
        }

        this.renderTable(tbody, filteredData, type);
    }

    // Utility Functions
    deleteItem(type, id) {
        if (confirm('Are you sure you want to delete this item?')) {
            switch (type) {
                case 'sales':
                    this.sales = this.sales.filter(sale => sale.id !== id);
                    this.saveData('sales', this.sales);
                    this.renderSalesTable();
                    break;
                case 'expenses':
                    this.expenses = this.expenses.filter(expense => expense.id !== id);
                    this.saveData('expenses', this.expenses);
                    this.expensesFiltered = null; // reset filter
                    this.renderExpensesTable();
                    break;
                case 'inventory':
                    this.inventory = this.inventory.filter(item => item.id !== id);
                    this.saveData('inventory', this.inventory);
                    this.renderInventoryTable();
                    break;
            }
            this.updateDashboard();
            this.showNotification('Item deleted successfully!', 'success');
        }
    }

    // Backup & Restore
    exportAllJSON() {
        const payload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            data: {
                sales: this.sales.map(sale => ({
                    ...sale,
                    date: this.formatDateForStorage(sale.date)
                })),
                expenses: this.expenses.map(expense => ({
                    ...expense,
                    date: this.formatDateForStorage(expense.date)
                })),
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
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result);
                const data = parsed.data || parsed; // allow raw shape
                if (!data || !Array.isArray(data.sales) || !Array.isArray(data.expenses) || !Array.isArray(data.inventory)) {
                    throw new Error('Invalid JSON structure');
                }
                this.sales = data.sales.map(this.normalizeSale);
                this.expenses = data.expenses.map(this.normalizeExpense);
                this.inventory = data.inventory.map(this.normalizeInventoryItem);
                this.bankBalance = typeof data.bankBalance === 'number' ? data.bankBalance : this.bankBalance;
                this.saveData('sales', this.sales);
                this.saveData('expenses', this.expenses);
                this.saveData('inventory', this.inventory);
                this.saveData('bankBalance', this.bankBalance);
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
                rows = [['date','item','quantity','price','total'], ...this.sales.map(s => [this.formatDateForStorage(s.date), s.item, s.quantity, s.price, s.total])];
                break;
            case 'expenses':
                rows = [['date','category','storeVendor','description','amount'], ...this.expenses.map(x => [this.formatDateForStorage(x.date), x.category, x.storeVendor, x.description, x.amount])];
                break;
            case 'inventory':
                rows = [['name','category','currentStock','minStock','unitCost','totalValue'], ...this.inventory.map(i => [i.name, i.category, i.currentStock, i.minStock, i.unitCost, i.totalValue])];
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
        reader.onload = () => {
            try {
                const text = reader.result;
                const rows = this.parseCSV(text);
                if (rows.length <= 1) throw new Error('No data');
                const header = rows[0].map(h => h.trim().toLowerCase());
                const dataRows = rows.slice(1).filter(r => r.some(cell => String(cell).trim() !== ''));
                let imported = [];
                if (type === 'sales') {
                    const idx = this.indexes(header, ['date','item','quantity','price','total']);
                    imported = dataRows.map(r => this.normalizeSale({
                        id: Date.now() + Math.floor(Math.random()*100000),
                        date: this.formatDateForStorage(r[idx.date] || ''),
                        item: r[idx.item] || '',
                        quantity: Number(r[idx.quantity] || 0),
                        price: Number(r[idx.price] || 0),
                        total: r[idx.total] !== undefined && r[idx.total] !== '' ? Number(r[idx.total]) : Number(r[idx.quantity] || 0) * Number(r[idx.price] || 0)
                    }));
                    this.sales = [...this.sales, ...imported];
                    this.saveData('sales', this.sales);
                    this.renderSalesTable();
                } else if (type === 'expenses') {
                    const idx = this.indexes(header, ['date','category','storevendor','description','amount']);
                    imported = dataRows.map(r => this.normalizeExpense({
                        id: Date.now() + Math.floor(Math.random()*100000),
                        date: this.formatDateForStorage(r[idx.date] || ''),
                        category: r[idx.category] || '',
                        storeVendor: r[idx.storevendor] || '',
                        description: r[idx.description] || '',
                        amount: Number(r[idx.amount] || 0)
                    }));
                    this.expenses = [...this.expenses, ...imported];
                    this.saveData('expenses', this.expenses);
                    this.renderExpensesTable();
                } else if (type === 'inventory') {
                    const idx = this.indexes(header, ['name','category','currentstock','minstock','unitcost','totalvalue']);
                    imported = dataRows.map(r => this.normalizeInventoryItem({
                        id: Date.now() + Math.floor(Math.random()*100000),
                        name: r[idx.name] || '',
                        category: r[idx.category] || '',
                        currentStock: Number(r[idx.currentstock] || 0),
                        minStock: Number(r[idx.minstock] || 0),
                        unitCost: Number(r[idx.unitcost] || 0),
                        totalValue: r[idx.totalvalue] !== undefined && r[idx.totalvalue] !== '' ? Number(r[idx.totalvalue]) : Number(r[idx.currentstock] || 0) * Number(r[idx.unitcost] || 0)
                    }));
                    this.inventory = [...this.inventory, ...imported];
                    this.saveData('inventory', this.inventory);
                    this.renderInventoryTable();
                }
                this.updateDashboard();
                this.showNotification(`Imported ${imported.length} ${type} record(s)`, 'success');
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
            id: s.id || Date.now() + Math.floor(Math.random()*100000),
            date: this.formatDateForStorage(s.date),
            item: s.item,
            quantity: Number(s.quantity) || 0,
            price: Number(s.price) || 0,
            total: s.total !== undefined ? Number(s.total) : (Number(s.quantity) || 0) * (Number(s.price) || 0)
        };
    }

    normalizeExpense = (e) => {
        return {
            id: e.id || Date.now() + Math.floor(Math.random()*100000),
            date: this.formatDateForStorage(e.date),
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
            id: i.id || Date.now() + Math.floor(Math.random()*100000),
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
                    if (text[i + 1] === '"') { // escaped quote
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
                    // handle \r\n by skipping the next \n
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
        const date = this.parseLocalDate(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    parseLocalDate(dateString) {
        // Handle dd/mm/yyyy format
        if (typeof dateString === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
            const [d, m, y] = dateString.split('/').map(Number);
            return new Date(y, m - 1, d);
        }
        // Handle yyyy-mm-dd from input[type=date]; construct as local date to avoid TZ shifts
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [y, m, d] = dateString.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? new Date() : d;
    }

    formatDateForStorage(dateString) {
        // Convert date to dd/mm/yyyy format for storage and CSV export
        const date = this.parseLocalDate(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    clearForm(formId) {
        document.getElementById(formId).reset();
        this.setDefaultDates();
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${message}
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#38a169' : '#667eea'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            z-index: 1001;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
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
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Data Persistence
    saveData(key, data) {
        localStorage.setItem(`snowIce_${key}`, JSON.stringify(data));
    }

    loadData(key) {
        const data = localStorage.getItem(`snowIce_${key}`);
        return data ? JSON.parse(data) : null;
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
