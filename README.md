# BudgetWise — Setup Guide

## 📁 File Structure

```
budgetwise/
├── index.html          ← Main frontend page
├── style.css           ← All styles
├── app.js              ← Frontend logic
└── api/
    ├── config.php      ← DB connection (edit credentials here)
    ├── schema.sql      ← Run this in phpMyAdmin first!
    ├── auth/
    │   ├── login.php
    │   └── register.php
    └── plans/
        ├── save.php
        └── list.php
```

---

## 🚀 Step-by-Step Setup

### 1. Set up phpMyAdmin / MySQL

1. Make sure **XAMPP** (or WAMP/MAMP) is running with Apache + MySQL
2. Open **phpMyAdmin** → `http://localhost/phpmyadmin`
3. Click **"SQL"** tab at the top
4. Open `api/schema.sql`, copy ALL the content, paste it in the SQL tab
5. Click **"Go"** — this creates the `budgetwise` database and all tables

### 2. Deploy files to your local server

Copy the entire `budgetwise/` folder to your web server root:
- **XAMPP on Windows**: `C:\xampp\htdocs\budgetwise\`
- **XAMPP on Mac/Linux**: `/opt/lampp/htdocs/budgetwise/`
- **WAMP**: `C:\wamp64\www\budgetwise\`

### 3. Configure database credentials

Open `api/config.php` and update if needed:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'budgetwise');
define('DB_USER', 'root');       // your MySQL username
define('DB_PASS', '');           // your MySQL password
```

### 4. Set the API URL in the frontend

Open `app.js` and update line 8:
```javascript
const API_BASE = 'http://localhost/budgetwise/api';
```
Change `budgetwise` to match your folder name if different.

### 5. Open the website

Go to: `http://localhost/budgetwise/index.html`

---

## ✅ Features

| Feature | Description |
|---|---|
| 🔐 Registration | Create account with name, email, password, currency |
| 🔑 Login | Secure login with bcrypt-hashed passwords |
| 📊 Dashboard | Overview stats + recent plans |
| 💰 Budget Planner | Enter income → select expenses → generate plan |
| 📋 Expense Sidebar | 15+ categories with % allocation |
| 💡 Smart Advice | Personalized financial tips per plan |
| 💾 Save Plans | Plans saved to MySQL via PHP API |
| 📁 History | View all past budget plans |
| 🌐 Multi-currency | RWF, USD, EUR, KES, UGX, TZS |
| 📱 Offline fallback | Works in demo mode without PHP backend |

---

## 🗄️ Database Tables

### `users`
| Column | Type | Description |
|---|---|---|
| id | INT | Auto-increment primary key |
| firstname | VARCHAR(80) | First name |
| lastname | VARCHAR(80) | Last name |
| email | VARCHAR(180) | Unique email |
| password | VARCHAR(255) | bcrypt hash |
| currency | VARCHAR(10) | Preferred currency |
| created_at | TIMESTAMP | Registration date |

### `budget_plans`
| Column | Type | Description |
|---|---|---|
| id | INT | Auto-increment primary key |
| user_id | INT | Foreign key → users.id |
| plan_name | VARCHAR(150) | Name of the plan |
| period | ENUM | monthly / weekly / annual |
| income_type | VARCHAR(60) | salary / freelance / etc. |
| income | DECIMAL | Total income amount |
| currency | VARCHAR(10) | Currency used |
| expenses | JSON | Array of expense categories |
| total_expenses | DECIMAL | Sum of all expenses |
| remaining | DECIMAL | Income - expenses |
| savings_percentage | DECIMAL | % left as savings |
| notes | TEXT | Optional notes |
| created_at | TIMESTAMP | Plan creation date |

---

## 🔧 Troubleshooting

**"PHP backend not connected"** — Check that XAMPP is running and the `API_BASE` URL is correct.

**"Database connection failed"** — Verify credentials in `api/config.php` and that the `budgetwise` database exists.

**CORS errors** — Make sure files are served through XAMPP, not opened directly as `file://`.

**Plans not saving** — Open browser DevTools → Network tab → check the API response for error messages.
