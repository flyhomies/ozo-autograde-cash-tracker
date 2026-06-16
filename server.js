
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());

// Default data - Car Wash & AdBlue business
const defaultData = {
    transactions: [],
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
    ],
    invoices: [
        { id: 1, number: 'INV-001', date: '2026-05-15', customer: 'Rajesh Kumar', type: 'income', category: 'AdBlue Filling', amount: 2500, status: 'Paid' },
        { id: 2, number: 'INV-002', date: '2026-05-18', customer: 'Suresh Transport', type: 'income', category: 'Car Wash (Premium)', amount: 1200, status: 'Pending' },
        { id: 3, number: 'INV-003', date: '2026-05-22', customer: 'Ajay Singh', type: 'income', category: 'Interior Cleaning', amount: 800, status: 'Paid' }
    ],
    savedInvoices: [
        { id: 101, number: 'SAV-001', date: '2026-06-01', customer: 'New Customer', type: 'income', category: 'Car Wash (Basic)', amount: 500, status: 'Draft' }
    ],
    recentActivities: [
        { id: 1, type: 'Transaction', action: 'Added', details: 'AdBlue Filling - ₹2500', date: '2026-06-09 14:30' },
        { id: 2, type: 'Invoice', action: 'Updated', details: 'INV-002 status changed to Pending', date: '2026-06-09 13:15' },
        { id: 3, type: 'Invoice', action: 'Created', details: 'SAV-001 saved as Draft', date: '2026-06-01 10:00' }
    ]
};

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const rawData = fs.readFileSync(DATA_FILE, 'utf8');
            const parsedData = JSON.parse(rawData);
            return {
                transactions: parsedData.transactions || [],
                incomeCategories: defaultData.incomeCategories,
                expenseCategories: defaultData.expenseCategories,
                invoices: parsedData.invoices || defaultData.invoices,
                savedInvoices: parsedData.savedInvoices || defaultData.savedInvoices,
                recentActivities: parsedData.recentActivities || defaultData.recentActivities
            };
        }
    } catch (e) {
        console.error('Error loading data:', e);
    }
    return defaultData;
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ------------------------------ API ROUTES ------------------------------

// Get all transactions
app.get('/api/transactions', (req, res) => {
    const data = loadData();
    res.json(data.transactions);
});

// Add transaction
app.post('/api/transactions', (req, res) => {
    const data = loadData();
    const transaction = {
        id: Date.now(),
        date: req.body.date,
        category: req.body.category,
        details: req.body.details || '',
        amount: req.body.amount,
        type: req.body.type
    };
    data.transactions.push(transaction);
    data.recentActivities.unshift({
        id: Date.now(),
        type: 'Transaction',
        action: 'Added',
        details: `${req.body.category} - ₹${req.body.amount}`,
        date: new Date().toLocaleString()
    });
    saveData(data);
    res.json(transaction);
});

// Delete transaction
app.delete('/api/transactions/:id', (req, res) => {
    const data = loadData();
    data.transactions = data.transactions.filter(t => t.id !== parseInt(req.params.id));
    data.recentActivities.unshift({
        id: Date.now(),
        type: 'Transaction',
        action: 'Deleted',
        details: `Transaction removed`,
        date: new Date().toLocaleString()
    });
    saveData(data);
    res.json({ success: true });
});

// Get categories
app.get('/api/categories', (req, res) => {
    const data = loadData();
    res.json({
        incomeCategories: data.incomeCategories,
        expenseCategories: data.expenseCategories
    });
});

