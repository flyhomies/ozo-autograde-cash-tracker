
// ------------------------------ GLOBAL STATE ------------------------------
let categories = {
    incomeCategories: [
        'AdBlue Filling',
        'Car Wash (Basic)',
        'Car Wash (Premium)',
        'Car Wash (Deluxe)',
        'Interior Cleaning',
        'Tire Polish',
        'Other Services'
    ],
    expenseCategories: [
        'AdBlue Purchase',
        'Cleaning Supplies',
        'Electricity',
        'Water Bill',
        'Rent',
        'Employee Wages',
        'Equipment Maintenance',
        'Marketing',
        'Insurance',
        'Other Expenses'
    ]
};
let currentTransactions = [];
let currentInvoices = [];
let currentSavedInvoices = [];
let currentActivities = [];
let activeTab = 'total';
let editingInvoiceId = null;

const PIN = '111606';

// Backend API URL (will be updated once Render backend is ready!)
const API_URL = 'https://ozo-autograde-cash-tracker.onrender.com';

// ------------------------------ DOM ELEMENTS ------------------------------
const elements = {
    pinScreen: document.getElementById('pinScreen'),
    dashboard: document.getElementById('dashboard'),
    pinInput: document.getElementById('pinInput'),
    pinSubmit: document.getElementById('pinSubmit'),
    pinError: document.getElementById('pinError'),
    transactionForm: document.getElementById('transactionForm'),
    dateInput: document.getElementById('date'),
    typeInput: document.getElementById('type'),
    categorySelect: document.getElementById('category'),
    detailsInput: document.getElementById('details'),
    amountInput: document.getElementById('amount'),
    monthYearInput: document.getElementById('monthYear'),
    searchTransactions: document.getElementById('searchTransactions'),
    searchInvoices: document.getElementById('searchInvoices'),
    exportBtn: document.getElementById('exportBtn'),
    transactionList: document.getElementById('transactionList'),
    invoiceList: document.getElementById('invoiceList'),
    savedInvoiceList: document.getElementById('savedInvoiceList'),
    activitiesList: document.getElementById('activitiesList'),
    totalIncome: document.getElementById('totalIncome'),
    totalExpense: document.getElementById('totalExpense'),
    savings: document.getElementById('savings'),
    todayIncome: document.getElementById('todayIncome'),
    todayExpense: document.getElementById('todayExpense'),
    categorySummary: document.getElementById('categorySummary'),
    invoiceModal: document.getElementById('invoiceModal'),
    closeModal: document.getElementById('closeModal'),
    cancelInvoice: document.getElementById('cancelInvoice'),
    invoiceForm: document.getElementById('invoiceForm'),
    modalTitle: document.getElementById('modalTitle'),
    addInvoiceBtn: document.getElementById('addInvoiceBtn'),
    typeToggles: document.querySelectorAll('.type-toggle .toggle-btn'),
    summaryTabs: document.querySelectorAll('.summary-tabs .tab-btn'),
    mainTabs: document.querySelectorAll('.tabs-bar .tab-btn'),
};

// ------------------------------ PIN SCREEN ------------------------------
function checkPin() {
    const entered = elements.pinInput.value;
    if (entered === PIN) {
        elements.pinScreen.style.display = 'none';
        elements.dashboard.style.display = 'block';
        initializeApp();
    } else {
        elements.pinError.classList.add('show');
        setTimeout(() => {
            elements.pinError.classList.remove('show');
        }, 3000);
        elements.pinInput.value = '';
    }
}

// ------------------------------ INITIALIZATION ------------------------------
async function initializeApp() {
    console.log('Initializing app...');
    // Set default dates
    const today = new Date();
    const currentMonthYear = today.toISOString().substring(0, 7);
    elements.dateInput.valueAsDate = today;
    elements.monthYearInput.value = currentMonthYear;

    // Load data
    await loadCategories();
    await loadTransactions();
    await loadInvoices();
    await loadActivities();
    await loadSummary();

    console.log('App initialized successfully');
}

