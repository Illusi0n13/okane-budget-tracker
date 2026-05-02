# 🌸 Okane Budget Tracker

A mobile-first, multi-user personal finance tracking web application built with Python Flask and MySQL. Track daily expenses and income, set monthly budgets, and get a full yearly financial summary — all from your phone browser.

---

## Features

- **Multi-user accounts** — each user signs up with their own username and password, data is fully isolated
- **Expense tracking** — log daily expenses across 12 categories (Bus, Cab, Metro, Food, Theater, Café, Shopping, Medical, Gym, Online, Grocery, Other)
- **Income tracking** — log income across 6 categories (Salary, Freelance, Pocket Money, Gift, Returns, Other)
- **Monthly budget** — set a monthly budget and see real-time remaining balance highlighted front and center
- **Progress bar** — visual budget usage bar that turns yellow at 70% and red at 90%
- **Inline edit & delete** — edit description or amount, or delete any entry directly from the log
- **Category breakdown** — proportional bar chart of spending per category
- **Day grouping** — entries grouped by date with daily totals
- **Yearly summary** — 12-month overview with net savings, savings rate %, average monthly spend, and highest spending month
- **Mobile PWA** — installable on Android and iPhone home screen, works like a native app
- **Anime aesthetic** — dark themed UI with floating sakura particles and animated characters
- **Offline mode** — standalone HTML version using IndexedDB that works with no server

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask, Flask-CORS |
| Database | MySQL |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Auth | Session-based, SHA-256 password hashing |
| Offline version | IndexedDB, Web Crypto API, PWA |

---

## Project Structure

```
okane_budget_tracker/
├── app.py                  # Flask backend — all API routes and DB logic
├── requirements.txt        # Python dependencies
├── setup.sql               # MySQL schema (auto-created by app.py on first run)
├── .env.example            # Environment variable template
├── .gitignore
├── okane_mobile.html       # Standalone offline PWA version (no server needed)
└── templates/
    ├── login.html          # Login and signup page
    └── app.html            # Main app dashboard
```

---

## Getting Started

### Prerequisites

- Python 3.8 or higher
- MySQL 8.0 or higher
- pip

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/okane-budget-tracker.git
cd okane-budget-tracker
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your MySQL credentials:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=okane_tracker
SECRET_KEY=any_random_string
```

Or edit `app.py` directly — find `DB_CONFIG` around line 15 and set your password there.

### 4. Run the app

```bash
python app.py
```

You should see:
```
✅ Database ready!
* Running on http://0.0.0.0:5000
```

The database and tables are created automatically on first run.

### 5. Open in browser

```
http://localhost:5000
```

---

## Using on Mobile (same Wi-Fi)

1. Find your computer's IP address
   - Windows: `ipconfig` → look for IPv4 Address
   - Mac/Linux: `ifconfig` or `hostname -I`

2. On your phone browser, open:
   ```
   http://YOUR_IP:5000
   ```

3. Add to home screen
   - Android Chrome: tap ⋮ menu → "Add to Home Screen"
   - iPhone Safari: tap Share → "Add to Home Screen"

---

## Offline Version (No Server Required)

Open `okane_mobile.html` directly in your phone browser — no Python, no MySQL, no Wi-Fi needed.

Data is stored permanently using **IndexedDB** (not localStorage), so it survives:
- Closing the browser tab
- Restarting the phone
- Clearing browser cache

Multiple people can use it on the same device — each person creates their own account with a username and password.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/signup` | Create a new user account |
| POST | `/api/login` | Log in and start a session |
| POST | `/api/logout` | End the session |
| GET | `/api/budget?month=YYYY-MM` | Get monthly budget for logged-in user |
| POST | `/api/budget` | Set or update monthly budget |
| GET | `/api/entries?month=YYYY-MM` | Get all entries for a month |
| POST | `/api/entries` | Add a new expense or income entry |
| PUT | `/api/entries/<id>` | Edit an existing entry |
| DELETE | `/api/entries/<id>` | Delete an entry |
| GET | `/api/summary?month=YYYY-MM` | Get monthly summary with totals and breakdown |
| GET | `/api/year?year=YYYY` | Get full year data across all 12 months |

---

## Screenshots

> Dashboard shows remaining balance front and center, with spending progress, category breakdown, and recent transaction log.

---

## License

MIT License — free to use, modify, and distribute.

---

## Author

Built with 🌸 — feel free to star the repo if you found it useful!
