# 🏝️ J&J Trini Island Treats Business Manager v2.0

A comprehensive web-based business management system designed specifically for Snow Ice and tropical treat businesses. This application helps you track sales, manage expenses, monitor inventory, and maintain financial records all in one place.

**🆕 NEW IN V2.0: Database Storage Support!**

![Business Manager Dashboard](https://img.shields.io/badge/Status-Ready%20to%20Use-brightgreen)
![Platform](https://img.shields.io/badge/Platform-Web%20Browser-blue)
![Data Storage](https://img.shields.io/badge/Storage-SQLite%20Database-green)

## 🌟 Features

### 📊 **Dashboard Overview**

- **Real-time Financial Summary**: View total sales, expenses, net profit, and bank balance for the current month
- **Recent Activity Feed**: Track your latest transactions and business activities
- **Interactive Cards**: Click on bank balance to update your current balance

### 💰 **Sales Management**

- Add, view, and delete sales records
- Track item names, quantities, prices, and total amounts
- Date filtering and search functionality
- Automatic total calculations

### 📝 **Expense Tracking**

- Categorized expense management:
  - 🥤 Ingredients (syrups, ice, sugar, etc.)
  - 🔧 Equipment (machines, tools, maintenance)
  - ⚡ Utilities (electricity, water, gas)
  - 🏠 Rent
  - 📢 Marketing
  - 📦 Other expenses
- Date filtering and search capabilities
- Detailed expense descriptions

### 📦 **Inventory Management**

- Track Snow Ice supplies and products
- Categories include:
  - 🍓 Syrups (flavored syrups)
  - 🥜 Toppings (nuts, fruits, candies)
  - 🥤 Cups & Containers
  - 🔧 Equipment
  - 📦 Other supplies
- Stock level monitoring with minimum stock alerts
- Unit cost tracking and total inventory value calculation
- Low stock warnings (red indicators when below minimum)

### 🗄️ **Database Storage (NEW!)**

- **SQLite Database**: Reliable, file-based database storage
- **RESTful API**: Modern API architecture for data management
- **Data Persistence**: All data stored in a local SQLite database file
- **Backup & Restore**: Easy data export/import functionality
- **Migration Support**: Tools to migrate from localStorage to database

### 📱 **Mobile-Friendly Design**

- Responsive layout that works on all devices
- Touch-friendly interface for mobile and tablet use
- Optimized for small screens

## 🚀 Getting Started

### Prerequisites

- **Node.js** (version 14 or higher) - [Download here](https://nodejs.org/)
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Download all files** to a folder on your computer:
   ```
   jj-business-manager/
   ├── index.html
   ├── styles.css
   ├── script.js (original localStorage version)
   ├── script-api.js (new database version)
   ├── server.js
   ├── package.json
   ├── scripts/
   │   ├── init-database.js
   │   └── migrate-localstorage.js
   └── README.md
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Initialize the database**:
   ```bash
   npm run init-db
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

5. **Open your browser** and go to: `http://localhost:3000`

## 📖 How to Use

### 🏠 **Dashboard**

- View your business overview at a glance
- Click on the Bank Balance card to update your current balance
- Monitor recent activity in the activity feed

### 💾 **Backup & Restore (Import/Export)**

- **Export everything (JSON)**: In the Dashboard, click "Export All (JSON)" to download a full backup
- **Import everything (JSON)**: Click "Import All (JSON)" and choose a previously exported backup `.json` file
- **Export CSV per tab**:
  - Sales: Exports columns `date,item,quantity,price,total`
  - Expenses: Exports columns `date,category,storeVendor,description,amount`
  - Inventory: Exports columns `name,category,currentStock,minStock,unitCost,totalValue`
- **Import CSV per tab**: Click "Import CSV" in the tab and select your CSV file with matching headers

### 💵 **Adding Sales**

1. Click the "Sales" tab
2. Click "Add Sale" button
3. Fill in the form:
   - Date of sale
   - Item name (e.g., "Snow Ice Cup", "Tropical Smoothie")
   - Quantity sold
   - Price per unit
4. Click "Add Sale" to save

### 💸 **Recording Expenses**

1. Click the "Expenses" tab
2. Click "Add Expense" button
3. Fill in the form:
   - Date of expense
   - Category (select from dropdown)
   - Description (e.g., "Sugar purchase", "Equipment repair")
   - Amount spent
4. Click "Add Expense" to save

### 📦 **Managing Inventory**

1. Click the "Inventory" tab
2. Click "Add Item" button
3. Fill in the form:
   - Item name (e.g., "Strawberry Syrup", "Coconut Flakes")
   - Category (select from dropdown)
   - Current stock quantity
   - Minimum stock level (for low stock alerts)
   - Unit cost
4. Click "Add Item" to save

### 🔍 **Searching and Filtering**

- Use the search boxes to find specific items
- Use date filters to view records from specific dates
- Use category filters to view items by type
- All filters work in combination

### 🗑️ **Deleting Records**

- Click the red trash icon next to any record to delete it
- Confirm deletion when prompted
- Deleted records cannot be recovered

## 🔄 Migration from localStorage

If you have existing data in the old localStorage version, follow these steps to migrate:

### Step 1: Export Your Current Data

1. Open your old version in the browser
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Run this command to export your data:
   ```javascript
   JSON.stringify({
     sales: JSON.parse(localStorage.getItem("snowIce_sales") || "[]"),
     expenses: JSON.parse(localStorage.getItem("snowIce_expenses") || "[]"),
     inventory: JSON.parse(localStorage.getItem("snowIce_inventory") || "[]"),
     bankBalance: parseFloat(localStorage.getItem("snowIce_bankBalance") || "0")
   })
   ```
5. Copy the output and save it as `backup.json`

### Step 2: Run Migration Script

```bash
node scripts/migrate-localstorage.js backup.json
```

This will import all your existing data into the new database.

## 🎯 Business Categories

### Expense Categories

- **Ingredients**: Sugar, ice, syrups, flavorings, etc.
- **Equipment**: Snow ice machines, blenders, tools, maintenance
- **Utilities**: Electricity, water, gas bills
- **Rent**: Store rent, equipment rental
- **Marketing**: Advertising, promotions, social media
- **Other**: Miscellaneous business expenses

### Inventory Categories

- **Syrups**: Flavored syrups for Snow Ice
- **Toppings**: Nuts, fruits, candies, sprinkles
- **Cups & Containers**: Serving cups, lids, containers
- **Equipment**: Machines, tools, accessories
- **Other**: Miscellaneous supplies

## 💡 Tips for Success

### 📊 **Regular Updates**

- Update your sales daily to maintain accurate records
- Record expenses as soon as they occur
- Update inventory levels when you receive new stock

### 📈 **Financial Monitoring**

- Check your dashboard regularly to monitor profitability
- Use the monthly totals to track business growth
- Keep your bank balance updated for accurate cash flow tracking

### 📦 **Inventory Management**

- Set realistic minimum stock levels
- Pay attention to red low-stock warnings
- Regular inventory updates help prevent stockouts

### 🔍 **Data Organization**

- Use descriptive names for items and expenses
- Be consistent with category selections
- Use the search function to quickly find specific records

## 🛠️ Technical Details

### Database Architecture

- **SQLite Database**: File-based database stored as `business_data.db`
- **RESTful API**: Express.js server with REST endpoints
- **Real-time Updates**: Dashboard updates automatically with new data

### API Endpoints

- `GET /api/sales` - Get all sales
- `POST /api/sales` - Add new sale
- `DELETE /api/sales/:id` - Delete sale
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Add new expense
- `DELETE /api/expenses/:id` - Delete expense
- `GET /api/inventory` - Get all inventory
- `POST /api/inventory` - Add inventory item
- `DELETE /api/inventory/:id` - Delete inventory item
- `GET /api/dashboard/:year/:month` - Get dashboard data
- `GET /api/settings/:key` - Get setting value
- `POST /api/settings/:key` - Update setting value

### Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

### File Structure

```
business-manager/
├── index.html              # Main HTML file
├── styles.css              # Styling and layout
├── script.js               # Original localStorage version
├── script-api.js           # New database version
├── server.js               # Express.js API server
├── package.json            # Node.js dependencies
├── business_data.db        # SQLite database (created automatically)
├── scripts/
│   ├── init-database.js    # Database initialization
│   └── migrate-localstorage.js # Migration tool
└── README.md               # This documentation
```

## 🔒 Privacy & Security

- **Local Database**: All data is stored in a local SQLite file
- **No External Servers**: Runs completely on your local machine
- **No Data Sharing**: Your business data never leaves your computer
- **Private**: Only you can access your data

## 🆘 Troubleshooting

### Common Issues

**Q: The server won't start!**
A: Make sure you have Node.js installed and run `npm install` first.

**Q: I can't see my old data!**
A: You need to migrate your localStorage data using the migration script.

**Q: The website shows "Network error"!**
A: Make sure the server is running on `http://localhost:3000`.

**Q: My data disappeared!**
A: Check that the `business_data.db` file exists and hasn't been deleted.

**Q: The website looks broken on my phone.**
A: Make sure you're accessing the correct URL (`http://localhost:3000`).

### Development Commands

```bash
# Install dependencies
npm install

# Initialize database
npm run init-db

# Start server
npm start

# Start in development mode (auto-restart)
npm run dev

# Migrate localStorage data
npm run migrate
```

## 📞 Support

For questions or issues:

1. Check this README for common solutions
2. Ensure you have Node.js installed
3. Make sure the server is running
4. Check the console for error messages

## 🎉 Success Stories

_"This upgrade to database storage has made my business management so much more reliable! No more worrying about losing data."_ - Business Owner

_"The migration was seamless and now I have all my historical data in a proper database."_ - Snow Ice Vendor

## 📄 License

This project is open source and available under the MIT License.

---

**Made with ❤️ for J&J Trini Island Treats**

_Keep your business organized and profitable!_ 🏝️🍧

## 🔄 Version History

### v2.0.0 (Current)
- ✅ Added SQLite database storage
- ✅ RESTful API backend
- ✅ Migration tools for localStorage data
- ✅ Improved data reliability
- ✅ Better error handling

### v1.0.0
- ✅ Basic localStorage functionality
- ✅ Sales, expenses, and inventory management
- ✅ CSV import/export
- ✅ Dashboard with financial overview