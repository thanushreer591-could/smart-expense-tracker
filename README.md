# 💰 Smart Expense Tracker for Students

A beginner-friendly expense tracker built with **plain HTML, CSS, and JavaScript**.
No frameworks, no paid APIs, no installation required to use the app itself.

## ✨ Features

- Modern dashboard with cards for **Total Income**, **Total Expenses**, **Remaining Balance**, and **Savings**
- Add, view, edit, and delete income & expense transactions
- Fields: title, amount (₹), type (income/expense), category, and date
- Categories: Food, Transport, Education, Shopping, Bills, Entertainment, Other
- **Automatic category suggestion** based on the transaction title
- **Monthly budget** with a warning alert when you go over it
- **Savings goals** with progress bars and a "add money" button
- **Charts**: a donut chart and category bars showing spending by category
- **Filters** by date range, category, and type
- Data saved in **localStorage** (survives refresh and restart)
- **Responsive** for laptop and mobile
- Sample transactions included so the dashboard is never empty
- Input validation with helpful messages

## 📁 Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure (sidebar, cards, tables, modal) |
| `style.css`  | All the styling and responsive design |
| `script.js`  | All the logic (data, charts, validation, localStorage) |
| `serve.ps1`  | Optional tiny local server (no installs needed) |

---

## ▶️ How to run on Windows 11

### Option A — Just open it (easiest, no localhost)

1. Open this folder: `C:\Users\Hp\Documents\Default Project\smart-expense-tracker`
2. Double-click **`index.html`** (or right-click → Open with → Microsoft Edge / Chrome)

That's it. The app runs directly in your browser.

> Note: the app saves data in `localStorage`. For the best experience (and so the
> data is stored under the `localhost` address), use Option B or C below.

### Option B — Localhost with the included PowerShell server (no installs)

This uses the `serve.ps1` file — nothing to install.

1. Open **PowerShell** (press `Win`, type "PowerShell").
2. Go to the project folder by copying and pasting this command, then press Enter:

   ```powershell
   cd "C:\Users\Hp\Documents\Default Project\smart-expense-tracker"
   ```

3. Start the server:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\serve.ps1
   ```

4. Open your browser and go to:

   ```
   http://localhost:8000
   ```

5. To stop the server, press `Ctrl + C` in the PowerShell window.
   (If port 8000 is busy, run `.\serve.ps1 -Port 8080` and use `http://localhost:8080`.)

### Option C — Localhost with Python (if you install Python)

1. Install Python from <https://www.python.org/downloads/> (tick **"Add python.exe to PATH"**).
2. Open PowerShell and run:

   ```powershell
   cd "C:\Users\Hp\Documents\Default Project\smart-expense-tracker"
   python -m http.server 8000
   ```

3. Visit `http://localhost:8000` in your browser.

### Option D — VS Code Live Server (if you use VS Code)

1. Open the `smart-expense-tracker` folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` → **Open with Live Server**.

---

## 🧹 Resetting the data

To start fresh, open the browser's DevTools (F12) → **Application** → **Local Storage**,
delete the keys that start with `set.`, then refresh.

## 📝 Notes

- All amounts are in **Indian Rupees (₹)**.
- Everything is stored **only in your browser** — nothing is sent to any server.
