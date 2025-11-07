# 🚀 Upgrade Guide: localStorage to Database

This guide will help you upgrade your J&J Trini Island Treats Business Manager from localStorage to database storage.

## 🎯 What's New in v2.0

- **SQLite Database**: Reliable file-based database storage
- **RESTful API**: Modern backend architecture
- **Better Performance**: Faster data operations
- **Data Reliability**: No more localStorage limitations
- **Migration Tools**: Easy transition from old system

## 📋 Prerequisites

- **Node.js** (version 14 or higher) - [Download here](https://nodejs.org/)
- Your existing business data (if any)

## 🔧 Quick Setup (Recommended)

### Option 1: Automated Setup

**Windows:**
1. Double-click `setup.bat`
2. Follow the prompts
3. Run `npm start`
4. Open `http://localhost:3000`

**Mac/Linux:**
1. Run `./setup.sh` in terminal
2. Follow the prompts
3. Run `npm start`
4. Open `http://localhost:3000`

### Option 2: Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Initialize database:**
   ```bash
   npm run init-db
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open your browser to:** `http://localhost:3000`

## 📦 Migrating Your Existing Data

If you have data in the old localStorage version, follow these steps:

### Step 1: Export Your Data

1. Open your **old version** (the one with `script.js`)
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Copy and paste this command:
   ```javascript
   JSON.stringify({
     sales: JSON.parse(localStorage.getItem("snowIce_sales") || "[]"),
     expenses: JSON.parse(localStorage.getItem("snowIce_expenses") || "[]"),
     inventory: JSON.parse(localStorage.getItem("snowIce_inventory") || "[]"),
     bankBalance: parseFloat(localStorage.getItem("snowIce_bankBalance") || "0")
   })
   ```
5. Copy the output and save it as `my-backup.json`

### Step 2: Import to New Database

1. Make sure the new server is running (`npm start`)
2. Run the migration script:
   ```bash
   node scripts/migrate-localstorage.js my-backup.json
   ```
3. Refresh your browser - your data should now be visible!

## 🔄 Switching Between Versions

### To Use Database Version (Recommended):
- Use `script-api.js` (already set in `index.html`)
- Run `npm start` to start the server
- Open `http://localhost:3000`

### To Use localStorage Version (Legacy):
- Change `index.html` line 389 from `script-api.js` to `script.js`
- Open `index.html` directly in browser (no server needed)

## 🗂️ File Structure

```
your-project/
├── index.html                    # Main HTML file
├── styles.css                    # Styling
├── script.js                     # OLD: localStorage version
├── script-api.js                 # NEW: database version
├── server.js                     # Backend API server
├── package.json                  # Dependencies
├── business_data.db              # Database file (auto-created)
├── setup.bat                     # Windows setup script
├── setup.sh                      # Mac/Linux setup script
└── scripts/
    ├── init-database.js          # Database initialization
    └── migrate-localstorage.js   # Data migration tool
```

## 🚨 Important Notes

1. **Backup First**: Always backup your data before upgrading
2. **Keep Both Versions**: Don't delete the old files until you're sure everything works
3. **Server Required**: The new version needs the server running
4. **Port 3000**: Make sure port 3000 isn't used by other applications

## 🆘 Troubleshooting

### "Cannot find module" errors
- Run `npm install` to install dependencies

### "Port 3000 already in use"
- Stop other applications using port 3000
- Or change the port in `server.js` line 8

### "Database connection failed"
- Run `npm run init-db` to initialize the database

### "Network error" in browser
- Make sure the server is running (`npm start`)
- Check the URL is `http://localhost:3000`

### Migration script fails
- Check your JSON file format
- Make sure the server is running before migration

## ✅ Verification Checklist

After setup, verify these work:

- [ ] Server starts without errors
- [ ] Browser opens to `http://localhost:3000`
- [ ] Dashboard shows (even if empty)
- [ ] Can add a new sale
- [ ] Can add a new expense
- [ ] Can add inventory item
- [ ] Data persists after page refresh
- [ ] Old data migrated successfully (if applicable)

## 🎉 You're Done!

Your business manager is now upgraded to use a proper database! The new system is more reliable, faster, and easier to maintain.

### Next Steps:
1. Test all functionality
2. Train any users on the new system
3. Set up regular backups of `business_data.db`
4. Consider running the server as a service for production use

---

**Need Help?** Check the main README.md for detailed documentation.
