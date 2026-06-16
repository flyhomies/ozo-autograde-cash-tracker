
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Test API
app.get('/api/test', (req, res) => {
    res.json({ message: 'Hello from server!' });
});

app.get('/api/categories', (req, res) => {
    res.json({
        incomeCategories: ['A', 'B', 'C'],
        expenseCategories: ['X', 'Y', 'Z']
    });
});

// Then static
app.use(express.static('public'));

app.listen(3000, () => {
    console.log('Test server running on http://localhost:3000');
});
