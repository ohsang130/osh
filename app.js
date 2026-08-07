/**
 * 부부 공동 가계부 Application Logic
 * Supports LocalStorage + Google Apps Script Web App Realtime Sync
 */

// Global State
const state = {
  currentYear: 2026,
  currentMonth: 8, // 1-indexed (8 = August)
  type: 'expense', // 'expense' or 'income'
  selectedPayMethod: '현대카드',
  selectedCategory: '식비',
  editingTxId: null,
  activePayFilter: 'ALL',
  activeCategoryFilter: 'ALL',
  searchQuery: '',
  
  // Custom Tag Lists (Matched with user's image)
  payMethods: [
    '현대카드', '신한카드', '오동백', '동백', '국민카드',
    '네이버포인트', '신한포인트', '현금', '통장입금', '오국민(쿠팡)'
  ],
  categories: [
    '식비', '생활비', '관리비', '가스비', '유류비', '하이패스',
    '구독인터넷', '외식', '여행지금', '네일', '미용실',
    '교통비', '운동', '의', '주', '연금', '대출이자',
    '소영', '의료비', '예비자금', '상연용돈', '소영용돈',
    '특수생활비', '보험', '통신비', '동생', '고정비',
    '주택청약', '청년', '투자'
  ],
  
  // Monthly Budgets
  budgets: {
    '식비': 500000,
    '생활비': 300000,
    '관리비': 150000,
    '외식': 200000,
    '교통비': 100000,
    '통신비': 80000
  },

  // Transactions Master Data Array
  transactions: [],

  // Google Sheets Sync Config
  appsScriptUrl: ''
};

// Google Apps Script Sample Backend Code
const GAS_CODE_TEMPLATE = `
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var result = [];
  if (data.length > 1) {
    var headers = data[0];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = row[j];
      }
      result.push(obj);
    }
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.clear();
    var headers = ["id", "type", "date", "amount", "payMethod", "category", "memo"];
    sheet.appendRow(headers);
    for (var i = 0; i < contents.length; i++) {
      var item = contents[i];
      sheet.appendRow([item.id, item.type, item.date, item.amount, item.payMethod, item.category, item.memo]);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  }
}
`;

// Initial Sample Data (Reflecting user's screenshot sample items)
const INITIAL_SAMPLE_DATA = [
  { id: 'tx-1', type: 'income', date: '2026-08-06', amount: 1000000, payMethod: '현금', category: '급여', memo: '급여' },
  { id: 'tx-2', type: 'expense', date: '2026-08-04', amount: 20940, payMethod: '오국민(쿠팡)', category: '생활비', memo: '바디컴 대용량 필터본품' },
  { id: 'tx-3', type: 'expense', date: '2026-08-03', amount: 28990, payMethod: '오국민(쿠팡)', category: '생활비', memo: '하비티 철제슬라이딩 수납함' },
  { id: 'tx-4', type: 'expense', date: '2026-08-03', amount: 51000, payMethod: '오국민(쿠팡)', category: '식비', memo: '엽기 떡볶이 분말소스' },
  { id: 'tx-5', type: 'expense', date: '2026-08-03', amount: 4200, payMethod: '오동백', category: '의료비', memo: '소영감기' },
  { id: 'tx-6', type: 'expense', date: '2026-08-01', amount: 42550, payMethod: '오동백', category: '식비', memo: '마트 장보기' }
];

// Initialize Charts
let categoryChartInstance = null;
let payMethodChartInstance = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadStoredData();
  setupEventListeners();
  renderApp();
  initCharts();

  // If sync URL is saved, automatically fetch latest data on page load
  if (state.appsScriptUrl) {
    fetchFromGoogleSheets(true);
  }
});

