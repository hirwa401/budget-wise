/* =============================================
   BUDGETWISE — app.js
   Frontend logic + PHP API integration
============================================= */

// ─── CONFIG ─────────────────────────────────
// Dynamic API base for local and deployed environments
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost/budgetwise/api' 
  : `https://${window.location.hostname}/api`;
// ─────────────────────────────────────────────

let currentUser = null;
let currentPlanData = null;
let profilePicData = null;

// Profile picture upload handlers
document.addEventListener('DOMContentLoaded', () => {
  const profileInput = document.getElementById('profile-pic');
  if (profileInput) {
    profileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          profilePicData = event.target.result;
          const preview = document.getElementById('preview-pic');
          preview.src = profilePicData;
          preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
      }
    });
  }
});

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  // Check stored session
  const stored = sessionStorage.getItem('bw_user');
  if (stored) {
    currentUser = JSON.parse(stored);
    bootApp();
  } else {
    // Handle #login or #register from landing page
    const hash = window.location.hash.substring(1);
    if (hash === 'register' || hash === 'login') {
      switchPanel(hash);
    }
  }
  // Sidebar: watch checkboxes for allocation bar
  document.querySelectorAll('.expense-item input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', updateAllocationBar);
  });
  document.querySelectorAll('.expense-amt').forEach(inp => {
    inp.addEventListener('input', updateAllocationBar);
  });
  document.getElementById('income-amount')?.addEventListener('input', updateAllocationBar);

  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.app-sidebar');
  menuToggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
  });

  initTheme();
});

function initTheme() {
  const saved = localStorage.getItem('bw_theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  localStorage.setItem('bw_theme', theme);
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    document.body.classList.remove('dark-theme');
    document.querySelectorAll('#theme-toggle').forEach(btn => {
      btn.textContent = 'Dark Mode';
    });
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
    document.querySelectorAll('#theme-toggle').forEach(btn => {
      btn.textContent = 'Light Mode';
    });
  }
  // Update active button in settings
  document.getElementById('theme-light-btn')?.classList.toggle('active', theme === 'light');
  document.getElementById('theme-dark-btn')?.classList.toggle('active', theme === 'dark');
}

// =============================================
// AUTH
// =============================================
function switchPanel(which) {
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(which + '-panel').classList.add('active');
}

async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.classList.add('hidden');

  if (!email || !password) {
    showError(errEl, 'Please fill in all fields.');
    return;
  }

  try {
    const res = await apiFetch('/auth/login.php', { email, password });
    if (res.success) {
      currentUser = res.user;
      sessionStorage.setItem('bw_user', JSON.stringify(currentUser));
      bootApp();
    } else {
      showError(errEl, res.message || 'Invalid credentials.');
    }
  } catch (e) {
    // Offline/demo mode
    demoLogin(email);
  }
}

async function handleRegister() {
  const firstname = document.getElementById('reg-firstname').value.trim();
  const lastname  = document.getElementById('reg-lastname').value.trim();
  const email     = document.getElementById('reg-email').value.trim();
  const password  = document.getElementById('reg-password').value;
  const currency  = document.getElementById('reg-currency').value;
  const country   = document.getElementById('reg-country').value;
  const errEl     = document.getElementById('register-error');
  errEl.classList.add('hidden');

  if (!firstname || !lastname || !email || !password) {
    showError(errEl, 'Please fill in all fields.');
    return;
  }
  if (password.length < 8) {
    showError(errEl, 'Password must be at least 8 characters.');
    return;
  }

  try {
    const res = await apiFetch('/auth/register.php', { firstname, lastname, email, password, currency, country, profile_pic: profilePicData });
    if (res.success) {
      currentUser = { ...res.user, profile_pic: profilePicData };
      sessionStorage.setItem('bw_user', JSON.stringify(currentUser));
      bootApp();
      showToast('Account created successfully! Welcome 🎉', 'success');
    } else {
      showError(errEl, res.message || 'Registration failed.');
    }
  } catch (e) {
    // Demo mode
    demoRegister({ firstname, lastname, email, currency, profilePic: profilePicData });
  }
}

