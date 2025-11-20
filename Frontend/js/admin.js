// frontend/js/admin.js - Complete Working Version with Password Toggle Fix
const API_BASE = 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize admin dashboard
    initializeAdminDashboard();
});

async function initializeAdminDashboard() {
    // Check authentication and role
    if (!await verifyAdminAccess()) {
        return;
    }

    try {
        // Load user info
        const userResponse = await fetchJSON(`${API_BASE}/me`);
        if (userResponse.ok) {
            const user = await userResponse.json();
            document.getElementById('admin-name').textContent = user.username;
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }

    // Load initial data
    await loadEmployees();
    await loadSbus();
    await loadCurrency();

    // Setup event listeners
    setupEventListeners();
}

// Security check for admin page
async function verifyAdminAccess() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }

    try {
        // Verify token and role
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    } catch (error) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return false;
    }
}

function setupEventListeners() {
    // Create employee form
    const employeeForm = document.getElementById('employee-form');
    if (employeeForm) {
        employeeForm.addEventListener('submit', handleCreateEmployee);
    }

    // Currency form
    const currencyForm = document.getElementById('currency-form');
    if (currencyForm) {
        currencyForm.addEventListener('submit', handleUpdateCurrency);
    }

    // SBU form
    const sbuForm = document.getElementById('sbu-form');
    if (sbuForm) {
        sbuForm.addEventListener('submit', handleCreateSBU);
    }

    // Report loading
    const loadReportBtn = document.getElementById('load-report');
    if (loadReportBtn) {
        loadReportBtn.addEventListener('click', handleLoadReport);
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Password toggle and validation
    setupPasswordFeatures();
}

function setupPasswordFeatures() {
    const passwordInput = document.getElementById('emp-password');
    const passwordToggle = document.querySelector('.password-toggle');
    
    // Password input validation
    if (passwordInput) {
        passwordInput.addEventListener('input', function(e) {
            validatePassword(e.target.value);
        });
    }
    
    // Password toggle functionality
    if (passwordToggle) {
        passwordToggle.addEventListener('click', function() {
            togglePasswordVisibility();
        });
    }
}

// Password visibility toggle - FIXED VERSION
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('emp-password');
    const toggleIcon = document.querySelector('.password-toggle i');
    
    if (!passwordInput || !toggleIcon) {
        console.error('Password input or toggle icon not found');
        return;
    }
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}

function validatePassword(password) {
    const rules = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    // Update requirement indicators
    Object.keys(rules).forEach(rule => {
        const element = document.querySelector(`.requirement[data-rule="${rule}"]`);
        if (element) {
            element.classList.toggle('valid', rules[rule]);
        }
    });

    // Calculate strength score
    const strength = Object.values(rules).filter(Boolean).length;
    const percentage = (strength / 5) * 100;
    
    updatePasswordStrength(percentage);
    
    return Object.values(rules).every(Boolean);
}

function updatePasswordStrength(percentage) {
    const bar = document.getElementById('pw-bar');
    const text = document.getElementById('pw-text');
    
    if (!bar || !text) return;

    bar.style.width = percentage + '%';

    if (percentage < 20) {
        bar.style.background = '#e74c3c';
        text.textContent = 'Very Weak';
    } else if (percentage < 40) {
        bar.style.background = '#e67e22';
        text.textContent = 'Weak';
    } else if (percentage < 60) {
        bar.style.background = '#f1c40f';
        text.textContent = 'Fair';
    } else if (percentage < 80) {
        bar.style.background = '#2ecc71';
        text.textContent = 'Good';
    } else {
        bar.style.background = '#27ae60';
        text.textContent = 'Strong';
    }
}

// Update the handleCreateEmployee function to include password validation
async function handleCreateEmployee(e) {
    e.preventDefault();
    
    const username = document.getElementById('emp-username').value.trim();
    const password = document.getElementById('emp-password').value;
    const role = document.getElementById('emp-role').value;

    if (!username || !password) {
        showAdminMessage('Please fill in all required fields', 'error');
        return;
    }

    // Validate password strength
    if (!validatePassword(password)) {
        showAdminMessage('Password does not meet security requirements. Please check the requirements below.', 'error');
        return;
    }

    try {
        const response = await fetchJSON(`${API_BASE}/admin/create-employee`, {
            method: 'POST',
            body: JSON.stringify({ username, password, role })
        });

        if (response.ok) {
            showAdminMessage('Employee created successfully!', 'success');
            document.getElementById('employee-form').reset();
            // Reset password strength indicator
            updatePasswordStrength(0);
            // Reset requirement indicators
            document.querySelectorAll('.requirement').forEach(req => {
                req.classList.remove('valid');
            });
            await loadEmployees(); // Refresh the list
        } else {
            const error = await response.json();
            showAdminMessage(error.detail || 'Failed to create employee', 'error');
        }
    } catch (error) {
        showAdminMessage('Network error: ' + error.message, 'error');
    }
}