// Load stored data from localStorage
function loadStoredData() {
  const savedTx = localStorage.getItem('couple_budget_transactions');
  if (savedTx) {
    try { state.transactions = JSON.parse(savedTx); } catch (e) { state.transactions = INITIAL_SAMPLE_DATA; }
  } else {
    state.transactions = INITIAL_SAMPLE_DATA;
    saveTransactions();
  }

  const savedPay = localStorage.getItem('couple_budget_pay_methods');
  if (savedPay) state.payMethods = JSON.parse(savedPay);

  const savedCat = localStorage.getItem('couple_budget_categories');
  if (savedCat) state.categories = JSON.parse(savedCat);

  const savedBudgets = localStorage.getItem('couple_budget_budgets');
  if (savedBudgets) state.budgets = JSON.parse(savedBudgets);

  // Check URL query parameters for 'sync' (so partner can open shared link directly connected)
  const urlParams = new URLSearchParams(window.location.search);
  const syncUrlParam = urlParams.get('sync');
  if (syncUrlParam) {
    state.appsScriptUrl = decodeURIComponent(syncUrlParam);
    localStorage.setItem('couple_budget_gas_url', state.appsScriptUrl);
  } else {
    const savedUrl = localStorage.getItem('couple_budget_gas_url');
    if (savedUrl) state.appsScriptUrl = savedUrl;
  }

  const currentTheme = localStorage.getItem('couple_budget_theme') || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);

  // Set default form date to today or 2026-08-07
  document.getElementById('txDate').value = '2026-08-07';
}

function saveTransactions(shouldSyncToGoogle = true) {
  localStorage.setItem('couple_budget_transactions', JSON.stringify(state.transactions));
  if (shouldSyncToGoogle) {
    syncToGoogleSheetsIfNeeded();
  }
}

// Global Event Listeners
function setupEventListeners() {
  // Theme Toggle
  document.getElementById('themeToggleBtn').addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('couple_budget_theme', newTheme);
  });

  // Month Navigation
  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    state.currentMonth--;
    if (state.currentMonth < 1) {
      state.currentMonth = 12;
      state.currentYear--;
    }
    renderApp();
  });

  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    state.currentMonth++;
    if (state.currentMonth > 12) {
      state.currentMonth = 1;
      state.currentYear++;
    }
    renderApp();
  });

  // Type Toggle (Expense / Income)
  document.getElementById('typeExpenseBtn').addEventListener('click', () => {
    state.type = 'expense';
    document.getElementById('typeExpenseBtn').classList.add('active');
    document.getElementById('typeIncomeBtn').classList.remove('active');
  });

  document.getElementById('typeIncomeBtn').addEventListener('click', () => {
    state.type = 'income';
    document.getElementById('typeIncomeBtn').classList.add('active');
    document.getElementById('typeExpenseBtn').classList.remove('active');
  });

  // Quick Amount Buttons
  document.querySelectorAll('.quick-amt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const addVal = parseInt(e.target.dataset.add, 10);
      const amountInput = document.getElementById('txAmount');
      const currentVal = parseInt(amountInput.value, 10) || 0;
      amountInput.value = currentVal + addVal;
    });
  });

  // Transaction Form Submission
  document.getElementById('transactionForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleAddOrUpdateTx();
  });

  // Search & Filters
  document.getElementById('searchInput').addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    renderTransactionList();
  });

  document.getElementById('filterPayMethod').addEventListener('change', (e) => {
    state.activePayFilter = e.target.value;
    renderTransactionList();
  });

  document.getElementById('filterCategory').addEventListener('change', (e) => {
    state.activeCategoryFilter = e.target.value;
    renderTransactionList();
  });

  document.getElementById('resetPayFilterBtn').addEventListener('click', () => {
    state.activePayFilter = 'ALL';
    state.activeCategoryFilter = 'ALL';
    state.searchQuery = '';
    document.getElementById('filterPayMethod').value = 'ALL';
    document.getElementById('filterCategory').value = 'ALL';
    document.getElementById('searchInput').value = '';
    renderTransactionList();
  });

  // Navigation Tabs
  document.querySelectorAll('.view-tab-btn').forEach(tabBtn => {
    tabBtn.addEventListener('click', (e) => {
      document.querySelectorAll('.view-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      e.target.classList.add('active');
      const tabId = e.target.dataset.tab;
      document.getElementById(tabId).classList.add('active');

      if (tabId === 'calendarTab') renderCalendar();
      if (tabId === 'budgetTab') renderBudgets();
      if (tabId === 'chartTab') updateCharts();
    });
  });

  // Backup & Restore & Excel Export
  document.getElementById('backupBtn').addEventListener('click', exportBackupJSON);
  document.getElementById('restoreBtn').addEventListener('click', () => document.getElementById('restoreFileInput').click());
  document.getElementById('restoreFileInput').addEventListener('change', importBackupJSON);
  document.getElementById('excelExportBtn').addEventListener('click', exportToCSV);

  // Google Sync Modal Controls
  document.getElementById('googleSyncBtn').addEventListener('click', openSyncModal);
  document.getElementById('closeSyncModalBtn').addEventListener('click', closeSyncModal);
  document.getElementById('testAndSaveSyncBtn').addEventListener('click', saveAndTestGASUrl);
  document.getElementById('syncNowBtn').addEventListener('click', fetchFromGoogleSheets);
  document.getElementById('copyScriptCodeBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(GAS_CODE_TEMPLATE);
    alert('구글 앱스 스크립트 코드가 클립보드에 복사되었습니다!');
  });

  // Manage Payment Methods & Categories Modals
  document.getElementById('managePayMethodsBtn').addEventListener('click', () => openManageModal('payMethods'));
  document.getElementById('manageCategoriesBtn').addEventListener('click', () => openManageModal('categories'));
  document.getElementById('closeTagModalBtn').addEventListener('click', () => document.getElementById('manageTagsModal').classList.add('hidden'));

  // Save Budgets
  document.getElementById('saveBudgetsBtn').addEventListener('click', saveBudgets);
}

