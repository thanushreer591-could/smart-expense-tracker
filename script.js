/* ==========================================================================
   Smart Expense Tracker for Students — script.js
   --------------------------------------------------------------------------
   Everything is plain vanilla JavaScript (no libraries, no APIs, no cost).
   Data is stored in the browser using localStorage so it survives refresh.

   Sections:
     1. Constants & helpers
     2. State (load / save)
     3. Sample data (first run only)
     4. Category suggestion
     5. Navigation between views
     6. Rendering: summary, budget, charts, tables, goals
     7. Transactions: add / edit / delete
     8. Filters
     9. Budget
    10. Goals
    11. Modal, toast, validation
    12. Start the app
   ========================================================================== */

/* ---------- 1. Constants & helpers ---------- */

// The categories allowed in the app.
const CATEGORIES = ['Food', 'Transport', 'Education', 'Shopping', 'Bills', 'Entertainment', 'Other'];

// A colour for each category (used by the charts).
const CATEGORY_COLORS = {
  Food: '#f97316',
  Transport: '#0ea5e9',
  Education: '#8b5cf6',
  Shopping: '#ec4899',
  Bills: '#14b8a6',
  Entertainment: '#f59e0b',
  Other: '#94a3b8'
};

// localStorage keys (one place to change if needed).
const STORE = {
  transactions: 'set.transactions',
  budget: 'set.budget',
  goals: 'set.goals',
  seeded: 'set.seeded'
};