function attachEventListeners() {
    // PIN events
    elements.pinSubmit.addEventListener('click', checkPin);
    elements.pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkPin();
    });

    // Transaction form
    elements.transactionForm.addEventListener('submit', handleAddTransaction);
    elements.typeToggles.forEach(btn => {
        btn.addEventListener('click', handleTypeToggle);
    });

    // Date and search
    elements.monthYearInput.addEventListener('change', loadSummary);
    elements.exportBtn.addEventListener('click', exportToExcel);
    elements.searchTransactions.addEventListener('input', handleTransactionSearch);
    elements.searchInvoices.addEventListener('input', handleInvoiceSearch);

    // Tabs
    elements.summaryTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.summaryTabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.tab;
            loadSummary();
        });
    });

    elements.mainTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            elements.mainTabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            document.getElementById(`${section}Tab`).classList.add('active');
        });
    });

    // Invoice modal
    elements.addInvoiceBtn.addEventListener('click', () => openInvoiceModal());
    elements.closeModal.addEventListener('click', closeInvoiceModal);
    elements.cancelInvoice.addEventListener('click', closeInvoiceModal);
    elements.invoiceForm.addEventListener('submit', handleInvoiceSubmit);

    // Invoice type change
    document.getElementById('invoiceType').addEventListener('change', updateInvoiceCategories);
}

// ------------------------------ CATEGORIES ------------------------------
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/api/categories`);
        if (response.ok) {
            categories = await response.json();
        }
        // If API fails, keep using our hardcoded fallback categories
        updateCategoryOptions();
    } catch (error) {
        console.error('Error loading categories:', error);
        // Use fallback categories if API fails
        updateCategoryOptions();
    }
}

function updateCategoryOptions() {
    const type = elements.typeInput.value;
    const catList = type === 'income' ? categories.incomeCategories : categories.expenseCategories;

    elements.categorySelect.innerHTML = catList
        .map(cat => `<option value="${cat}">${cat}</option>`)
        .join('');
}

function updateInvoiceCategories() {
    const invoiceType = document.getElementById('invoiceType').value;
    const invoiceCatList = invoiceType === 'income' ? categories.incomeCategories : categories.expenseCategories;
    const invoiceCatSelect = document.getElementById('invoiceCategory');

    invoiceCatSelect.innerHTML = invoiceCatList
        .map(cat => `<option value="${cat}">${cat}</option>`)
        .join('');
}

function handleTypeToggle(e) {
    const btn = e.target.closest('.toggle-btn');
    const type = btn.dataset.type;
    elements.typeInput.value = type;

    elements.typeToggles.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateCategoryOptions();
}

// ------------------------------ TRANSACTIONS ------------------------------
async function loadTransactions() {
    try {
        const response = await fetch(`${API_URL}/api/transactions`);
        if (response.ok) {
            currentTransactions = await response.json();
        }
        renderTransactions(currentTransactions);
        calculateTodayStats();
    } catch (error) {
        console.error('Error loading transactions:', error);
        renderTransactions(currentTransactions);
        calculateTodayStats();
    }
}

function renderTransactions(transactions) {
    const emptyState = document.getElementById('emptyTransactions');
    if (transactions.length === 0) {
        emptyState.style.display = 'block';
        elements.transactionList.innerHTML = '';
        return;
    }

    emptyState.style.display = 'none';

    const sortedTransactions = [...transactions].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );

    elements.transactionList.innerHTML = sortedTransactions
        .map(transaction => `
            <tr>
                <td>${new Date(transaction.date).toLocaleDateString('en-GB')}</td>
                <td>
                    <span class="type-badge ${transaction.type}">
                        <i class="fas fa-arrow-${transaction.type === 'income' ? 'up' : 'down'}"></i>
                        ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                    </span>
                </td>
                <td>${transaction.category}</td>
                <td>${transaction.details || '-'}</td>
                <td style="font-weight: 800; color: ${transaction.type === 'income' ? '#059669' : '#dc2626'}">
                    ${transaction.type === 'income' ? '+' : '-'}₹${parseFloat(transaction.amount).toFixed(2)}
                </td>
                <td>
                    <button class="delete-btn" onclick="deleteTransaction(${transaction.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `)
        .join('');
}

function handleTransactionSearch(e) {
    const query = e.target.value.toLowerCase();
    const filtered = currentTransactions.filter(t =>
        t.details?.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
    );
    renderTransactions(filtered);
}

async function handleAddTransaction(e) {
    e.preventDefault();

    const transaction = {
        date: elements.dateInput.value,
        type: elements.typeInput.value,
        category: elements.categorySelect.value,
        details: elements.detailsInput.value,
        amount: parseFloat(elements.amountInput.value),
    };

    try {
        const response = await fetch(`${API_URL}/api/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction),
        });

        if (response.ok) {
            // Reset form
            elements.transactionForm.reset();
            elements.dateInput.valueAsDate = new Date();
            elements.typeInput.value = 'income';
            elements.typeToggles.forEach(b => {
                b.classList.remove('active');
                if (b.dataset.type === 'income') b.classList.add('active');
            });
            updateCategoryOptions();

            // Reload data
            await loadTransactions();
            await loadActivities();
            await loadSummary();
        }
    } catch (error) {
        console.error('Error adding transaction:', error);
    }
}

async function deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        try {
            const response = await fetch(`${API_URL}/api/transactions/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                await loadTransactions();
                await loadActivities();
                await loadSummary();
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
        }
    }
}