// Master Render Function
function renderApp() {
  document.getElementById('displayYear').textContent = `${state.currentYear}년`;
  document.getElementById('displayMonth').textContent = `${state.currentMonth}월`;

  renderPayMethodChips();
  renderCategoryChips();
  renderFilterOptions();
  renderSummaryCards();
  renderTransactionList();
}

// Render Payment Method Chips in Form
function renderPayMethodChips() {
  const container = document.getElementById('payMethodChips');
  container.innerHTML = '';
  state.payMethods.forEach(pm => {
    const chip = document.createElement('div');
    chip.className = `chip-tag ${state.selectedPayMethod === pm ? 'selected' : ''}`;
    chip.textContent = pm;
    chip.addEventListener('click', () => {
      state.selectedPayMethod = pm;
      renderPayMethodChips();
    });
    container.appendChild(chip);
  });
}

// Render Category Chips in Form
function renderCategoryChips() {
  const container = document.getElementById('categoryChips');
  container.innerHTML = '';
  state.categories.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = `chip-tag ${state.selectedCategory === cat ? 'selected' : ''}`;
    chip.textContent = cat;
    chip.addEventListener('click', () => {
      state.selectedCategory = cat;
      renderCategoryChips();
    });
    container.appendChild(chip);
  });
}

// Populate Filter Select Elements
function renderFilterOptions() {
  const paySelect = document.getElementById('filterPayMethod');
  paySelect.innerHTML = '<option value="ALL">전체 결제수단</option>';
  state.payMethods.forEach(pm => {
    const opt = document.createElement('option');
    opt.value = pm;
    opt.textContent = pm;
    if (state.activePayFilter === pm) opt.selected = true;
    paySelect.appendChild(opt);
  });

  const catSelect = document.getElementById('filterCategory');
  catSelect.innerHTML = '<option value="ALL">전체 카테고리</option>';
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (state.activeCategoryFilter === cat) opt.selected = true;
    catSelect.appendChild(opt);
  });
}

// Filter transactions by current Year & Month
function getCurrentMonthTransactions() {
  return state.transactions.filter(tx => {
    if (!tx.date) return false;
    const [y, m] = tx.date.split('-').map(Number);
    return y === state.currentYear && m === state.currentMonth;
  });
}

// Summary Top Cards Calculation
function renderSummaryCards() {
  const monthTxs = getCurrentMonthTransactions();
  
  let totalIncome = 0;
  let totalExpense = 0;

  monthTxs.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') totalIncome += amt;
    else totalExpense += amt;
  });

  // Target Budget Total
  let totalBudget = 0;
  Object.values(state.budgets).forEach(b => totalBudget += Number(b) || 0);

  const balance = totalIncome - totalExpense;
  const progressPct = totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 100) : 0;

  document.getElementById('summaryTotalIncome').textContent = `${totalIncome.toLocaleString()} 원`;
  document.getElementById('summaryTotalExpense').textContent = `${totalExpense.toLocaleString()} 원`;
  document.getElementById('summaryTargetBudget').textContent = `${totalBudget.toLocaleString()} 원`;
  document.getElementById('summaryBudgetProgress').textContent = `지출 소진율 ${progressPct}%`;
  document.getElementById('summaryBalance').textContent = `${balance.toLocaleString()} 원`;
}