function demoLogin(email) {
  // Clear any cached plans from localStorage
  const userId = generateUserIdFromEmail(email);
  localStorage.removeItem('bw_plans_' + userId);
  
  // Offline demo – works without PHP backend
  currentUser = {
    id: userId,
    firstname: email.split('@')[0],
    lastname: '',
    email,
    currency: 'RWF'
  };
  sessionStorage.setItem('bw_user', JSON.stringify(currentUser));
  bootApp();
  showToast('Demo mode: PHP backend not connected', 'error');
}

function demoRegister(data) {
  // Clear any existing plans from localStorage for this user
  const userId = generateUserIdFromEmail(data.email);
  localStorage.removeItem('bw_plans_' + userId);
  
  currentUser = { id: userId, ...data, profile_pic: data.profilePic || null };
  sessionStorage.setItem('bw_user', JSON.stringify(currentUser));
  bootApp();
  showToast('Demo mode: account not saved (PHP backend offline)', 'error');
}

// Generate unique, consistent ID for demo user based on email
function generateUserIdFromEmail(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function handleLogout() {
  // Clear current user's plans from localStorage if it's a demo user
  if (currentUser?.id && typeof currentUser.id === 'number') {
    localStorage.removeItem('bw_plans_' + currentUser.id);
  }
  currentUser = null;
  sessionStorage.removeItem('bw_user');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  showToast('Logged out successfully');
}

// =============================================
// APP BOOT
// =============================================
function bootApp() {
  document.getElementById('auth-screen')?.classList.add('hidden');
  document.getElementById('app')?.classList.remove('hidden');

  const name = currentUser.firstname || currentUser.email?.split('@')[0] || 'User';
  document.getElementById('user-name-display').textContent = name;
  document.getElementById('hero-name').textContent = name;
  document.getElementById('user-avatar').textContent =
    (name[0] + (currentUser.lastname?.[0] || '')).toUpperCase();

  // Handle profile picture display
  const avatarImg = document.getElementById('topbar-avatar');
  const avatarDiv = document.getElementById('user-avatar');
  if (currentUser.profile_pic) {
    avatarImg.src = currentUser.profile_pic;
    avatarImg.classList.remove('hidden');
    avatarDiv.classList.add('hidden');
  } else {
    avatarImg.classList.add('hidden');
    avatarDiv.classList.remove('hidden');
  }

  // Set currency label in planner
  document.getElementById('currency-label').textContent = currentUser.currency || 'RWF';

  // Set currency for calculators
  const currency = currentUser.currency || 'RWF';
  document.getElementById('calc-currency').textContent = currency;
  document.getElementById('tax-currency').textContent = currency;
  document.getElementById('tax-currency-2').textContent = currency;

  showView('dashboard');
  loadDashboard();
}

// =============================================
// VIEWS
// =============================================
function showView(name) {
  document.querySelectorAll('.app-main .view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.app-nav .nav-link').forEach(b => b.classList.remove('active'));

  document.getElementById('view-' + name)?.classList.add('active');
  document.querySelectorAll('.app-nav .nav-link').forEach(b => {
    if (b.onclick.toString().includes(`showView('${name}')`)) {
      b.classList.add('active');
    }
  });
  if (name === 'history') loadHistory();
  if (name === 'dashboard') loadDashboard();
  if (name === 'calculator') initCalculator();
  if (name === 'taxcalc') initTaxCalculator();
  if (name === 'settings') loadSettings();
}

// =============================================
// DASHBOARD
// =============================================
async function loadDashboard() {
  let plans = [];
  try {
    const res = await apiFetch('/plans/list.php', { user_id: currentUser.id });
    if (res.success) plans = res.plans || [];
  } catch (e) {
    plans = getLocalPlans();
  }

  const currency = currentUser.currency || 'RWF';
  document.getElementById('stat-total-plans').textContent = plans.length;

  if (plans.length > 0) {
    const latest = plans[0];
    document.getElementById('stat-latest-budget').textContent = formatCurrency(latest.income, currency);
    const avgSavings = plans.reduce((a, p) => {
      const expenses = JSON.parse(p.expenses || '[]');
      const totalPct = expenses.reduce((s, e) => s + parseFloat(e.percentage), 0);
      return a + (100 - totalPct);
    }, 0) / plans.length;
    document.getElementById('stat-savings-rate').textContent = avgSavings.toFixed(1) + '%';
  }

  const listEl = document.getElementById('recent-plans-list');
  renderPlanCards(listEl, plans.slice(0, 4), currency);
}

function renderPlanCards(container, plans, currency) {
  if (!plans.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <p>No plans yet. Create your first budget plan!</p>
        <button class="btn-primary sm" onclick="showView('planner')">Get Started</button>
      </div>`;
    return;
  }

  container.innerHTML = plans.map(plan => {
    const expenses = typeof plan.expenses === 'string'
      ? JSON.parse(plan.expenses)
      : (plan.expenses || []);
    const totalPct = expenses.reduce((s, e) => s + parseFloat(e.percentage), 0);
    const savingsPct = 100 - totalPct;
    const isGood = savingsPct >= 10;
    const top3 = expenses.slice(0, 3);

    return `
      <div class="mini-plan-card">
        <div class="mp-header">
          <div>
            <div class="mp-title">${plan.plan_name}</div>
            <div class="mp-period">${capitalize(plan.period)} • ${plan.income_type}</div>
          </div>
          <div class="mp-amount">${formatCurrency(plan.income, currency)}</div>
        </div>
        <div class="mp-bars">
          ${top3.map(e => `
            <div class="mp-bar-item">
              <span class="mp-bar-label">${e.label}</span>
              <div class="mp-bar-track"><div class="mp-bar-fill" style="width:${e.percentage}%"></div></div>
              <span class="mp-bar-pct">${e.percentage}%</span>
            </div>
          `).join('')}
        </div>
        <div class="mp-savings-badge ${isGood ? '' : 'bad'}">
          ${isGood ? '✅' : '⚠️'} Savings: ${savingsPct.toFixed(1)}%
        </div>
      </div>`;
  }).join('');
}

// =============================================
// HISTORY
// =============================================
async function loadHistory() {
  let plans = [];
  try {
    const res = await apiFetch('/plans/list.php', { user_id: currentUser.id });
    if (res.success) plans = res.plans || [];
  } catch (e) {
    plans = getLocalPlans();
  }

  const currency = currentUser.currency || 'RWF';
  const listEl = document.getElementById('history-list');
  renderPlanCards(listEl, plans, currency);
}

// =============================================
// PLANNER — SIDEBAR
// =============================================
function updateAllocationBar() {
  let total = 0;
  document.querySelectorAll('.expense-item').forEach(item => {
    const cb = item.querySelector('input[type="checkbox"]');
    const amt = item.querySelector('.expense-amt');
    if (cb.checked && amt) {
      const val = parseFloat(amt.value) || 0;
      total += val;
    }
  });

  const incomeAmount = parseFloat(document.getElementById('income-amount')?.value) || 0;
  const fillPct = incomeAmount > 0 ? Math.min((total / incomeAmount) * 100, 100) : 0;
  const currency = currentUser?.currency || 'RWF';
  document.getElementById('total-amt-display').textContent = formatCurrency(total, currency);

  const fill = document.getElementById('alloc-bar-fill');
  fill.style.width = fillPct + '%';
  fill.classList.toggle('over', incomeAmount > 0 && total > incomeAmount);

  const warn = document.getElementById('alloc-warning');
  if (incomeAmount > 0) {
    warn.textContent = total > incomeAmount ? '⚠️ Total exceeds income' : '';
    warn.classList.toggle('hidden', total <= incomeAmount);
  } else {
    warn.classList.add('hidden');
  }
}

// =============================================
// GENERATE PLAN
// =============================================
function generatePlan() {
  const planName   = document.getElementById('plan-name').value.trim() || 'My Budget Plan';
  const period     = document.getElementById('plan-period').value;
  const incomeType = document.getElementById('income-type').value;
  const amount     = parseFloat(document.getElementById('income-amount').value);
  const currency   = currentUser.currency || 'RWF';

  if (!amount || amount <= 0) {
    showToast('Please enter a valid income amount.', 'error');
    return;
  }

  // Collect selected expenses
  const expenses = [];
  document.querySelectorAll('.expense-item').forEach(item => {
    const cb = item.querySelector('input[type="checkbox"]');
    const amt = item.querySelector('.expense-amt');
    const data = cb.dataset;
    if (cb.checked) {
      let expenseAmount = parseFloat(amt.value) || 0;
      let dailyAmount = null;

      // Handle daily transport calculation
      if (cb.value === 'transport') {
        dailyAmount = expenseAmount;
        if (period === 'monthly') {
          expenseAmount = expenseAmount * 30; // Assume 30 days in month
        } else if (period === 'weekly') {
          expenseAmount = expenseAmount * 7; // 7 days in week
        } else if (period === 'annual') {
          expenseAmount = expenseAmount * 365; // 365 days in year
        }
      }

      const percentage = amount > 0 ? (expenseAmount / amount) * 100 : 0;
      expenses.push({
        key: cb.value,
        label: data.label,
        percentage: parseFloat(percentage.toFixed(1)),
        amount: expenseAmount,
        daily_amount: dailyAmount
      });
    }
  });

  if (expenses.length === 0) {
    showToast('Please select at least one expense category.', 'error');
    return;
  }

  const totalPct      = expenses.reduce((s, e) => s + e.percentage, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining     = amount - totalExpenses;
  const savingsPct    = ((remaining / amount) * 100).toFixed(1);

  // Store plan data for saving
  currentPlanData = {
    plan_name: planName,
    period,
    income_type: incomeType,
    income: amount,
    currency,
    expenses,
    total_expenses: totalExpenses,
    remaining,
    savings_percentage: parseFloat(savingsPct),
    notes: document.getElementById('plan-notes').value.trim()
  };

  // Render
  document.getElementById('result-plan-name').textContent = planName;
  document.getElementById('result-plan-period').textContent =
    capitalize(period) + ' Plan — ' + capitalize(incomeType.replace('_', ' '));
  document.getElementById('result-income-display').textContent = formatCurrency(amount, currency);

  // Breakdown
  const breakdownEl = document.getElementById('plan-breakdown');
  breakdownEl.innerHTML = expenses.map(e => {
    let amountDisplay = formatCurrency(e.amount, currency);
    let pctText = `${e.percentage}% of income`;

    // Special handling for daily transport
    if (e.key === 'transport' && e.daily_amount !== null) {
      const multiplier = period === 'monthly' ? 30 : period === 'weekly' ? 7 : 365;
      const periodText = period === 'monthly' ? 'month' : period === 'weekly' ? 'week' : 'year';
      amountDisplay = `${formatCurrency(e.daily_amount, currency)}/day × ${multiplier} = ${formatCurrency(e.amount, currency)}`;
      pctText = `${e.percentage}% of income (${periodText}ly total)`;
    }

    return `
    <div class="breakdown-item">
      <div class="bi-top">
        <span class="bi-label">${e.label}</span>
        <span class="bi-amount">${amountDisplay}</span>
      </div>
      <div class="bi-pct-text">${pctText}</div>
      <div class="bi-bar-track">
        <div class="bi-bar-fill" style="width:${Math.min(e.percentage, 100)}%"></div>
      </div>
    </div>
  `}).join('');

  document.getElementById('result-total-expenses').textContent = formatCurrency(totalExpenses, currency);
  document.getElementById('result-remaining').textContent      = formatCurrency(remaining, currency);
  document.getElementById('result-savings-pct').textContent    = savingsPct + '%';

  // Advice
  const adviceEl = document.getElementById('plan-advice');
  adviceEl.innerHTML = generateAdvice(savingsPct, totalPct, expenses, currency, amount);

  document.getElementById('plan-result').classList.remove('hidden');
  document.getElementById('plan-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function generateAdvice(savingsPct, totalPct, expenses, currency, income) {
  const tips = [];

  if (totalPct > 100) {
    return `<strong>⚠️ Warning:</strong> Your total allocations exceed 100% (${totalPct}%). Please reduce some categories before saving this plan.`;
  }

  if (savingsPct >= 20) {
    tips.push(`<strong>🎉 Excellent!</strong> You're saving ${savingsPct}% of your income — above the recommended 20%.`);
  } else if (savingsPct >= 10) {
    tips.push(`<strong>✅ Good start.</strong> You're saving ${savingsPct}%. Try to reach 20% by trimming non-essentials.`);
  } else if (savingsPct >= 0) {
    tips.push(`<strong>⚠️ Low savings.</strong> Only ${savingsPct}% is unallocated. Look for areas to cut spending.`);
  } else {
    tips.push(`<strong>🚨 Over budget!</strong> You're allocating more than you earn. Reduce categories urgently.`);
  }

  const housing = expenses.find(e => e.key === 'rent');
  if (housing && housing.percentage > 35) {
    tips.push(`Your housing cost is <strong>${housing.percentage}%</strong> — try to keep it under 30% of income.`);
  }

  const savings_cat = expenses.find(e => e.key === 'savings');
  if (!savings_cat) {
    tips.push(`Consider adding a <strong>Savings/Investment</strong> category — even 10% compounds significantly over time.`);
  }

  const emergency = expenses.find(e => e.key === 'emergency');
  if (!emergency) {
    tips.push(`Build an <strong>Emergency Fund</strong> of 3–6 months of expenses for financial security.`);
  }

  return tips.join('<br><br>');
}

// =============================================
// SAVE PLAN
// =============================================
async function savePlan() {
  if (!currentPlanData) return;

  try {
    const res = await apiFetch('/plans/save.php', {
      user_id: currentUser.id,
      ...currentPlanData,
      expenses: JSON.stringify(currentPlanData.expenses)
    });
    if (res.success) {
      showToast('Plan saved successfully! ✅', 'success');
      saveLocalPlan(currentPlanData);
    } else {
      throw new Error(res.message);
    }
  } catch (e) {
    // Save locally if API fails
    saveLocalPlan(currentPlanData);
    showToast('Saved locally (PHP backend offline)', 'error');
  }
}

// =============================================
// LOCAL STORAGE FALLBACK
// =============================================
function saveLocalPlan(plan) {
  const plans = getLocalPlans();
  plans.unshift({ ...plan, id: Date.now(), created_at: new Date().toISOString() });
  localStorage.setItem('bw_plans_' + (currentUser?.id || 'demo'), JSON.stringify(plans));
}

function getLocalPlans() {
  try {
    return JSON.parse(localStorage.getItem('bw_plans_' + (currentUser?.id || 'demo')) || '[]');
  } catch { return []; }
}

function resetPlanner() {
  document.getElementById('plan-result').classList.add('hidden');
  document.getElementById('plan-name').value = '';
  document.getElementById('income-amount').value = '';
  document.getElementById('plan-notes').value = '';
  document.querySelectorAll('.expense-item input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });
  document.querySelectorAll('.expense-amt').forEach(inp => {
    inp.value = '';
    inp.style.display = 'none';
  });
  updateAllocationBar();
  currentPlanData = null;
}

// =============================================
// LOAN CALCULATOR
// =============================================
function initCalculator() {
  // Set default country to user's country
  if (currentUser && currentUser.country) {
    document.getElementById('calc-country').value = currentUser.country;
  }
  // Set currency display
  const currency = currentUser?.currency || 'RWF';
  document.getElementById('calc-currency').textContent = currency;
}

function calculateLoan() {
  const amount = parseFloat(document.getElementById('loan-amount').value) || 0;
  const rate = parseFloat(document.getElementById('interest-rate').value) || 0;
  const term = parseInt(document.getElementById('loan-term').value) || 1;
  const country = document.getElementById('calc-country').value;
  const currency = currentUser?.currency || 'RWF';

  if (amount <= 0 || rate <= 0 || term <= 0) {
    showToast('Please enter valid loan details', 'error');
    return;
  }

  // Calculate monthly payment using formula: P * (r(1+r)^n) / ((1+r)^n - 1)
  const monthlyRate = rate / 100 / 12;
  const numPayments = term * 12;
  const monthlyPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const totalPayment = monthlyPayment * numPayments;
  const totalInterest = totalPayment - amount;

  // Simple tax calculation based on country (estimated)
  const taxRate = getTaxRate(country);
  const taxAmount = totalPayment * (taxRate / 100);

  // Display results
  document.getElementById('monthly-payment').textContent = formatCurrency(monthlyPayment, currency);
  document.getElementById('total-payment').textContent = formatCurrency(totalPayment, currency);
  document.getElementById('total-interest').textContent = formatCurrency(totalInterest, currency);
  document.getElementById('tax-amount').textContent = formatCurrency(taxAmount, currency);

  // Advice
  let advice = '';
  if (monthlyPayment > (amount * 0.03)) {
    advice = '⚠️ Monthly payment is high. Consider longer term or lower amount.';
  } else if (rate > 15) {
    advice = '💡 Interest rate is high. Shop around for better rates.';
  } else {
    advice = '✅ This loan seems manageable. Review terms carefully.';
  }
  document.getElementById('calc-advice').innerHTML = advice;

  document.getElementById('calc-result').classList.remove('hidden');
}

function getTaxRate(country) {
  // Simple tax rates (estimated, not accurate)
  const rates = {
    'Rwanda': 18,
    'Kenya': 16,
    'Uganda': 18,
    'Tanzania': 18,
    'Burundi': 18,
    'United States': 22, // federal + state average
    'United Kingdom': 20,
    'Germany': 19,
    'France': 20,
    'Canada': 15,
    'Australia': 23
  };
  return rates[country] || 18; // default 18%
}

// =============================================
// TAX CALCULATOR
// =============================================
function initTaxCalculator() {
  // Set default country to user's country
  if (currentUser && currentUser.country) {
    document.getElementById('tax-country').value = currentUser.country;
  }
  // Set currency display
  const currency = currentUser?.currency || 'RWF';
  document.getElementById('tax-currency').textContent = currency;
  document.getElementById('tax-currency-2').textContent = currency;
}

function calculateTax() {
  const income = parseFloat(document.getElementById('annual-income').value) || 0;
  const deductions = parseFloat(document.getElementById('deductions').value) || 0;
  const country = document.getElementById('tax-country').value;
  const year = document.getElementById('tax-year').value;
  const currency = currentUser?.currency || 'RWF';

  if (income <= 0) {
    showToast('Please enter a valid annual income', 'error');
    return;
  }

  const taxableIncome = Math.max(0, income - deductions);
  const taxBrackets = getTaxBrackets(country, year);
  let taxOwed = 0;
  let bracketDetails = [];

  // Calculate tax using progressive brackets
  for (let i = 0; i < taxBrackets.length; i++) {
    const bracket = taxBrackets[i];
    const nextBracket = taxBrackets[i + 1];
    const bracketMax = nextBracket ? nextBracket.min : Infinity;

    if (taxableIncome > bracket.min) {
      const taxableInThisBracket = Math.min(taxableIncome - bracket.min, bracketMax - bracket.min);
      const taxInThisBracket = taxableInThisBracket * (bracket.rate / 100);
      taxOwed += taxInThisBracket;

      if (taxableInThisBracket > 0) {
        bracketDetails.push({
          range: formatCurrency(bracket.min, currency) + ' - ' + (nextBracket ? formatCurrency(bracketMax, currency) : '∞'),
          rate: bracket.rate + '%',
          tax: formatCurrency(taxInThisBracket, currency)
        });
      }
    }
  }

  const effectiveRate = income > 0 ? (taxOwed / income * 100) : 0;
  const netIncome = income - taxOwed;

  // Display results
  document.getElementById('taxable-income').textContent = formatCurrency(taxableIncome, currency);
  document.getElementById('tax-owed').textContent = formatCurrency(taxOwed, currency);
  document.getElementById('effective-rate').textContent = effectiveRate.toFixed(1) + '%';
  document.getElementById('net-income').textContent = formatCurrency(netIncome, currency);

  // Display tax brackets
  const bracketsHtml = bracketDetails.map(bracket => `
    <div class="bracket-item">
      <span class="bracket-range">${bracket.range}</span>
      <span class="bracket-rate">${bracket.rate}</span>
      <span class="bracket-tax">${bracket.tax}</span>
    </div>
  `).join('');
  document.getElementById('tax-brackets').innerHTML = `
    <h4>Tax Breakdown by Bracket</h4>
    <div class="brackets-list">
      ${bracketsHtml}
    </div>
  `;

  // AI-powered advice
  const advice = generateTaxAdvice(income, deductions, taxOwed, effectiveRate, country);
  document.getElementById('tax-ai-advice').innerHTML = advice;

  document.getElementById('tax-result').classList.remove('hidden');
}

function getTaxBrackets(country, year) {
  // Simplified tax brackets (not accurate - for demo purposes)
  const brackets = {
    'Rwanda': [
      { min: 0, rate: 0 },
      { min: 360000, rate: 20 },
      { min: 600000, rate: 30 }
    ],
    'Kenya': [
      { min: 0, rate: 10 },
      { min: 288000, rate: 15 },
      { min: 388000, rate: 20 },
      { min: 6000000, rate: 25 },
      { min: 9600000, rate: 30 },
      { min: 20000000, rate: 32.5 }
    ],
    'United States': [
      { min: 0, rate: 10 },
      { min: 11000, rate: 12 },
      { min: 44725, rate: 22 },
      { min: 95375, rate: 24 },
      { min: 182100, rate: 32 },
      { min: 231250, rate: 35 },
      { min: 578125, rate: 37 }
    ],
    'United Kingdom': [
      { min: 0, rate: 20 },
      { min: 50000, rate: 40 },
      { min: 150000, rate: 45 }
    ],
    'Germany': [
      { min: 0, rate: 0 },
      { min: 10908, rate: 14 },
      { min: 15999, rate: 24 },
      { min: 62809, rate: 42 },
      { min: 277825, rate: 45 }
    ],
    'Canada': [
      { min: 0, rate: 15 },
      { min: 55359, rate: 20.5 },
      { min: 110717, rate: 26 },
      { min: 165430, rate: 29 },
      { min: 235675, rate: 33 }
    ]
  };

  return brackets[country] || [
    { min: 0, rate: 0 },
    { min: 10000, rate: 10 },
    { min: 50000, rate: 20 },
    { min: 100000, rate: 30 }
  ];
}

function generateTaxAdvice(income, deductions, taxOwed, effectiveRate, country) {
  let advice = '<h4>🤖 AI Tax Optimization Suggestions</h4>';

  if (effectiveRate > 30) {
    advice += '<p class="advice-high">⚠️ Your effective tax rate is quite high. Consider these strategies:</p>';
    advice += '<ul>';
    advice += '<li>Maximize deductions through charitable donations</li>';
    advice += '<li>Consider tax-advantaged retirement accounts</li>';
    advice += '<li>Explore business expense deductions if applicable</li>';
    advice += '<li>Consult a tax professional for advanced planning</li>';
    advice += '</ul>';
  } else if (effectiveRate > 20) {
    advice += '<p class="advice-medium">📊 Moderate tax burden. Here are some optimization tips:</p>';
    advice += '<ul>';
    advice += '<li>Review and maximize available deductions</li>';
    advice += '<li>Consider tax-loss harvesting if you have investments</li>';
    advice += '<li>Look into tax credits for your situation</li>';
    advice += '</ul>';
  } else {
    advice += '<p class="advice-low">✅ Your tax situation looks favorable!</p>';
    advice += '<ul>';
    advice += '<li>You\'re in a lower tax bracket - great job!</li>';
    advice += '<li>Continue maximizing deductions to stay optimized</li>';
    advice += '<li>Consider tax-advantaged savings for long-term planning</li>';
    advice += '</ul>';
  }

  if (deductions === 0) {
    advice += '<p class="advice-tip">💡 <strong>Tip:</strong> You haven\'t entered any deductions. Many countries offer deductions for mortgage interest, student loans, medical expenses, and charitable contributions.</p>';
  }

  // Country-specific advice
  if (country === 'United States') {
    advice += '<p class="advice-country">🇺🇸 <strong>US-specific:</strong> Consider contributing to a 401(k) or IRA for tax deductions, and look into state-specific tax credits.</p>';
  } else if (country === 'United Kingdom') {
    advice += '<p class="advice-country">🇬🇧 <strong>UK-specific:</strong> Make use of ISA allowances and consider pension contributions for tax relief.</p>';
  } else if (['Rwanda', 'Kenya', 'Uganda', 'Tanzania'].includes(country)) {
    advice += '<p class="advice-country">🌍 <strong>East Africa:</strong> Look into regional tax treaties and incentives for foreign investors if applicable.</p>';
  }

  return advice;
}

// =============================================
// SETTINGS
// =============================================
function loadSettings() {
  if (!currentUser) return;
  document.getElementById('setting-firstname').value = currentUser.firstname || '';
  document.getElementById('setting-lastname').value = currentUser.lastname || '';
  document.getElementById('setting-email').value = currentUser.email || '';

  // Reset password forms
  document.getElementById('password-request-form').classList.remove('hidden');
  document.getElementById('password-reset-form').classList.add('hidden');
  document.getElementById('password-change-error').classList.add('hidden');
  document.getElementById('password-change-success').classList.add('hidden');
  document.getElementById('account-update-error').classList.add('hidden');
  document.getElementById('account-update-success').classList.add('hidden');

  // Set active theme button
  const currentTheme = localStorage.getItem('bw_theme') || 'dark';
  applyTheme(currentTheme);

  // Add event listeners for settings navigation
  const settingsNavLinks = document.querySelectorAll('.settings-nav-link');
  settingsNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const paneId = link.dataset.pane;
      document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
      document.getElementById(`pane-${paneId}`).classList.add('active');
      settingsNavLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // Handle settings profile picture upload
  const settingsProfileInput = document.getElementById('settings-profile-pic-input');
  settingsProfileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        profilePicData = event.target.result; // Store new pic data
        document.getElementById('settings-avatar-img').src = profilePicData;
        document.getElementById('settings-avatar-img').classList.remove('hidden');
        document.getElementById('settings-avatar-initials').classList.add('hidden');
        showToast('New profile picture selected. Click "Update Profile" to save.', 'success');
      };
      reader.readAsDataURL(file);
    }
  });
}

