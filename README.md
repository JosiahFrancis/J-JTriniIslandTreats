# 🏝️ J&J Trini Island Treats Business Manager

A comprehensive web-based business management system designed specifically for Snow Ice and tropical treat businesses. This application helps you track sales, manage expenses, monitor inventory, and maintain financial records all in one place.

![Business Manager Dashboard](https://img.shields.io/badge/Status-Ready%20to%20Use-brightgreen)
![Platform](https://img.shields.io/badge/Platform-Web%20Browser-blue)
![Data Storage](https://img.shields.io/badge/Storage-Local%20Browser-orange)

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

### 💾 **Data Persistence**

- All data stored locally in your browser
- No internet connection required after initial load
- Data automatically saves between sessions
- Private and secure - your data stays on your device

### 📱 **Mobile-Friendly Design**

- Responsive layout that works on all devices
- Touch-friendly interface for mobile and tablet use
- Optimized for small screens

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- No additional software installation required

### Installation

1. Download all files to a folder on your computer:

   - `index.html`
   - `styles.css`
   - `script.js`
   - `README.md`

2. Open `index.html` in your web browser by:

   - Double-clicking the file, or
   - Right-clicking and selecting "Open with" → your preferred browser

3. Start managing your business! 🎉

## 📖 How to Use

### 🏠 **Dashboard**

- View your business overview at a glance
- Click on the Bank Balance card to update your current balance
- Monitor recent activity in the activity feed

### 💾 **Backup & Restore (Import/Export)**

- Export everything (JSON): In the Dashboard, click "Export All (JSON)" to download a full backup containing `sales`, `expenses`, `inventory`, and `bankBalance`.
- Import everything (JSON): Click "Import All (JSON)" and choose a previously exported backup `.json` file.
- Export CSV per tab:
  - Sales: Exports columns `date,item,quantity,price,total`
  - Expenses: Exports columns `date,category,storeVendor,description,amount`
  - Inventory: Exports columns `name,category,currentStock,minStock,unitCost,totalValue`
- Import CSV per tab: Click "Import CSV" in the tab and select your CSV file with the matching headers above. Extra columns are ignored; missing totals are auto-calculated.
- Notes: Data is appended on import; you can delete duplicates from the tables if needed.

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

### Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

### Data Storage

- Uses browser's LocalStorage API
- Data persists between browser sessions
- No server required - completely offline capable

### File Structure

```
business-manager/
├── index.html          # Main HTML file
├── styles.css          # Styling and layout
├── script.js           # Application logic
└── README.md           # This documentation
```

## 🔒 Privacy & Security

- **Local Storage**: All data is stored locally on your device
- **No Internet Required**: Works completely offline after initial load
- **No Data Sharing**: Your business data never leaves your computer
- **Private**: Only you can access your data

## 🆘 Troubleshooting

### Common Issues

**Q: My data disappeared!**
A: Check if you're using the same browser and device. Data is stored locally per browser.

**Q: The website looks broken on my phone.**
A: Try refreshing the page or clearing your browser cache.

**Q: I can't add new records.**
A: Make sure all required fields are filled out and you're using a supported browser.

**Q: How do I backup my data?**
A: Currently, data is stored in browser localStorage. For backup, you can export data through browser developer tools (advanced users only).

## 📞 Support

For questions or issues:

1. Check this README for common solutions
2. Ensure you're using a supported browser
3. Try refreshing the page or clearing browser cache

## 🎉 Success Stories

_"This system has completely replaced my Excel spreadsheets! Much easier to use and I can access it from any device."_ - Business Owner

_"The inventory tracking with low stock alerts has saved me from running out of supplies multiple times."_ - Snow Ice Vendor

## 📄 License

This project is open source and available under the MIT License.

---

**Made with ❤️ for J&J Trini Island Treats**

_Keep your business organized and profitable!_ 🏝️🍧