// Render Transaction List (TAB 1)
function renderTransactionList() {
  const monthTxs = getCurrentMonthTransactions();
  
  // Render Pay Summary Bar Chips
  const paySummaryChipsContainer = document.getElementById('paySummaryChips');
  paySummaryChipsContainer.innerHTML = '';
  
  const payTotals = {};
  monthTxs.filter(tx => tx.type === 'expense').forEach(tx => {
    payTotals[tx.payMethod] = (payTotals[tx.payMethod] || 0) + Number(tx.amount);
  });

  Object.entries(payTotals).forEach(([pm, total]) => {
    const chip = document.createElement('div');
    chip.className = `pay-summary-chip ${state.activePayFilter === pm ? 'active-filter' : ''}`;
    chip.innerHTML = `💳 ${pm} <span style="font-weight:800;">${total.toLocaleString()} 원</span>`;
    chip.addEventListener('click', () => {
      state.activePayFilter = state.activePayFilter === pm ? 'ALL' : pm;
      document.getElementById('filterPayMethod').value = state.activePayFilter;
      renderTransactionList();
    });
    paySummaryChipsContainer.appendChild(chip);
  });

  // Filter List Logic
  let filtered = monthTxs.filter(tx => {
    if (state.activePayFilter !== 'ALL' && tx.payMethod !== state.activePayFilter) return false;
    if (state.activeCategoryFilter !== 'ALL' && tx.category !== state.activeCategoryFilter) return false;
    if (state.searchQuery) {
      const q = state.searchQuery;
      const matchMemo = tx.memo && tx.memo.toLowerCase().includes(q);
      const matchCat = tx.category && tx.category.toLowerCase().includes(q);
      const matchPay = tx.payMethod && tx.payMethod.toLowerCase().includes(q);
      const matchAmt = tx.amount.toString().includes(q);
      if (!matchMemo && !matchCat && !matchPay && !matchAmt) return false;
    }
    return true;
  });

  // Sort descending by date
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Group by Date
  const container = document.getElementById('txListContainer');
  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">기록된 거래 내역이 없습니다.</div>';
    return;
  }

  const grouped = {};
  filtered.forEach(tx => {
    if (!grouped[tx.date]) grouped[tx.date] = [];
    grouped[tx.date].push(tx);
  });

  const weekNames = ['일', '월', '화', '수', '목', '금', '토'];

  Object.keys(grouped).forEach(dateStr => {
    const dateObj = new Date(dateStr);
    const dayOfWeek = weekNames[dateObj.getDay()];
    const [, m, d] = dateStr.split('-');

    const groupDiv = document.createElement('div');
    groupDiv.className = 'tx-date-group';

    const header = document.createElement('div');
    header.className = 'tx-date-header';
    header.textContent = `${Number(m)}월 ${Number(d)}일 (${dayOfWeek})`;
    groupDiv.appendChild(header);

    grouped[dateStr].forEach(tx => {
      const isExpense = tx.type === 'expense';
      const item = document.createElement('div');
      item.className = 'tx-item';
      item.innerHTML = `
        <div class="tx-left">
          <div class="tx-icon">${getCategoryEmoji(tx.category)}</div>
          <div class="tx-details">
            <div class="tx-title">${tx.memo || tx.category}</div>
            <div class="tx-badges">
              <span class="badge">${tx.category}</span>
              ${tx.payMethod ? `<span class="badge warning">💳 ${tx.payMethod}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="tx-right">
          <div class="tx-amount ${isExpense ? 'expense-text' : 'income-text'}">
            ${isExpense ? '-' : '+'}${Number(tx.amount).toLocaleString()} 원
          </div>
          <div class="tx-actions">
            <button class="action-icon-btn" onclick="editTx('${tx.id}')">✏️</button>
            <button class="action-icon-btn" onclick="deleteTx('${tx.id}')">🗑️</button>
          </div>
        </div>
      `;
      groupDiv.appendChild(item);
    });

    container.appendChild(groupDiv);
  });
}

// Add or Update Transaction Form Action
function handleAddOrUpdateTx() {
  const date = document.getElementById('txDate').value;
  const amount = parseInt(document.getElementById('txAmount').value, 10);
  const memo = document.getElementById('txMemo').value.trim();

  if (!date || !amount || amount <= 0) {
    alert('날짜와 올바른 금액을 입력해주세요.');
    return;
  }

  if (state.editingTxId) {
    // Edit Existing
    const idx = state.transactions.findIndex(t => t.id === state.editingTxId);
    if (idx !== -1) {
      state.transactions[idx] = {
        ...state.transactions[idx],
        type: state.type,
        date,
        amount,
        payMethod: state.selectedPayMethod,
        category: state.selectedCategory,
        memo
      };
    }
    state.editingTxId = null;
    document.getElementById('addTxSubmitBtn').textContent = '+ 내역 추가하기';
  } else {
    // Create New
    const newTx = {
      id: 'tx-' + Date.now(),
      type: state.type,
      date,
      amount,
      payMethod: state.selectedPayMethod,
      category: state.selectedCategory,
      memo
    };
    state.transactions.push(newTx);
  }

  saveTransactions();
  renderApp();

  // Reset Memo and Amount
  document.getElementById('txAmount').value = '';
  document.getElementById('txMemo').value = '';
}

// Edit & Delete Window Helpers
window.editTx = function(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;

  state.editingTxId = id;
  state.type = tx.type;
  if (tx.type === 'expense') {
    document.getElementById('typeExpenseBtn').click();
  } else {
    document.getElementById('typeIncomeBtn').click();
  }

  document.getElementById('txDate').value = tx.date;
  document.getElementById('txAmount').value = tx.amount;
  document.getElementById('txMemo').value = tx.memo || '';
  
  state.selectedPayMethod = tx.payMethod || state.payMethods[0];
  state.selectedCategory = tx.category || state.categories[0];

  renderPayMethodChips();
  renderCategoryChips();

  document.getElementById('addTxSubmitBtn').textContent = '✏️ 내역 수정 완료';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteTx = function(id) {
  if (confirm('이 내역을 삭제하시겠습니까?')) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveTransactions();
    renderApp();
  }
};

// Render Calendar (TAB 2)
function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];
  dayHeaders.forEach(d => {
    const h = document.createElement('div');
    h.className = 'cal-day-header';
    h.textContent = d;
    grid.appendChild(h);
  });

  const firstDay = new Date(state.currentYear, state.currentMonth - 1, 1);
  const lastDay = new Date(state.currentYear, state.currentMonth, 0);
  const startDayOfWeek = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const monthTxs = getCurrentMonthTransactions();

  // Empty cells for alignment
  for (let i = 0; i < startDayOfWeek; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'cal-day-cell empty';
    grid.appendChild(emptyCell);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayTxs = monthTxs.filter(t => t.date === dateStr);

    let dayIncome = 0;
    let dayExpense = 0;
    dayTxs.forEach(t => {
      if (t.type === 'income') dayIncome += Number(t.amount);
      else dayExpense += Number(t.amount);
    });

    const cell = document.createElement('div');
    cell.className = `cal-day-cell ${dateStr === todayStr ? 'today' : ''}`;
    cell.innerHTML = `
      <div class="cal-day-num">${d}</div>
      ${dayIncome > 0 ? `<div class="cal-income">+${(dayIncome/10000).toFixed(1)}만</div>` : ''}
      ${dayExpense > 0 ? `<div class="cal-expense">-${(dayExpense/10000).toFixed(1)}만</div>` : ''}
    `;
    grid.appendChild(cell);
  }
}

// Render Budgets (TAB 3)
function renderBudgets() {
  const container = document.getElementById('budgetList');
  container.innerHTML = '';

  const monthTxs = getCurrentMonthTransactions().filter(t => t.type === 'expense');

  state.categories.forEach(cat => {
    const targetBudget = Number(state.budgets[cat]) || 0;
    const actualExpense = monthTxs.filter(t => t.category === cat).reduce((sum, t) => sum + Number(t.amount), 0);
    const pct = targetBudget > 0 ? Math.min(Math.round((actualExpense / targetBudget) * 100), 100) : 0;
    const isOver = actualExpense > targetBudget && targetBudget > 0;

    const item = document.createElement('div');
    item.className = 'budget-item';
    item.innerHTML = `
      <div class="budget-item-top">
        <div class="budget-cat-title">${getCategoryEmoji(cat)} ${cat}</div>
        <div class="budget-inputs">
          <span style="font-size:12px; color:var(--text-secondary);">지출: ${actualExpense.toLocaleString()} 원 /</span>
          <label style="font-size:12px;">목표 예산:</label>
          <input type="number" class="budget-input-field" data-cat="${cat}" value="${targetBudget}" placeholder="0"> 원
        </div>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill ${isOver ? 'over' : ''}" style="width: ${pct}%;"></div>
      </div>
    `;
    container.appendChild(item);
  });
}

function saveBudgets() {
  document.querySelectorAll('.budget-input-field').forEach(inp => {
    const cat = inp.dataset.cat;
    const val = parseInt(inp.value, 10) || 0;
    state.budgets[cat] = val;
  });
  localStorage.setItem('couple_budget_budgets', JSON.stringify(state.budgets));
  alert('카테고리별 목표 예산이 저장되었습니다!');
  renderSummaryCards();
}

// Update Analysis Charts (TAB 4)
function initCharts() {
  const catCtx = document.getElementById('categoryChart').getContext('2d');
  categoryChartInstance = new Chart(catCtx, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  const payCtx = document.getElementById('payMethodChart').getContext('2d');
  payMethodChartInstance = new Chart(payCtx, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: '지출 금액 (원)', data: [], backgroundColor: '#5850ec' }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function updateCharts() {
  const monthTxs = getCurrentMonthTransactions().filter(t => t.type === 'expense');

  // Category Totals
  const catTotals = {};
  monthTxs.forEach(t => catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount));

  const catLabels = Object.keys(catTotals);
  const catData = Object.values(catTotals);
  const catColors = ['#5850ec', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

  categoryChartInstance.data.labels = catLabels;
  categoryChartInstance.data.datasets[0].data = catData;
  categoryChartInstance.data.datasets[0].backgroundColor = catColors;
  categoryChartInstance.update();

  // Pay Method Totals
  const payTotals = {};
  monthTxs.forEach(t => payTotals[t.payMethod] = (payTotals[t.payMethod] || 0) + Number(t.amount));

  payMethodChartInstance.data.labels = Object.keys(payTotals);
  payMethodChartInstance.data.datasets[0].data = Object.values(payTotals);
  payMethodChartInstance.update();
}

// Emoji Mapping Helper
function getCategoryEmoji(cat) {
  const map = {
    '식비': '🛒', '생활비': '🏠', '관리비': '🏢', '가스비': '🔥', '유류비': '⛽', '하이패스': '🛣️',
    '구독인터넷': '📡', '외식': '🍔', '여행지금': '✈️', '네일': '💅', '미용실': '💈',
    '교통비': '🚌', '운동': '🏋️', '의': '👗', '주': '🏠', '연금': '💵', '대출이자': '🏦',
    '소영': '👩', '의료비': '💊', '예비자금': '💰', '상연용돈': '👛', '소영용돈': '👛',
    '특수생활비': '🎁', '보험': '🛡️', '통신비': '📱', '동생': '👧', '고정비': '📌',
    '주택청약': '🏡', '청년': '🌱', '투자': '📈', '급여': '💵'
  };
  return map[cat] || '🏷️';
}

// Backup & Restore JSON
function exportBackupJSON() {
  const backupData = {
    transactions: state.transactions,
    payMethods: state.payMethods,
    categories: state.categories,
    budgets: state.budgets
  };
  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `부부가계부_백업_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

function importBackupJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.transactions) state.transactions = data.transactions;
      if (data.payMethods) state.payMethods = data.payMethods;
      if (data.categories) state.categories = data.categories;
      if (data.budgets) state.budgets = data.budgets;

      saveTransactions();
      localStorage.setItem('couple_budget_pay_methods', JSON.stringify(state.payMethods));
      localStorage.setItem('couple_budget_categories', JSON.stringify(state.categories));
      localStorage.setItem('couple_budget_budgets', JSON.stringify(state.budgets));

      alert('데이터 복원이 완료되었습니다!');
      renderApp();
    } catch (err) {
      alert('유효하지 않은 백업 파일입니다.');
    }
  };
  reader.readAsText(file);
}