function calculateTodayStats() {
    const today = new Date().toDateString();
    let income = 0;
    let expense = 0;

    currentTransactions.forEach(t => {
        if (new Date(t.date).toDateString() === today) {
            if (t.type === 'income') {
                income += parseFloat(t.amount);
            } else {
                expense += parseFloat(t.amount);
            }
        }
    });

    elements.todayIncome.textContent = `₹${income.toFixed(2)}`;
    elements.todayExpense.textContent = `₹${expense.toFixed(2)}`;
}

// ------------------------------ INVOICES ------------------------------
async function loadInvoices() {
    try {
        const response = await fetch(`${API_URL}/api/invoices`);
        if (response.ok) {
            const data = await response.json();
            currentInvoices = data.invoices;
            currentSavedInvoices = data.savedInvoices;
        }
        renderInvoices();
        renderSavedInvoices();
    } catch (error) {
        console.error('Error loading invoices:', error);
        renderInvoices();
        renderSavedInvoices();
    }
}

function renderInvoices(invoices = currentInvoices) {
    const emptyState = document.getElementById('emptyInvoices');

    if (invoices.length === 0) {
        emptyState.style.display = 'block';
        elements.invoiceList.innerHTML = '';
        return;
    }

    emptyState.style.display = 'none';
    const sortedInvoices = [...invoices].sort((a, b) => new Date(b.date) - new Date(a.date));

    elements.invoiceList.innerHTML = sortedInvoices
        .map(invoice => `
            <tr>
                <td><strong>${invoice.number}</strong></td>
                <td>${new Date(invoice.date).toLocaleDateString('en-GB')}</td>
                <td>${invoice.customer}</td>
                <td>${invoice.category}</td>
                <td style="font-weight: 800; color: ${invoice.type === 'income' ? '#059669' : '#dc2626'}">
                    ₹${parseFloat(invoice.amount).toFixed(2)}
                </td>
                <td><span class="status-badge ${invoice.status}">${invoice.status}</span></td>
                <td>
                    <button class="print-btn" onclick="printInvoice(${invoice.id})">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="edit-btn" onclick="editInvoice(${invoice.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteInvoice(${invoice.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `)
        .join('');
}

function renderSavedInvoices() {
    const sorted = [...currentSavedInvoices].sort((a, b) => new Date(b.date) - new Date(a.date));

    elements.savedInvoiceList.innerHTML = sorted
        .map(invoice => `
            <tr>
                <td><strong>${invoice.number}</strong></td>
                <td>${new Date(invoice.date).toLocaleDateString('en-GB')}</td>
                <td>${invoice.customer}</td>
                <td>${invoice.category}</td>
                <td style="font-weight: 800;">₹${parseFloat(invoice.amount).toFixed(2)}</td>
                <td>
                    <button class="edit-btn" onclick="editInvoice(${invoice.id}, true)">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteSavedInvoice(${invoice.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `)
        .join('');
}

function handleInvoiceSearch(e) {
    const query = e.target.value.toLowerCase();
    const filtered = currentInvoices.filter(inv =>
        inv.customer.toLowerCase().includes(query) ||
        inv.number.toLowerCase().includes(query) ||
        inv.category.toLowerCase().includes(query)
    );
    renderInvoices(filtered);
}

function openInvoiceModal(invoice = null) {
    elements.invoiceModal.classList.add('show');
    editingInvoiceId = invoice?.id || null;
    elements.modalTitle.textContent = invoice ? 'Edit Invoice' : 'Add New Invoice';
    document.getElementById('invoiceDate').valueAsDate = invoice ? new Date(invoice.date) : new Date();

    if (invoice) {
        document.getElementById('invoiceNumber').value = invoice.number;
        document.getElementById('invoiceCustomer').value = invoice.customer;
        document.getElementById('invoiceType').value = invoice.type;
        updateInvoiceCategories();
        document.getElementById('invoiceCategory').value = invoice.category;
        document.getElementById('invoiceAmount').value = invoice.amount;
        document.getElementById('invoiceStatus').value = invoice.status;
    } else {
        elements.invoiceForm.reset();
        document.getElementById('invoiceDate').valueAsDate = new Date();
        updateInvoiceCategories();
    }
}

function closeInvoiceModal() {
    elements.invoiceModal.classList.remove('show');
    editingInvoiceId = null;
}