async function updateProfile() {
  const firstname = document.getElementById('setting-firstname').value.trim();
  const lastname = document.getElementById('setting-lastname').value.trim();
  const errEl = document.getElementById('account-update-error');
  const successEl = document.getElementById('account-update-success');

  // If no new picture was selected, keep the old one
  const newProfilePic = profilePicData || currentUser.profile_pic;

  // NOTE: Backend API endpoint for this is not yet created.
  // This will work in demo mode.
  try {
    // const res = await apiFetch('/user/update.php', { id: currentUser.id, firstname, lastname });
    // if (res.success) {
      currentUser.firstname = firstname;
      currentUser.lastname = lastname;
      currentUser.profile_pic = newProfilePic;
      sessionStorage.setItem('bw_user', JSON.stringify(currentUser));
      bootApp(); // Re-render user info
      showEl(successEl, 'Profile updated successfully!');
    // } else {
    //   showError(errEl, res.message);
    // }
  } catch (e) {
    // Demo mode
    currentUser.firstname = firstname;
    currentUser.lastname = lastname;
    currentUser.profile_pic = newProfilePic;
    sessionStorage.setItem('bw_user', JSON.stringify(currentUser));
    bootApp();
    showEl(successEl, 'Profile updated in demo mode.');
  }
  profilePicData = null; // Reset after update
}