// Tiny shortcuts.
const el = (id) => document.getElementById(id);
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Format a number as Indian Rupees, e.g. 1234.5 -> "₹1,234.5"
function money(n) {
  const num = Number(n) || 0;
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

// Short money for the chart centre, e.g. 12500 -> "₹12.5k"
function shortMoney(n) {
  const num = Number(n) || 0;
  if (num >= 100000) return '₹' + (num / 100000).toFixed(1) + 'L';
  if (num >= 1000) return '₹' + (num / 1000).toFixed(1) + 'k';
  return '₹' + num.toFixed(0);
}

// Today as "YYYY-MM-DD" (the format <input type="date"> wants).
function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// A date N days ago as "YYYY-MM-DD" (used to build sample data).
function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// Friendly date for tables, e.g. "17 Oct 2026"
function prettyDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Is an ISO date in the current calendar month?
function isThisMonth(iso) {
  const d = new Date(iso + 'T00:00:00');
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

// A unique-ish id.
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Escape text before putting it into HTML (keeps the app safe).
function escapeHTML(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/* ---------- 2. State (load / save) ---------- */

let transactions = [];
let budget = 0;
let goals = [];

function loadState() {
  try {
    transactions = JSON.parse(localStorage.getItem(STORE.transactions)) || [];
  } catch { transactions = []; }

  try {
    budget = Number(localStorage.getItem(STORE.budget)) || 0;
  } catch { budget = 0; }

  try {
    goals = JSON.parse(localStorage.getItem(STORE.goals)) || [];
  } catch { goals = []; }
}

function saveTransactions() {
  localStorage.setItem(STORE.transactions, JSON.stringify(transactions));
}
function saveBudget() {
  localStorage.setItem(STORE.budget, String(budget));
}
function saveGoals() {
  localStorage.setItem(STORE.goals, JSON.stringify(goals));
}

/* ---------- 3. Sample data (first run only) ---------- */

function seedSampleData() {
  if (localStorage.getItem(STORE.seeded) === 'yes') return;

  transactions = [
    { id: makeId(), title: 'Pocket Money',    amount: 5000, type: 'income',  category: 'Other',         date: daysAgoISO(12) },
    { id: makeId(), title: 'Scholarship',     amount: 3000, type: 'income',  category: 'Education',     date: daysAgoISO(20) },
    { id: makeId(), title: 'Canteen Lunch',   amount: 120,  type: 'expense', category: 'Food',          date: daysAgoISO(1)  },
    { id: makeId(), title: 'Bus Pass',        amount: 500,  type: 'expense', category: 'Transport',     date: daysAgoISO(5)  },
    { id: makeId(), title: 'Notebooks',       amount: 240,  type: 'expense', category: 'Education',     date: daysAgoISO(7)  },
    { id: makeId(), title: 'Movie Night',     amount: 350,  type: 'expense', category: 'Entertainment', date: daysAgoISO(9)  },
    { id: makeId(), title: 'Mobile Recharge', amount: 299,  type: 'expense', category: 'Bills',         date: daysAgoISO(10) },
    { id: makeId(), title: 'New T-shirt',     amount: 799,  type: 'expense', category: 'Shopping',      date: daysAgoISO(13) }
  ];

  budget = 8000;

  goals = [
    { id: makeId(), name: 'New Laptop',     target: 50000, saved: 12000 },
    { id: makeId(), name: 'Emergency Fund', target: 10000, saved: 4500 }
  ];

  saveTransactions();
  saveBudget();
  saveGoals();
  localStorage.setItem(STORE.seeded, 'yes');
}

/* ---------- 4. Category suggestion ---------- */

// Keywords -> category. If a title contains any of these words we suggest it.
const KEYWORDS = {
  Food: ['food', 'lunch', 'dinner', 'breakfast', 'snack', 'coffee', 'tea', 'pizza', 'burger',
         'canteen', 'mess', 'restaurant', 'swiggy', 'zomato', 'eat', 'meal', 'cafe', 'maggi'],
  Transport: ['bus', 'train', 'metro', 'auto', 'taxi', 'cab', 'uber', 'ola', 'fuel', 'petrol',
              'diesel', 'bike', 'ticket', 'travel', 'transport', 'rickshaw', 'parking', 'flight'],
  Education: ['book', 'books', 'tuition', 'fee', 'fees', 'course', 'class', 'exam', 'stationery',
              'notebook', 'pen', 'pencil', 'college', 'school', 'library', 'udemy', 'coursera', 'semester'],
  Shopping: ['shop', 'shopping', 'clothes', 'shirt', 'tshirt', 'shoes', 'amazon', 'flipkart',
             'dress', 'bag', 'product', 'jeans', 'watch', 'headphone'],
  Bills: ['bill', 'electricity', 'water', 'internet', 'wifi', 'mobile', 'recharge', 'rent',
          'gas', 'phone', 'broadband', 'dth'],
  Entertainment: ['movie', 'movies', 'netflix', 'game', 'gaming', 'spotify', 'party', 'concert',
                  'fun', 'outing', 'picnic', 'prime', 'hotstar', 'youtube']
};

// Return the best matching category for a title, or "Other".
function suggestCategory(title) {
  const text = String(title || '').toLowerCase();
  if (!text.trim()) return '';

  for (const category of Object.keys(KEYWORDS)) {
    for (const word of KEYWORDS[category]) {
      if (text.includes(word)) return category;
    }
  }
  return 'Other';
}

/* ---------- 5. Navigation ---------- */

const VIEW_META = {
  dashboard:    ['Dashboard', 'A quick look at your money this month'],
  transactions: ['Transactions', 'Add, filter and manage your records'],
  budget:       ['Budget', 'Plan your monthly spending'],
  goals:        ['Savings Goals', 'Track your progress towards a target']
};

function showView(name) {
  $$('.view').forEach((v) => v.classList.remove('active'));
  const target = el('view-' + name);
  if (target) target.classList.add('active');

  $$('.nav-item').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === name);
  });

  const meta = VIEW_META[name] || VIEW_META.dashboard;
  el('viewTitle').textContent = meta[0];
  el('viewSubtitle').textContent = meta[1];

  // Close the mobile sidebar after choosing a section.
  el('sidebar').classList.remove('open');
  el('overlay').classList.remove('show');

  if (name === 'dashboard') drawDonutChart();
}

/* ---------- 6. Rendering ---------- */

// Money totals across ALL transactions.
function getTotals() {
  let income = 0, expense = 0;
  transactions.forEach((t) => {
    if (t.type === 'income') income += Number(t.amount) || 0;
    else expense += Number(t.amount) || 0;
  });
  return { income, expense, balance: income - expense };
}