async function handleUpdateCurrency(e) {
    e.preventDefault();
    
    const salesRate = parseFloat(document.getElementById('sales-rate').value);
    const expenseRate = parseFloat(document.getElementById('expense-rate').value);
    const budgetRate = parseFloat(document.getElementById('budget-rate').value);

    try {
        const response = await fetchJSON(`${API_BASE}/admin/currency`, {
            method: 'POST',
            body: JSON.stringify({ sales_rate: salesRate, expense_rate: expenseRate, budget_rate: budgetRate })
        });

        if (response.ok) {
            showAdminMessage('Currency rates updated successfully!', 'success');
            await loadCurrency(); // Refresh display
        } else {
            const error = await response.json();
            showAdminMessage(error.detail || 'Failed to update currency rates', 'error');
        }
    } catch (error) {
        showAdminMessage('Network error: ' + error.message, 'error');
    }
}

async function handleCreateSBU(e) {
    e.preventDefault();
    
    const name = document.getElementById('sbu-name').value.trim();
    const description = document.getElementById('sbu-desc').value.trim();

    if (!name) {
        showAdminMessage('Please enter an SBU name', 'error');
        return;
    }

    try {
        const response = await fetchJSON(`${API_BASE}/admin/sbus`, {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });

        if (response.ok) {
            showAdminMessage('SBU created successfully!', 'success');
            document.getElementById('sbu-form').reset();
            await loadSbus(); // Refresh the SBU list
        } else {
            const error = await response.json();
            showAdminMessage(error.detail || 'Failed to create SBU', 'error');
        }
    } catch (error) {
        showAdminMessage('Network error: ' + error.message, 'error');
    }
}

