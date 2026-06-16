const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const XLSX = require("xlsx");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const defaultCategories = {
  incomeCategories: [
    "AdBlue Filling",
    "Car Wash (Basic)",
    "Car Wash (Premium)",
    "Car Wash (Deluxe)",
    "Interior Cleaning",
    "Tire Polish",
    "Other Services"
  ],
  expenseCategories: [
    "AdBlue Purchase",
    "Cleaning Supplies",
    "Electricity",
    "Water Bill",
    "Rent",
    "Employee Wages",
    "Equipment Maintenance",
    "Marketing",
    "Insurance",
    "Other Expenses"
  ]
};

// Get categories
app.get("/api/categories", async (req, res) => {
  try {
    const doc = await db.collection("config").doc("categories").get();
    if (doc.exists) {
      res.json(doc.data());
    } else {
      await db.collection("config").doc("categories").set(defaultCategories);
      res.json(defaultCategories);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load categories" });
  }
});

// Get all transactions
app.get("/api/transactions", async (req, res) => {
  try {
    const snapshot = await db.collection("transactions").orderBy("date", "desc").get();
    const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load transactions" });
  }
});

// Add transaction
app.post("/api/transactions", async (req, res) => {
  try {
    const transaction = {
      date: req.body.date,
      type: req.body.type,
      category: req.body.category,
      details: req.body.details,
      amount: parseFloat(req.body.amount),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection("transactions").add(transaction);
    
    // Add activity
    await db.collection("activities").add({
      type: "Transaction",
      action: "Added",
      details: `${transaction.type} - ${transaction.category}: ₹${transaction.amount}`,
      date: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ id: docRef.id, ...transaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add transaction" });
  }
});

// Delete transaction
app.delete("/api/transactions/:id", async (req, res) => {
  try {
    await db.collection("transactions").doc(req.params.id).delete();
    
    await db.collection("activities").add({
      type: "Transaction",
      action: "Deleted",
      details: "Transaction removed",
      date: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

// Get invoices
app.get("/api/invoices", async (req, res) => {
  try {
    const invoicesSnapshot = await db.collection("invoices").orderBy("date", "desc").get();
    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const savedSnapshot = await db.collection("savedInvoices").orderBy("date", "desc").get();
    const savedInvoices = savedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ invoices, savedInvoices });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load invoices" });
  }
});

// Add invoice
app.post("/api/invoices", async (req, res) => {
  try {
    const invoice = {
      number: req.body.number,
      date: req.body.date,
      customer: req.body.customer,
      type: req.body.type,
      category: req.body.category,
      amount: parseFloat(req.body.amount),
      status: req.body.status,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection("invoices").add(invoice);
    
    await db.collection("activities").add({
      type: "Invoice",
      action: "Added",
      details: `Invoice ${invoice.number} for ${invoice.customer}`,
      date: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ id: docRef.id, ...invoice });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add invoice" });
  }
});

// Update invoice
app.put("/api/invoices/:id", async (req, res) => {
  try {
    const invoiceData = {
      number: req.body.number,
      date: req.body.date,
      customer: req.body.customer,
      type: req.body.type,
      category: req.body.category,
      amount: parseFloat(req.body.amount),
      status: req.body.status
    };
    await db.collection("invoices").doc(req.params.id).update(invoiceData);
    
    await db.collection("activities").add({
      type: "Invoice",
      action: "Updated",
      details: `Invoice ${invoiceData.number} updated`,
      date: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ id: req.params.id, ...invoiceData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

// Delete invoice
app.delete("/api/invoices/:id", async (req, res) => {
  try {
    await db.collection("invoices").doc(req.params.id).delete();
    
    await db.collection("activities").add({
      type: "Invoice",
      action: "Deleted",
      details: "Invoice removed",
      date: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

// Get activities
app.get("/api/activities", async (req, res) => {
  try {
    const snapshot = await db.collection("activities").orderBy("date", "desc").limit(50).get();
    const activities = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date ? data.date.toDate().toISOString() : new Date().toISOString()
      };
    });
    res.json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load activities" });
  }
});

// Get summary
app.get("/api/summary", async (req, res) => {
  try {
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);
    
    const snapshot = await db.collection("transactions")
      .where("date", ">=", startDate.toISOString().split('T')[0])
      .where("date", "<", endDate.toISOString().split('T')[0])
      .get();
      
    let totalIncome = 0;
    let totalExpense = 0;
    const categories = {};
    
    snapshot.docs.forEach(doc => {
      const t = doc.data();
      if (t.type === 'income') {
        totalIncome += parseFloat(t.amount);
      } else {
        totalExpense += parseFloat(t.amount);
        if (!categories[t.category]) categories[t.category] = 0;
        categories[t.category] += parseFloat(t.amount);
      }
    });
    
    res.json({
      totalIncome,
      totalExpense,
      totalSavings: totalIncome - totalExpense,
      personalIncome: totalIncome,
      personalExpenses: totalExpense,
      personalSavings: totalIncome - totalExpense,
      businessIncome: totalIncome,
      businessExpenses: totalExpense,
      businessSavings: totalIncome - totalExpense,
      categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load summary" });
  }
});

// Export to Excel
app.get("/api/export", async (req, res) => {
  try {
    const transactionsSnapshot = await db.collection("transactions").get();
    const invoicesSnapshot = await db.collection("invoices").get();
    
    const transactions = transactionsSnapshot.docs.map(doc => doc.data());
    const invoices = invoicesSnapshot.docs.map(doc => doc.data());
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transactions), 'Transactions');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoices), 'Invoices');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=ozo_autograde.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to export" });
  }
});

exports.api = functions.https.onRequest(app);