// Expenses of the current month (used for the budget).
function getMonthExpense() {
  return transactions
    .filter((t) => t.type === 'expense' && isThisMonth(t.date))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

// Total money set aside in savings goals.
function getTotalSaved() {
  return goals.reduce((sum, g) => sum + (Number(g.saved) || 0), 0);
}

// Expenses grouped by category, biggest first.
function getExpensesByCategory() {
  const map = {};
  transactions.forEach((t) => {
    if (t.type !== 'expense') return;
    map[t.category] = (map[t.category] || 0) + (Number(t.amount) || 0);
  });
  return Object.keys(map)
    .map((category) => ({ category, value: map[category], color: CATEGORY_COLORS[category] || '#94a3b8' }))
    .sort((a, b) => b.value - a.value);
}

function renderSummary() {
  const { income, expense, balance } = getTotals();
  el('totalIncome').textContent = money(income);
  el('totalExpense').textContent = money(expense);
  el('balance').textContent = money(balance);
  el('savings').textContent = money(getTotalSaved());

  // Colour the balance red when you have overspent.
  el('balance').style.color = balance < 0 ? 'var(--expense)' : '';
}

function renderBudget() {
  const spent = getMonthExpense();
  const hasBudget = budget > 0;
  const percent = hasBudget ? Math.min((spent / budget) * 100, 100) : 0;
  const over = hasBudget && spent > budget;
  const warn = hasBudget && !over && percent >= 80;

  // Dashboard progress bar
  const bar = el('budgetBar');
  bar.style.width = percent + '%';
  bar.className = 'progress-bar' + (over ? ' over' : warn ? ' warn' : '');

  // Budget tab progress bar
  const bar2 = el('budgetBar2');
  bar2.style.width = percent + '%';
  bar2.className = 'progress-bar' + (over ? ' over' : warn ? ' warn' : '');

  // Texts
  if (!hasBudget) {
    el('budgetPill').textContent = 'Not set';
    el('budgetPill').className = 'pill';
    el('budgetText').textContent = 'Set a monthly budget in the Budget tab to track your spending.';
    el('budgetStatusText').textContent = 'No budget set yet.';
  } else {
    const left = budget - spent;
    el('budgetPill').textContent = over ? 'Over budget' : `${Math.round(percent)}% used`;
    el('budgetPill').className = 'pill ' + (over ? 'danger' : warn ? 'danger' : 'ok');
    el('budgetText').textContent =
      `You have spent ${money(spent)} of ${money(budget)} this month. ` +
      (over ? `You are over by ${money(spent - budget)}.` : `${money(left)} left.`);
    el('budgetStatusText').textContent = over
      ? `⚠️ You are ${money(spent - budget)} over your budget this month.`
      : `You still have ${money(left)} left to spend this month.`;
  }

  // Budget tab mini stats
  el('budgetMini').textContent = money(budget);
  el('spentMini').textContent = money(spent);
  el('leftMini').textContent = money(budget - spent);
  el('budgetInput').value = hasBudget ? budget : '';
}

// Show a red banner on the dashboard when the budget is exceeded this month.
function renderBudgetAlert() {
  const banner = el('budgetAlert');
  const spent = getMonthExpense();
  if (budget > 0 && spent > budget) {
    banner.classList.remove('hidden');
    banner.innerHTML = `⚠️ <span>Budget alert! You have spent <strong>${money(spent)}</strong> this month, which is over your <strong>${money(budget)}</strong> budget.</span>`;
  } else {
    banner.classList.add('hidden');
  }
}

function renderCharts() {
  const data = getExpensesByCategory();
  const total = data.reduce((s, d) => s + d.value, 0);

  // --- Legend (donut) ---
  const legend = el('donutLegend');
  if (!data.length) {
    legend.innerHTML = '<li class="muted">No expenses yet.</li>';
  } else {
    legend.innerHTML = data.map((d) => `
      <li>
        <span class="dot" style="background:${d.color}"></span>
        <span class="name">${escapeHTML(d.category)}</span>
        <span class="val">${money(d.value)}</span>
      </li>`).join('');
  }

  // --- Horizontal bars ---
  const bars = el('categoryBars');
  if (!data.length) {
    bars.innerHTML = '<p class="empty">No expenses to show yet.</p>';
  } else {
    bars.innerHTML = data.map((d) => {
      const pct = total ? (d.value / total) * 100 : 0;
      return `
        <div class="bar-row">
          <div class="bar-top">
            <span>${escapeHTML(d.category)}</span>
            <span><strong>${money(d.value)}</strong> · ${pct.toFixed(0)}%</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:${d.color}"></div>
          </div>
        </div>`;
    }).join('');
  }

  drawDonutChart();
}

// Draw the donut chart with the Canvas API (no library needed).
function drawDonutChart() {
  const canvas = el('donutChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 220;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2, cy = size / 2, outer = 92, inner = 60;
  const data = getExpensesByCategory();
  const total = data.reduce((s, d) => s + d.value, 0);

  // Empty state: a light grey ring.
  if (total <= 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI * 2);
    ctx.arc(cx, cy, inner, 0, Math.PI * 2, true);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 13px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No expenses yet', cx, cy);
    return;
  }

  // Draw one slice per category.
  let start = -Math.PI / 2;
  data.forEach((d) => {
    const slice = (d.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, outer, start, start + slice);
    ctx.arc(cx, cy, inner, start + slice, start, true);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();
    start += slice;
  });

  // Centre labels.
  ctx.fillStyle = '#64748b';
  ctx.font = '600 12px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Total Spent', cx, cy - 11);
  ctx.fillStyle = '#1e293b';
  ctx.font = '700 16px Segoe UI, sans-serif';
  ctx.fillText(shortMoney(total), cx, cy + 10);
}

