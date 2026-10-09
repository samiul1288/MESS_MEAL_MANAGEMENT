// ============================================================
// MessMate — Routes: Reports
// ============================================================

const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports');
const authMiddleware = require('../middleware/auth');

// Reports include group-wide and cross-member data.
router.use(authMiddleware.isAdmin);

// GET /reports — Dashboard
router.get('/', reportsController.dashboard);
router.get('/monthly', reportsController.monthlyReport);

// GET /reports/meals — Meal report
router.get('/meals', reportsController.mealsReport);

// GET /reports/expenses — Expense report
router.get('/expenses', reportsController.expensesReport);

// GET /reports/payments — Payments report
router.get('/payments', reportsController.paymentsReport);

module.exports = router;