async function handleLoadReport(e) {
    e.preventDefault();
    
    const sbuSelect = document.getElementById('report-sbu');
    const sbuName = sbuSelect.value;

    if (!sbuName) {
        showAdminMessage('Please select an SBU', 'error');
        return;
    }

    try {
        const response = await fetchJSON(`${API_BASE}/staff/report/${encodeURIComponent(sbuName)}`);
        
        if (response.ok) {
            const report = await response.json();
            renderReport(report);
        } else {
            const error = await response.json();
            showAdminMessage(error.detail || 'Failed to load report', 'error');
        }
    } catch (error) {
        showAdminMessage('Network error: ' + error.message, 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

async function loadEmployees() {
    try {
        const response = await fetchJSON(`${API_BASE}/admin/employees`);
        
        if (!response.ok) {
            await handleAdminFetchError(response, 'Failed to load employees');
            return;
        }

        const employees = await response.json();
        updateEmployeesDisplay(employees);
        
    } catch (error) {
        console.error('Error loading employees:', error);
        showAdminMessage('Error loading employees', 'error');
    }
}

function updateEmployeesDisplay(employees) {
    // Update dashboard count
    const countElement = document.getElementById('total-employees');
    if (countElement) {
        countElement.textContent = employees.length;
    }

    // Update table
    const tbody = document.querySelector('#employees-table tbody');
    if (!tbody) return;

    if (employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-users fa-2x" style="margin-bottom: 15px; opacity: 0.5;"></i>
                    <div>No employees created yet</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = employees.map(employee => `
        <tr>
            <td>${employee.id}</td>
            <td>${employee.username}</td>
            <td><span class="role-badge ${employee.role}">${employee.role}</span></td>
            <td>
                <button class="btn-delete" onclick="deleteEmployee(${employee.id}, '${employee.username}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

async function deleteEmployee(employeeId, username) {
    if (!confirm(`Are you sure you want to delete employee "${username}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetchJSON(`${API_BASE}/admin/employees/${employeeId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showAdminMessage('Employee deleted successfully!', 'success');
            await loadEmployees(); // Refresh the list
        } else {
            const error = await response.json();
            showAdminMessage(error.detail || 'Failed to delete employee', 'error');
        }
    } catch (error) {
        showAdminMessage('Network error: ' + error.message, 'error');
    }
}

async function loadSbus() {
    try {
        const response = await fetchJSON(`${API_BASE}/sbus`);
        
        if (!response.ok) {
            await handleAdminFetchError(response, 'Failed to load SBUs');
            return;
        }

        const sbus = await response.json();
        updateSbusDisplay(sbus);
        
    } catch (error) {
        console.error('Error loading SBUs:', error);
        showAdminMessage('Error loading SBUs', 'error');
    }
}

function updateSbusDisplay(sbus) {
    // Update dashboard count
    const countElement = document.getElementById('total-sbus');
    if (countElement) {
        countElement.textContent = sbus.length;
    }

    // Update report dropdown
    const reportSelect = document.getElementById('report-sbu');
    if (reportSelect) {
        reportSelect.innerHTML = '<option value="">Select SBU</option>' +
            sbus.map(sbu => `<option value="${sbu.name}">${sbu.name}</option>`).join('');
    }

    // Update SBU cards
    const cardsContainer = document.getElementById('sbu-cards-container');
    if (cardsContainer) {
        if (sbus.length === 0) {
            cardsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-building fa-3x" style="margin-bottom: 20px; opacity: 0.5;"></i>
                    <h3>No SBUs Created Yet</h3>
                    <p>Use the form above to create your first SBU</p>
                </div>
            `;
        } else {
            cardsContainer.innerHTML = sbus.map(sbu => `
                <div class="card">
                    <h3>${sbu.name}</h3>
                    <div class="value" style="color: #666;">Active</div>
                    <div class="trend">${sbu.description || 'No description available'}</div>
                </div>
            `).join('');
        }
    }
}

async function loadCurrency() {
    try {
        const response = await fetchJSON(`${API_BASE}/admin/currency`);
        
        if (!response.ok) {
            await handleAdminFetchError(response, 'Failed to load currency rates');
            return;
        }

        const currency = await response.json();
        updateCurrencyDisplay(currency);
        
    } catch (error) {
        console.error('Error loading currency:', error);
        showAdminMessage('Error loading currency rates', 'error');
    }
}

function updateCurrencyDisplay(currency) {
    // Update form fields
    const salesRate = document.getElementById('sales-rate');
    const expenseRate = document.getElementById('expense-rate');
    const budgetRate = document.getElementById('budget-rate');
    
    if (salesRate) salesRate.value = currency.sales_rate || 1.0;
    if (expenseRate) expenseRate.value = currency.expense_rate || 1.0;
    if (budgetRate) budgetRate.value = currency.budget_rate || 1.0;

    // Update display
    const display = document.getElementById('currency-display');
    if (display) {
        display.innerHTML = `
            <i class="fas fa-info-circle"></i> 
            Current Rates: Sales: ${currency.sales_rate} | Expense: ${currency.expense_rate} | Budget: ${currency.budget_rate}
        `;
    }
}

async function handleAdminFetchError(response, fallbackMessage) {
    if (response.status === 401) {
        showAdminMessage('Not authorized. Please login again.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    let message = fallbackMessage;
    try {
        const body = await response.text();
        if (body) {
            const errorData = JSON.parse(body);
            message = errorData.detail || message;
        }
    } catch (e) {
        // Ignore parsing errors
    }

    showAdminMessage(message, 'error');
}

function showAdminMessage(message, type = 'info') {
    const messageDiv = document.getElementById('admin-message');
    if (!messageDiv) return;

    // Clear existing classes
    messageDiv.className = '';
    
    // Set background color based on type
    if (type === 'success') {
        messageDiv.style.background = '#d4edda';
        messageDiv.style.color = '#155724';
        messageDiv.style.borderLeftColor = '#28a745';
    } else if (type === 'error') {
        messageDiv.style.background = '#f8d7da';
        messageDiv.style.color = '#721c24';
        messageDiv.style.borderLeftColor = '#dc3545';
    } else if (type === 'warning') {
        messageDiv.style.background = '#fff3cd';
        messageDiv.style.color = '#856404';
        messageDiv.style.borderLeftColor = '#ffc107';
    } else {
        messageDiv.style.background = '#d1ecf1';
        messageDiv.style.color = '#0c5460';
        messageDiv.style.borderLeftColor = '#17a2b8';
    }

    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    messageDiv.style.padding = '12px';
    messageDiv.style.borderRadius = '8px';
    messageDiv.style.borderLeft = '4px solid';
    messageDiv.style.marginBottom = '20px';

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

function renderReport(report) {
    // Remove existing modal if present
    const existing = document.getElementById('report-modal-overlay');
    if (existing) existing.remove();

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'report-modal-overlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Arial, sans-serif'
    });

    // Create modal content
    const modal = document.createElement('div');
    Object.assign(modal.style, {
        background: '#fff',
        color: '#111',
        width: '95%',
        maxWidth: '1400px',
        maxHeight: '90vh',
        overflow: 'auto',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        padding: '20px',
        position: 'relative'
    });

    // Header with title and buttons
    const header = document.createElement('div');
    Object.assign(header.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '2px solid #2c7db7',
        paddingBottom: '10px'
    });

    const title = document.createElement('h2');
    title.textContent = `Financial Report - ${report.name || 'SBU'} - ${new Date().toLocaleDateString()}`;
    title.style.margin = '0';
    title.style.color = '#2c7db7';

    const buttonGroup = document.createElement('div');
    buttonGroup.style.display = 'flex';
    buttonGroup.style.gap = '10px';

    const printBtn = document.createElement('button');
    printBtn.textContent = 'Print';
    printBtn.style.cssText = 'background: #27ae60; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;';
    printBtn.onclick = () => window.print();

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;';
    closeBtn.onclick = () => overlay.remove();

    buttonGroup.appendChild(printBtn);
    buttonGroup.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(buttonGroup);
    modal.appendChild(header);

    // Add empty state message
    const emptyState = document.createElement('div');
    emptyState.style.cssText = 'text-align: center; padding: 60px; color: #666;';
    emptyState.innerHTML = `
        <i class="fas fa-chart-bar fa-4x" style="margin-bottom: 20px; opacity: 0.5;"></i>
        <h3>No Data Available</h3>
        <p>This SBU doesn't have any financial data yet. Staff members need to submit sales and expenses to see reports.</p>
    `;
    modal.appendChild(emptyState);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

// Utility function for API calls
async function fetchJSON(url, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        ...options
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Make functions available globally
window.togglePasswordVisibility = togglePasswordVisibility;
window.deleteEmployee = deleteEmployee;