// Newest first.
function sortedTransactions() {
  return [...transactions].sort((a, b) => {
    if (a.date === b.date) return (b.id > a.id ? 1 : -1);
    return a.date < b.date ? 1 : -1;
  });
}

function transactionRow(t, withActions) {
  const isIncome = t.type === 'income';
  const amountClass = isIncome ? 'income' : 'expense';
  const sign = isIncome ? '+' : '−';
  const actions = withActions
    ? `<td class="center">
         <button class="del-btn" data-edit="${t.id}" style="border-color:#c7d2fe;color:#4f46e5">Edit</button>
         <button class="del-btn" data-del="${t.id}">Delete</button>
       </td>`
    : '';
  return `
    <tr>
      <td>${prettyDate(t.date)}</td>
      <td>${escapeHTML(t.title)}</td>
      <td><span class="badge">${escapeHTML(t.category)}</span></td>
      <td><span class="badge ${amountClass}">${isIncome ? 'Income' : 'Expense'}</span></td>
      <td class="right amount ${amountClass}">${sign}${money(t.amount)}</td>
      ${actions}
    </tr>`;
}

function renderRecent() {
  const body = el('recentBody');
  const recent = sortedTransactions().slice(0, 5);
  body.innerHTML = recent.length
    ? recent.map((t) => transactionRow(t, false)).join('')
    : `<tr><td colspan="5" class="empty">No transactions yet. Click “Add Transaction” to start.</td></tr>`;
}

// Apply the current filters and render the full table.
function getFilteredTransactions() {
  const from = el('filterFrom').value;
  const to = el('filterTo').value;
  const category = el('filterCategory').value;
  const type = el('filterType').value;

  return sortedTransactions().filter((t) => {
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    if (category !== 'all' && t.category !== category) return false;
    if (type !== 'all' && t.type !== type) return false;
    return true;
  });
}

function renderTransactions() {
  const list = getFilteredTransactions();
  const body = el('transactionsBody');

  body.innerHTML = list.length
    ? list.map((t) => transactionRow(t, true)).join('')
    : `<tr><td colspan="6" class="empty">No transactions match your filters.</td></tr>`;

  const income = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  el('filterSummary').textContent =
    `Showing ${list.length} transaction${list.length === 1 ? '' : 's'} · Income ${money(income)} · Expenses ${money(expense)}`;
}