// Get summary
app.get('/api/summary', (req, res) => {
    const { month, year } = req.query;
    const data = loadData();
    const transactions = data.transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === parseInt(month) && date.getFullYear() === parseInt(year);
    });

    const summary = {
        personalIncome: 0,
        businessIncome: 0,
        totalIncome: 0,
        personalExpenses: 0,
        businessExpenses: 0,
        totalExpenses: 0,
        categories: {}
    };

    transactions.forEach(t => {
        if (t.type === 'income') {
            summary.totalIncome += parseFloat(t.amount);
            if (t.category === 'Business Income') {
                summary.businessIncome += parseFloat(t.amount);
            } else {
                summary.personalIncome += parseFloat(t.amount);
            }
        } else {
            summary.totalExpenses += parseFloat(t.amount);
            if (t.category === 'Business Expenses') {
                summary.businessExpenses += parseFloat(t.amount);
            } else {
                summary.personalExpenses += parseFloat(t.amount);
            }
            if (!summary.categories[t.category]) summary.categories[t.category] = 0;
            summary.categories[t.category] += parseFloat(t.amount);
        }
    });

    summary.personalSavings = summary.personalIncome - summary.personalExpenses;
    summary.businessSavings = summary.businessIncome - summary.businessExpenses;
    summary.totalSavings = summary.totalIncome - summary.totalExpenses;

    res.json(summary);
});

// Invoices
app.get('/api/invoices', (req, res) => {
    const data = loadData();
    res.json({ invoices: data.invoices, savedInvoices: data.savedInvoices });
});

app.post('/api/invoices', (req, res) => {
    const data = loadData();
    const invoice = {
        id: Date.now(),
        number: req.body.number,
        date: req.body.date,
        customer: req.body.customer,
        type: req.body.type,
        category: req.body.category,
        amount: parseFloat(req.body.amount),
        status: req.body.status || 'Pending'
    };
    data.invoices.push(invoice);
    data.recentActivities.unshift({
        id: Date.now(),
        type: 'Invoice',
        action: 'Created',
        details: `${invoice.number} created for ${invoice.customer}`,
        date: new Date().toLocaleString()
    });
    saveData(data);
    res.json(invoice);
});

app.put('/api/invoices/:id', (req, res) => {
    const data = loadData();
    const index = data.invoices.findIndex(inv => inv.id === parseInt(req.params.id));
    if (index !== -1) {
        data.invoices[index] = { ...data.invoices[index], ...req.body };
        data.recentActivities.unshift({
            id: Date.now(),
            type: 'Invoice',
            action: 'Updated',
            details: `${data.invoices[index].number} updated`,
            date: new Date().toLocaleString()
        });
        saveData(data);
        res.json(data.invoices[index]);
    } else {
        res.status(404).json({ error: 'Invoice not found' });
    }
});

app.delete('/api/invoices/:id', (req, res) => {
    const data = loadData();
    data.invoices = data.invoices.filter(inv => inv.id !== parseInt(req.params.id));
    data.recentActivities.unshift({
        id: Date.now(),
        type: 'Invoice',
        action: 'Deleted',
        details: 'Invoice removed',
        date: new Date().toLocaleString()
    });
    saveData(data);
    res.json({ success: true });
});

// Saved Invoices
app.get('/api/saved-invoices', (req, res) => {
    const data = loadData();
    res.json(data.savedInvoices);
});

app.post('/api/saved-invoices', (req, res) => {
    const data = loadData();
    const savedInvoice = {
        id: Date.now(),
        number: req.body.number,
        date: req.body.date,
        customer: req.body.customer,
        type: req.body.type,
        category: req.body.category,
        amount: parseFloat(req.body.amount),
        status: req.body.status || 'Draft'
    };
    data.savedInvoices.push(savedInvoice);
    data.recentActivities.unshift({
        id: Date.now(),
        type: 'Invoice',
        action: 'Saved',
        details: `${savedInvoice.number} saved as Draft`,
        date: new Date().toLocaleString()
    });
    saveData(data);
    res.json(savedInvoice);
});

// Activities
app.get('/api/activities', (req, res) => {
    const data = loadData();
    res.json(data.recentActivities);
});

// Export Excel
app.get('/api/export', (req, res) => {
    const data = loadData();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.transactions), 'Transactions');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.invoices), 'Invoices');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=ozo_autograde.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// Explicit index route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files
app.use(express.static('public'));

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