async function handleInvoiceSubmit(e) {
    e.preventDefault();

    const invoiceData = {
        number: document.getElementById('invoiceNumber').value,
        date: document.getElementById('invoiceDate').value,
        customer: document.getElementById('invoiceCustomer').value,
        type: document.getElementById('invoiceType').value,
        category: document.getElementById('invoiceCategory').value,
        amount: parseFloat(document.getElementById('invoiceAmount').value),
        status: document.getElementById('invoiceStatus').value,
    };

    try {
        if (editingInvoiceId) {
            const response = await fetch(`${API_URL}/api/invoices/${editingInvoiceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData),
            });

            if (response.ok) {
                closeInvoiceModal();
                await loadInvoices();
                await loadActivities();
            }
        } else {
            const response = await fetch(`${API_URL}/api/invoices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData),
            });

            if (response.ok) {
                closeInvoiceModal();
                await loadInvoices();
                await loadActivities();
            }
        }
    } catch (error) {
        console.error('Error saving invoice:', error);
    }
}

function editInvoice(id, isSaved = false) {
    const list = isSaved ? currentSavedInvoices : currentInvoices;
    const invoice = list.find(inv => inv.id === id);
    if (invoice) openInvoiceModal(invoice);
}

function printInvoice(id) {
    alert(`Printing invoice #${id}`);
}

async function deleteInvoice(id) {
    if (confirm('Are you sure you want to delete this invoice?')) {
        try {
            const response = await fetch(`${API_URL}/api/invoices/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                await loadInvoices();
                await loadActivities();
            }
        } catch (error) {
            console.error('Error deleting invoice:', error);
        }
    }
}

async function deleteSavedInvoice(id) {
    if (confirm('Are you sure you want to delete this saved invoice?')) {
        alert('Saved invoice deleted!');
        await loadInvoices();
    }
}

// ------------------------------ ACTIVITIES ------------------------------
async function loadActivities() {
    try {
        const response = await fetch(`${API_URL}/api/activities`);
        if (response.ok) {
            currentActivities = await response.json();
        }
        renderActivities();
    } catch (error) {
        console.error('Error loading activities:', error);
        renderActivities();
    }
}

function renderActivities() {
    const sorted = [...currentActivities].sort((a, b) => new Date(b.date) - new Date(a.date));

    elements.activitiesList.innerHTML = sorted
        .map(activity => {
            let icon = 'fa-clock';
            if (activity.type === 'Transaction') icon = 'fa-receipt';
            if (activity.type === 'Invoice') icon = 'fa-file-invoice';
            if (activity.type === 'Saved Invoice') icon = 'fa-save';

            return `
                <div class="activity-item">
                    <i class="fas ${icon}"></i>
                    <div class="activity-content">
                        <strong>${activity.type} - ${activity.action}</strong>
                        <span>${activity.details}</span>
                    </div>
                    <span style="color: var(--text-light); font-size: 0.85rem;">
                        ${new Date(activity.date).toLocaleString()}
                    </span>
                </div>
            `;
        })
        .join('');
}

// ------------------------------ SUMMARY ------------------------------
async function loadSummary() {
    const [year, month] = elements.monthYearInput.value.split('-').map(Number);

    try {
        const response = await fetch(`${API_URL}/api/summary?month=${month - 1}&year=${year}`);
        if (response.ok) {
            const summary = await response.json();
            updateSummaryDisplay(summary);
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

function updateSummaryDisplay(summary) {
    let income, expense, savings;

    switch (activeTab) {
        case 'personal':
            income = summary.personalIncome;
            expense = summary.personalExpenses;
            savings = summary.personalSavings;
            break;
        case 'business':
            income = summary.businessIncome;
            expense = summary.businessExpenses;
            savings = summary.businessSavings;
            break;
        default:
            income = summary.totalIncome;
            expense = summary.totalExpenses;
            savings = summary.totalSavings;
    }

    elements.totalIncome.textContent = `₹${income.toFixed(2)}`;
    elements.totalExpense.textContent = `₹${expense.toFixed(2)}`;
    elements.savings.textContent = `₹${savings.toFixed(2)}`;

    elements.categorySummary.innerHTML = '';
    for (const [cat, amount] of Object.entries(summary.categories)) {
        const div = document.createElement('div');
        div.className = 'category-item';
        div.innerHTML = `<strong>${cat}</strong><span>₹${amount.toFixed(2)}</span>`;
        elements.categorySummary.appendChild(div);
    }
}

// ------------------------------ EXPORT ------------------------------
function exportToExcel() {
    window.location.href = `${API_URL}/api/export`;
}

// ------------------------------ START ------------------------------
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    attachEventListeners();
    // Show PIN screen initially
    elements.pinScreen.style.display = 'flex';
    elements.dashboard.style.display = 'none';
});