function renderGoals() {
  const list = el('goalList');
  el('goalCount').textContent = `${goals.length} goal${goals.length === 1 ? '' : 's'}`;

  if (!goals.length) {
    list.innerHTML = '<p class="empty">No goals yet. Create one on the left to start saving!</p>';
    return;
  }

  list.innerHTML = goals.map((g) => {
    const target = Number(g.target) || 0;
    const saved = Number(g.saved) || 0;
    const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
    const done = saved >= target;
    return `
      <div class="goal">
        <div class="goal-top">
          <strong>${escapeHTML(g.name)}</strong>
          <span class="pill ${done ? 'ok' : ''}">${done ? '✅ Done' : Math.round(pct) + '%'}</span>
        </div>
        <div class="goal-meta">${money(saved)} of ${money(target)} saved</div>
        <div class="progress">
          <div class="progress-bar ${done ? '' : pct >= 80 ? 'warn' : ''}" style="width:${pct}%"></div>
        </div>
        <div class="goal-actions">
          <input type="number" min="0" step="1" placeholder="Add ₹" data-goalAdd="${g.id}" />
          <button class="mini-add" data-goalSave="${g.id}">Add</button>
          <button class="mini-del" data-goalDel="${g.id}">Delete</button>
        </div>
      </div>`;
  }).join('');
}

function renderAll() {
  renderSummary();
  renderBudget();
  renderBudgetAlert();
  renderCharts();
  renderRecent();
  renderTransactions();
  renderGoals();
}

/* ---------- 7. Transactions: add / edit / delete ---------- */

let editingId = null; // null = adding, otherwise the id being edited.

// Fill the category dropdown once at startup.
function buildCategoryOptions() {
  const txSelect = el('txCategory');
  txSelect.innerHTML = CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');

  const filterSelect = el('filterCategory');
  filterSelect.innerHTML = '<option value="all">All categories</option>' +
    CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');
}

function openModal(transaction) {
  editingId = transaction ? transaction.id : null;
  el('modalTitle').textContent = transaction ? 'Edit Transaction' : 'Add Transaction';
  el('saveTxBtn').textContent = transaction ? 'Update Transaction' : 'Save Transaction';

  // Reset any previous errors.
  clearTxErrors();

  if (transaction) {
    el('txTitle').value = transaction.title;
    el('txAmount').value = transaction.amount;
    el('txDate').value = transaction.date;
    el('txCategory').value = transaction.category;
    const radio = document.querySelector(`input[name="txType"][value="${transaction.type}"]`);
    if (radio) radio.checked = true;
  } else {
    el('transactionForm').reset();
    el('txDate').value = todayISO();
    el('txCategory').value = 'Other';
    el('categoryHint').textContent = 'Tip: type a title and we’ll suggest a category.';
  }

  el('transactionModal').classList.add('open');
  el('transactionModal').setAttribute('aria-hidden', 'false');
  setTimeout(() => el('txTitle').focus(), 50);
}

