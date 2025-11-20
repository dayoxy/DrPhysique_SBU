// Updated staff.js - Fixed performance score calculation
document.addEventListener('DOMContentLoaded', async () => {
  const sbuSelects = ['sbu', 'expense-sbu', 'budget-sbu', 'kpi-sbu'];
  const sbuListEl = document.getElementById('sbu-list');

  // Fetch SBUs
  let sbus = [];
  try {
    const res = await fetch(`${API_BASE}/sbus`);
    if (res.ok) {
      sbus = await res.json();
    }
  } catch (err) {
    console.error('Failed to load SBUs:', err);
  }

  // Populate all SBU selects
  sbuSelects.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">Select SBU</option>';
    sbus.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      sel.appendChild(opt);
    });
  });

  // Populate sidebar list
  if (sbuListEl) {
    sbuListEl.innerHTML = '';
    sbus.forEach(s => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#" data-sbu="${s.name}">${s.name}</a>`;
      sbuListEl.appendChild(li);
    });
  }

  // Sales submit - WORKING
  const salesForm = document.getElementById('sales-form');
  if (salesForm) {
    salesForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sbuEl = document.getElementById('sbu');
      const amountEl = document.getElementById('sales-amount');
      if (!sbuEl) { alert('SBU selector not found'); return; }
      if (!amountEl) { alert('Sales amount input not found'); return; }
      const sbu_id = parseInt(sbuEl.value);
      if (isNaN(sbu_id)) { alert('Please select an SBU'); return; }
      const amount = parseFloat(amountEl.value);
      if (isNaN(amount)) { alert('Please enter a valid amount'); return; }
      
      // Get current day
      const now = new Date();
      const day = now.getDate();
      
      const body = { sbu_id, amount, day };
      const r = await fetchJSON(`${API_BASE}/staff/submit/sale`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body) 
      });
      
      if (r.ok) {
        alert('Sales submitted successfully!');
        e.target.reset();
        // Refresh performance chart after new submission
        setTimeout(loadStaffPerformanceChart, 1000);
      } else {
        const err = await r.json();
        alert('Error: ' + (err.detail || JSON.stringify(err)));
      }
    });
  }

  // Expenditure submit - FIXED VERSION
  const expensesForm = document.getElementById('expenses-form');
  if (expensesForm) {
    expensesForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sbuEl = document.getElementById('expense-sbu');
      const amountEl = document.getElementById('expense-amount');
      const categoryEl = document.getElementById('expense-category');
      
      if (!sbuEl) { alert('Expense SBU selector not found'); return; }
      if (!amountEl) { alert('Expense amount input not found'); return; }
      if (!categoryEl) { alert('Expense category selector not found'); return; }
      
      const sbu_id = parseInt(sbuEl.value);
      if (isNaN(sbu_id)) { alert('Please select an SBU for expense'); return; }
      
      const amount = parseFloat(amountEl.value);
      if (isNaN(amount)) { alert('Please enter a valid expense amount'); return; }
      
      const category = categoryEl.value;
      if (!category) { alert('Please select an expense category'); return; }
      
      // Get current day
      const now = new Date();
      const day = now.getDate();
      
      const body = { sbu_id, amount, day, category };
      const r = await fetchJSON(`${API_BASE}/staff/submit/expenditure`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body) 
      });
      
      if (r.ok) {
        alert('Expense submitted successfully!');
        e.target.reset();
        // Refresh performance chart after new submission
        setTimeout(loadStaffPerformanceChart, 1000);
      } else {
        const err = await r.json();
        alert('Error: ' + (err.detail || JSON.stringify(err)));
      }
    });
  }

  // Budget submit - FIXED (now shows SBUs)
  const budgetForm = document.getElementById('budget-form');
  if (budgetForm) {
    budgetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sbuEl = document.getElementById('budget-sbu');
      const amountEl = document.getElementById('budget-amount');
      
      if (!sbuEl) { alert('Budget SBU selector not found'); return; }
      if (!amountEl) { alert('Budget amount input not found'); return; }
      
      const sbu_id = parseInt(sbuEl.value);
      if (isNaN(sbu_id)) { alert('Please select an SBU for budget'); return; }
      
      const amount = parseFloat(amountEl.value);
      if (isNaN(amount)) { alert('Please enter a valid budget amount'); return; }
      
      // Get current day
      const now = new Date();
      const day = now.getDate();
      
      const body = { sbu_id, amount, day };
      
      // For now, show message since budget endpoint might not be implemented
      alert('Budget submission will be available soon. SBU Heads will use this to set daily budgets.');
      e.target.reset();
    });
  }

  // Tab switching functionality
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab') + '-tab';
      document.getElementById(tabId).classList.add('active');
    });
  });

  // NEW: Load Staff Performance Chart
  async function loadStaffPerformanceChart() {
    try {
      // Get current user's submissions for the current month
      const salesRes = await fetchJSON(`${API_BASE}/staff/my-sales`, { method: 'GET' });
      const expensesRes = await fetchJSON(`${API_BASE}/staff/my-expenses`, { method: 'GET' });
      
      let salesData = [];
      let expensesData = [];
      
      if (salesRes.ok) {
        salesData = await salesRes.json();
      } else {
        console.log('Sales endpoint not available yet');
      }
      
      if (expensesRes.ok) {
        expensesData = await expensesRes.json();
      } else {
        console.log('Expenses endpoint not available yet');
      }
      
      // Process data for chart - ONLY use actual submitted data
      const dailyPerformance = Array(31).fill(0).map((_, index) => {
        const day = index + 1;
        const daySales = salesData.filter(s => s.day === day).reduce((sum, s) => sum + (s.amount || 0), 0);
        const dayExpenses = expensesData.filter(e => e.day === day).reduce((sum, e) => sum + (e.amount || 0), 0);
        const netProfit = daySales - dayExpenses;
        return { day, sales: daySales, expenses: dayExpenses, netProfit };
      });

      // Calculate monthly totals and averages - ONLY from actual data
      const totalSales = dailyPerformance.reduce((sum, day) => sum + day.sales, 0);
      const totalExpenses = dailyPerformance.reduce((sum, day) => sum + day.expenses, 0);
      const totalNetProfit = totalSales - totalExpenses;
      
      // Only calculate averages if there's actual data
      const daysWithData = dailyPerformance.filter(day => day.sales > 0 || day.expenses > 0).length;
      const averageDailySales = daysWithData > 0 ? totalSales / daysWithData : 0;
      const averageDailyExpenses = daysWithData > 0 ? totalExpenses / daysWithData : 0;
      const averageDailyNet = daysWithData > 0 ? totalNetProfit / daysWithData : 0;

      // Update performance cards
      updatePerformanceCards(totalSales, totalExpenses, totalNetProfit, averageDailySales, averageDailyExpenses, averageDailyNet);
      
      // Create or update chart
      createPerformanceChart(dailyPerformance);
      
    } catch (error) {
      console.error('Error loading performance data:', error);
      // Show empty state
      updatePerformanceCards(0, 0, 0, 0, 0, 0);
      createPerformanceChart([]);
    }
  }

  function updatePerformanceCards(totalSales, totalExpenses, totalNetProfit, avgSales, avgExpenses, avgNet) {
    const cardsContainer = document.getElementById('dashboard-cards');
    if (!cardsContainer) return;
    
    const hasData = totalSales > 0 || totalExpenses > 0;
    
    cardsContainer.innerHTML = `
      <div class="card">
        <h3>Monthly Sales</h3>
        <div class="value" style="color: ${totalSales > 0 ? '#27ae60' : '#666'};">${totalSales > 0 ? '₦' + formatNumber(totalSales) : 'No data'}</div>
        <div style="font-size: 0.8rem; color: #666;">${avgSales > 0 ? 'Avg: ₦' + formatNumber(avgSales) + '/day' : 'Submit sales to see data'}</div>
      </div>
      <div class="card">
        <h3>Monthly Expenses</h3>
        <div class="value" style="color: ${totalExpenses > 0 ? '#e74c3c' : '#666'};">${totalExpenses > 0 ? '₦' + formatNumber(totalExpenses) : 'No data'}</div>
        <div style="font-size: 0.8rem; color: #666;">${avgExpenses > 0 ? 'Avg: ₦' + formatNumber(avgExpenses) + '/day' : 'Submit expenses to see data'}</div>
      </div>
      <div class="card">
        <h3>Net Profit</h3>
        <div class="value" style="color: ${totalNetProfit !== 0 ? (totalNetProfit >= 0 ? '#27ae60' : '#e74c3c') : '#666'};">
          ${totalNetProfit !== 0 ? '₦' + formatNumber(totalNetProfit) : 'No data'}
        </div>
        <div style="font-size: 0.8rem; color: #666;">${avgNet !== 0 ? 'Avg: ₦' + formatNumber(avgNet) + '/day' : 'Submit data to see net profit'}</div>
      </div>
      <div class="card">
        <h3>Performance Score</h3>
        <div class="value" style="color: #2c7db7;">${hasData ? calculatePerformanceScore(totalSales, totalExpenses) + '%' : 'No data'}</div>
        <div style="font-size: 0.8rem; color: #666;">${hasData ? 'Based on sales vs expenses' : 'Submit data for score'}</div>
      </div>
    `;
  }

  function calculatePerformanceScore(sales, expenses) {
    // Only calculate if there's actual sales data
    if (sales === 0) return 0;
    const profitMargin = ((sales - expenses) / sales) * 100;
    return Math.max(0, Math.min(100, Math.round(profitMargin + 50)));
  }

  function createPerformanceChart(dailyPerformance) {
    const ctx = document.getElementById('staffPerformanceChart');
    if (!ctx) {
      console.log('Performance chart canvas not found');
      return;
    }

    // Destroy existing chart if it exists
    if (window.staffPerformanceChart instanceof Chart) {
      window.staffPerformanceChart.destroy();
    }

    const days = dailyPerformance.map(d => `Day ${d.day}`);
    const salesData = dailyPerformance.map(d => d.sales);
    const expensesData = dailyPerformance.map(d => d.expenses);
    const netData = dailyPerformance.map(d => d.netProfit);

    // Check if we have any data to show
    const hasData = salesData.some(val => val > 0) || expensesData.some(val => val > 0);

    if (!hasData) {
      // Show placeholder message
      ctx.style.display = 'none';
      const chartContainer = ctx.closest('.chart-container');
      if (chartContainer) {
        const placeholder = chartContainer.querySelector('.no-data-placeholder') || document.createElement('div');
        placeholder.className = 'no-data-placeholder';
        placeholder.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #666;">
            <h3>No Performance Data Yet</h3>
            <p>Submit sales and expenses to see your performance chart</p>
          </div>
        `;
        if (!chartContainer.querySelector('.no-data-placeholder')) {
          chartContainer.appendChild(placeholder);
        }
      }
      return;
    }

    // Show chart
    ctx.style.display = 'block';
    const placeholder = ctx.closest('.chart-container').querySelector('.no-data-placeholder');
    if (placeholder) placeholder.remove();

    window.staffPerformanceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [
          {
            label: 'Sales',
            data: salesData,
            backgroundColor: '#27ae60',
            borderColor: '#27ae60',
            borderWidth: 1
          },
          {
            label: 'Expenses',
            data: expensesData,
            backgroundColor: '#e74c3c',
            borderColor: '#e74c3c',
            borderWidth: 1
          },
          {
            label: 'Net Profit',
            data: netData,
            type: 'line',
            backgroundColor: 'rgba(44, 125, 183, 0.1)',
            borderColor: '#2c7db7',
            borderWidth: 2,
            pointBackgroundColor: '#2c7db7',
            pointBorderColor: '#2c7db7',
            pointRadius: 4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Your Daily Performance (This Month)'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ₦${formatNumber(context.raw)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '₦' + formatNumber(value);
              }
            }
          }
        }
      }
    });
  }

  function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(Math.round(num || 0));
  }

  // Load performance chart when page loads
  setTimeout(loadStaffPerformanceChart, 500);
});