// Export Excel CSV
function exportToCSV() {
  let csvContent = "\uFEFF"; // UTF-8 BOM
  csvContent += "ID,구분,날짜,금액,결제수단,카테고리,메모\n";

  state.transactions.forEach(t => {
    const row = [t.id, t.type, t.date, t.amount, `"${t.payMethod}"`, `"${t.category}"`, `"${t.memo || ''}"`].join(",");
    csvContent += row + "\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `부부가계부_내역_${state.currentYear}_${state.currentMonth}.csv`;
  a.click();
}

// Google Sheets Sync Functions
function openSyncModal() {
  document.getElementById('googleSyncModal').classList.remove('hidden');
  document.getElementById('appsScriptUrlInput').value = state.appsScriptUrl;
  document.getElementById('appsScriptCodeSample').value = GAS_CODE_TEMPLATE;

  if (state.appsScriptUrl) {
    document.getElementById('syncStatusText').className = 'badge success';
    document.getElementById('syncStatusText').textContent = '구글 시트 연동 중';
  }
}

function closeSyncModal() {
  document.getElementById('googleSyncModal').classList.add('hidden');
}

function saveAndTestGASUrl() {
  const url = document.getElementById('appsScriptUrlInput').value.trim();
  if (!url) {
    alert('Apps Script Web App URL을 입력해주세요.');
    return;
  }
  state.appsScriptUrl = url;
  localStorage.setItem('couple_budget_gas_url', url);
  
  syncToGoogleSheetsIfNeeded();
}

function syncToGoogleSheetsIfNeeded() {
  if (!state.appsScriptUrl) return;

  fetch(state.appsScriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state.transactions)
  }).then(() => {
    const statusText = document.getElementById('syncStatusText');
    if (statusText) {
      statusText.className = 'badge success';
      statusText.textContent = '구글 시트 실시간 동기화 완료!';
    }
  }).catch(err => {
    console.error('GAS Sync Error:', err);
  });
}