function closeModal() {
  const modal = el('transactionModal');
  // Move focus out of the modal before hiding it. Otherwise the browser warns
  // about aria-hidden being applied to an element that still contains focus.
  if (modal.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  editingId = null;
}

function clearTxErrors() {
  ['txTitleError', 'txAmountError', 'txDateError'].forEach((id) => { el(id).textContent = ''; });
  ['txTitle', 'txAmount', 'txDate'].forEach((id) => el(id).classList.remove('invalid'));
}

// Returns true if the form is valid; otherwise shows helpful messages.
function validateTransactionForm() {
  clearTxErrors();
  let ok = true;

  const title = el('txTitle').value.trim();
  if (!title) {
    el('txTitleError').textContent = 'Please enter a title (e.g. "Bus pass").';
    el('txTitle').classList.add('invalid');
    ok = false;
  }

  const amount = Number(el('txAmount').value);
  if (!el('txAmount').value || isNaN(amount) || amount <= 0) {
    el('txAmountError').textContent = 'Enter an amount greater than ₹0.';
    el('txAmount').classList.add('invalid');
    ok = false;
  }

  if (!el('txDate').value) {
    el('txDateError').textContent = 'Please pick a date.';
    el('txDate').classList.add('invalid');
    ok = false;
  }

  return ok;
}

function handleTransactionSubmit(event) {
  event.preventDefault();
  if (!validateTransactionForm()) {
    toast('Please fix the highlighted fields.', 'error');
    return;
  }

  const data = {
    title: el('txTitle').value.trim(),
    amount: Number(el('txAmount').value),
    type: document.querySelector('input[name="txType"]:checked').value,
    category: el('txCategory').value,
    date: el('txDate').value
  };

  if (editingId) {
    const index = transactions.findIndex((t) => t.id === editingId);
    if (index > -1) transactions[index] = { ...transactions[index], ...data };
    toast('Transaction updated ✅', 'success');
  } else {
    transactions.push({ id: makeId(), ...data });
    toast('Transaction added ✅', 'success');
  }

  saveTransactions();
  closeModal();
  renderAll();
}

function deleteTransaction(id) {
  const tx = transactions.find((t) => t.id === id);
  if (!tx) return;
  if (!confirm(`Delete "${tx.title}"?`)) return;
  transactions = transactions.filter((t) => t.id !== id);
  saveTransactions();
  renderAll();
  toast('Transaction deleted', 'success');
}

function editTransaction(id) {
  const tx = transactions.find((t) => t.id === id);
  if (tx) openModal(tx);
}

/* ---------- 8. Filters ---------- */

function clearFilters() {
  el('filterFrom').value = '';
  el('filterTo').value = '';
  el('filterCategory').value = 'all';
  el('filterType').value = 'all';
  renderTransactions();
}

/* ---------- 9. Budget ---------- */

function handleBudgetSubmit(event) {
  event.preventDefault();
  el('budgetError').textContent = '';
  el('budgetInput').classList.remove('invalid');

  const value = el('budgetInput').value;
  const num = Number(value);

  if (value === '' || isNaN(num) || num < 0) {
    el('budgetError').textContent = 'Enter a valid budget of ₹0 or more.';
    el('budgetInput').classList.add('invalid');
    toast('Please enter a valid budget.', 'error');
    return;
  }

  budget = num;
  saveBudget();
  renderAll();
  toast(budget > 0 ? `Budget set to ${money(budget)} ✅` : 'Budget cleared', 'success');
}

/* ---------- 10. Goals ---------- */

function handleGoalSubmit(event) {
  event.preventDefault();
  el('goalNameError').textContent = '';
  el('goalTargetError').textContent = '';
  el('goalName').classList.remove('invalid');
  el('goalTarget').classList.remove('invalid');

  const name = el('goalName').value.trim();
  const target = Number(el('goalTarget').value);
  const saved = Number(el('goalSaved').value) || 0;
  let ok = true;

  if (!name) {
    el('goalNameError').textContent = 'Give your goal a name.';
    el('goalName').classList.add('invalid');
    ok = false;
  }
  if (!el('goalTarget').value || isNaN(target) || target <= 0) {
    el('goalTargetError').textContent = 'Target must be greater than ₹0.';
    el('goalTarget').classList.add('invalid');
    ok = false;
  }
  if (saved < 0) {
    toast('Saved amount cannot be negative.', 'error');
    ok = false;
  }
  if (!ok) return;

  goals.push({ id: makeId(), name, target, saved });
  saveGoals();
  el('goalForm').reset();
  renderAll();
  toast('Savings goal added 🎯', 'success');
}

function addToGoal(id) {
  const input = document.querySelector(`input[data-goalAdd="${id}"]`);
  const amount = Number(input ? input.value : 0);
  if (!amount || amount <= 0) {
    toast('Enter an amount to add to this goal.', 'error');
    return;
  }
  const goal = goals.find((g) => g.id === id);
  if (!goal) return;
  goal.saved = Number(goal.saved) + amount;
  saveGoals();
  renderAll();
  toast(`Added ${money(amount)} to "${goal.name}" ✅`, 'success');
}

function deleteGoal(id) {
  const goal = goals.find((g) => g.id === id);
  if (!goal) return;
  if (!confirm(`Delete goal "${goal.name}"?`)) return;
  goals = goals.filter((g) => g.id !== id);
  saveGoals();
  renderAll();
  toast('Goal deleted', 'success');
}

/* ---------- 11. Toast ---------- */

let toastTimer = null;
function toast(message, type = '') {
  const box = el('toast');
  box.textContent = message;
  box.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.className = 'toast ' + type; }, 2600);
}