async function requestPasswordChange() {
  const errEl = document.getElementById('password-change-error');
  const successEl = document.getElementById('password-change-success');
  // NOTE: Backend API for sending email is required.
  // This is a placeholder.
  try {
    // const res = await apiFetch('/auth/request-reset.php', { email: currentUser.email });
    // if (res.success) {
      showEl(successEl, 'Verification code sent to your email.');
      document.getElementById('password-request-form').classList.add('hidden');
      document.getElementById('password-reset-form').classList.remove('hidden');
    // } else {
    //   showError(errEl, res.message);
    // }
  } catch (e) {
    showError(errEl, 'This feature requires a server connection.');
  }
}

async function handlePasswordReset() {
  const code = document.getElementById('setting-code').value.trim();
  const newPassword = document.getElementById('setting-new-password').value;
  const errEl = document.getElementById('password-change-error');
  const successEl = document.getElementById('password-change-success');

  // NOTE: Backend API for password reset is required.
  showError(errEl, 'This feature is not yet connected to the backend.');
}

function clearAllPlans() {
  if (confirm('Are you sure you want to delete all locally saved plans? This cannot be undone.')) {
    localStorage.removeItem('bw_plans_' + (currentUser?.id || 'demo'));
    showToast('All local plans have been cleared.', 'success');
    loadDashboard();
  }
}

// =============================================
// API HELPER
// =============================================
async function apiFetch(path, body = {}) {
  const response = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

// =============================================
// UTILS
// =============================================
function formatCurrency(amount, currency) {
  const num = parseFloat(amount) || 0;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  return `${currency} ${formatted}`;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function showEl(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.add('hidden'), 3500);
}