function fetchFromGoogleSheets(isSilent = true) {
  if (!state.appsScriptUrl) {
    if (!isSilent) alert('연동된 구글 시트 URL이 없습니다. 먼저 연동 설정을 완료해주세요.');
    return;
  }

  fetch(state.appsScriptUrl)
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        state.transactions = data.map(item => ({
          ...item,
          amount: Number(item.amount)
        }));
        localStorage.setItem('couple_budget_transactions', JSON.stringify(state.transactions));
        renderApp();
        if (!isSilent) alert('구글 시트로부터 최신 내역을 불러왔습니다!');
      } else if (Array.isArray(data) && data.length === 0) {
        // Empty sheet - sync current transactions to sheet
        syncToGoogleSheetsIfNeeded();
      }
    })
    .catch(err => {
      console.error('Sync Fetch Error:', err);
      if (!isSilent) alert('구글 시트 불러오기 오류: ' + err.message);
    });
}

// Modal Tag Management (Payment Methods / Categories)
let currentManageType = 'payMethods';

function openManageModal(type) {
  currentManageType = type;
  const modal = document.getElementById('manageTagsModal');
  const title = document.getElementById('manageModalTitle');
  title.textContent = type === 'payMethods' ? '💳 결제수단 관리' : '🏷️ 카테고리 관리';
  modal.classList.remove('hidden');
  renderManageTagList();
}

function renderManageTagList() {
  const list = document.getElementById('tagListItems');
  list.innerHTML = '';
  const items = state[currentManageType];

  items.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'tag-manage-item';
    li.innerHTML = `
      <span>${item}</span>
      <button class="action-icon-btn" onclick="removeTagItem(${idx})">🗑️</button>
    `;
    list.appendChild(li);
  });
}

document.getElementById('addNewTagBtn').addEventListener('click', () => {
  const input = document.getElementById('newTagNameInput');
  const name = input.value.trim();
  if (name && !state[currentManageType].includes(name)) {
    state[currentManageType].push(name);
    localStorage.setItem(`couple_budget_${currentManageType === 'payMethods' ? 'pay_methods' : 'categories'}`, JSON.stringify(state[currentManageType]));
    input.value = '';
    renderManageTagList();
    renderApp();
  }
});

window.removeTagItem = function(idx) {
  state[currentManageType].splice(idx, 1);
  localStorage.setItem(`couple_budget_${currentManageType === 'payMethods' ? 'pay_methods' : 'categories'}`, JSON.stringify(state[currentManageType]));
  renderManageTagList();
  renderApp();
};