/* ---------- 12. Start the app ---------- */

function setupEventListeners() {
  // --- "+ Add" buttons (event delegation) --------------------------------
  // Delegating to `document` means these buttons always work, even if the
  // markup moves around or another listener on the page fails to attach.
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('#openAddBtn, #openAddBtnTop, #openAddBtnList');
    if (addBtn) {
      e.preventDefault();
      openModal(null);
    }
  });

  // Sidebar navigation
  $$('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });
  $$('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.goto));
  });

  // Mobile menu
  el('menuBtn').addEventListener('click', () => {
    el('sidebar').classList.add('open');
    el('overlay').classList.add('show');
  });
  el('overlay').addEventListener('click', () => {
    el('sidebar').classList.remove('open');
    el('overlay').classList.remove('show');
  });

  // Close the transaction modal
  el('closeModal').addEventListener('click', closeModal);
  el('cancelModal').addEventListener('click', closeModal);
  el('transactionModal').addEventListener('click', (e) => {
    if (e.target === el('transactionModal')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el('transactionModal').classList.contains('open')) closeModal();
  });

  // Forms
  el('transactionForm').addEventListener('submit', handleTransactionSubmit);
  el('budgetForm').addEventListener('submit', handleBudgetSubmit);
  el('goalForm').addEventListener('submit', handleGoalSubmit);

  // Auto-suggest a category while typing the title
  el('txTitle').addEventListener('input', () => {
    const suggestion = suggestCategory(el('txTitle').value);
    if (suggestion) {
      el('txCategory').value = suggestion;
      el('categoryHint').textContent = `Suggested category: ${suggestion} (you can change it).`;
    } else {
      el('categoryHint').textContent = 'Tip: type a title and we’ll suggest a category.';
    }
  });

  // Filters
  ['filterFrom', 'filterTo', 'filterCategory', 'filterType'].forEach((id) => {
    el(id).addEventListener('change', renderTransactions);
  });
  el('clearFilters').addEventListener('click', clearFilters);

  // Table buttons (delete / edit) — one listener handles all rows
  el('transactionsBody').addEventListener('click', (e) => {
    const delId = e.target.getAttribute('data-del');
    const editId = e.target.getAttribute('data-edit');
    if (delId) deleteTransaction(delId);
    if (editId) editTransaction(editId);
  });

  // Goal buttons
  el('goalList').addEventListener('click', (e) => {
    const saveId = e.target.getAttribute('data-goalSave');
    const delId = e.target.getAttribute('data-goalDel');
    if (saveId) addToGoal(saveId);
    if (delId) deleteGoal(delId);
  });

  // Keep the donut sharp when the window is resized.
  window.addEventListener('resize', () => {
    if (el('view-dashboard').classList.contains('active')) drawDonutChart();
  });
}

function init() {
  loadState();
  seedSampleData();
  buildCategoryOptions();
  setupEventListeners();

  // Default filters: empty (show everything).
  clearFilters();

  renderAll();
  showView('dashboard');
}

// Run once the page is ready.
// If the script loads AFTER the DOM is already parsed (for example a cached or
// late-loaded script.js), DOMContentLoaded has already fired, so we start
// immediately instead of waiting for an event that will never come again.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
