const { pool } = require('../config/db');
const { text, positiveInteger, validDate, validAmount } = require('../utils/validation');

const categories = ['food', 'medicine', 'repair', 'utility', 'miscellaneous'];

function validateExpense(body) {
  const expense = {
    mess_group_id: text(body.mess_group_id),
    expense_date: text(body.expense_date),
    category: text(body.category),
    description: text(body.description),
    amount: text(body.amount),
    vendor: text(body.vendor),
    payment_method: text(body.payment_method),
    notes: text(body.notes),
  };
  const errors = [];

  if (!positiveInteger(expense.mess_group_id)) errors.push('Select a valid mess group.');
  if (!validDate(expense.expense_date)) errors.push('Enter a valid expense date.');
  if (!categories.includes(expense.category)) errors.push('Select a valid expense category.');
  if (!expense.description || expense.description.length > 5000) errors.push('Description is required and must be at most 5,000 characters.');
  if (!validAmount(expense.amount)) errors.push('Amount must be a non-negative amount with up to two decimal places.');
  if (expense.vendor.length > 100) errors.push('Vendor must be at most 100 characters.');
  if (expense.payment_method.length > 30) errors.push('Payment method must be at most 30 characters.');
  if (expense.notes.length > 5000) errors.push('Notes must be at most 5,000 characters.');
  return { errors, expense };
}

async function loadGroups() {
  const result = await pool.query('SELECT id, name, code FROM mess_groups ORDER BY name');
  return result.rows;
}

async function loadMembers() {
  const result = await pool.query(
    `SELECT id, full_name, username
     FROM users
     WHERE role = 'member'
     ORDER BY full_name`
  );
  return result.rows;
}

exports.index = async (req, res) => {
  try {
    const params = [];
    const conditions = [];
    if (positiveInteger(req.query.mess_group_id)) {
      params.push(req.query.mess_group_id);
      conditions.push(`b.mess_group_id = $${params.length}`);
    }
    if (positiveInteger(req.query.member_id)) {
      params.push(req.query.member_id);
      conditions.push(`b.created_by = $${params.length}`);
    }
    const category = text(req.query.category);
    if (categories.includes(category)) {
      params.push(category);
      conditions.push(`b.category = $${params.length}`);
    }
    const search = text(req.query.search);
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(b.description ILIKE $${params.length} OR b.vendor ILIKE $${params.length})`);
    }
    if (validDate(req.query.date_from)) {
      params.push(req.query.date_from);
      conditions.push(`b.expense_date >= $${params.length}`);
    }
    if (validDate(req.query.date_to)) {
      params.push(req.query.date_to);
      conditions.push(`b.expense_date <= $${params.length}`);
    }
    const [expensesResult, messGroups, members] = await Promise.all([
      pool.query(
        `SELECT b.*, mg.name AS mess_group_name
         FROM bazar_expenses b
         JOIN mess_groups mg ON b.mess_group_id = mg.id
         WHERE ${conditions.length ? conditions.join(' AND ') : 'TRUE'}
         ORDER BY b.expense_date DESC
         LIMIT 100`,
        params
      ),
      loadGroups(),
      loadMembers(),
    ]);
    res.render('expenses/index', {
      title: 'Expenses — MessMate',
      expenses: expensesResult.rows.map((expense) => ({ ...expense, amount: Number(expense.amount) })),
      messGroups,
      members,
      categories,
      currentFilters: req.query,
    });
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to load expenses' });
  }
};

exports.createForm = async (req, res) => {
  try {
    res.render('expenses/create', {
      title: 'Add Expense — MessMate', messGroups: await loadGroups(), categories, formData: {}, validationErrors: [],
    });
  } catch (err) {
    console.error('Error loading expense form:', err);
    res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to load expense form' });
  }
};

exports.create = async (req, res) => {
  try {
    const { errors, expense } = validateExpense(req.body);
    const messGroups = await loadGroups();
    if (!messGroups.some((group) => String(group.id) === expense.mess_group_id)) errors.push('Select an existing mess group.');
    if (errors.length) {
      return res.status(400).render('expenses/create', {
        title: 'Add Expense — MessMate', messGroups, categories, formData: req.body, validationErrors: errors,
      });
    }
    await pool.query(
      `INSERT INTO bazar_expenses (mess_group_id, expense_date, category, description, amount, vendor, payment_method, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        Number(expense.mess_group_id), expense.expense_date, expense.category, expense.description,
        Number(expense.amount), expense.vendor || null, expense.payment_method || null, expense.notes || null, req.session.userId,
      ]
    );
    req.session.flash = { success: 'Expense added successfully.' };
    return res.redirect('/expenses');
  } catch (err) {
    console.error('Error creating expense:', err);
    return res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to add expense' });
  }
};

exports.editForm = async (req, res) => {
  try {
    if (!positiveInteger(req.params.id)) return res.status(404).render('errors/404', { title: '404 — Not Found' });
    const result = await pool.query('SELECT * FROM bazar_expenses WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).render('errors/404', { title: '404 — Not Found' });
    res.render('expenses/edit', {
      title: 'Edit Expense — MessMate',
      expense: result.rows[0],
      messGroups: await loadGroups(),
      categories,
      formData: result.rows[0],
      validationErrors: [],
    });
  } catch (err) {
    console.error('Error fetching expense:', err);
    res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to load expense' });
  }
};

exports.update = async (req, res) => {
  try {
    if (!positiveInteger(req.params.id)) return res.status(404).render('errors/404', { title: '404 — Not Found' });
    const { errors, expense } = validateExpense(req.body);
    const messGroups = await loadGroups();
    if (!messGroups.some((group) => String(group.id) === expense.mess_group_id)) errors.push('Select an existing mess group.');
    const current = await pool.query('SELECT * FROM bazar_expenses WHERE id = $1', [req.params.id]);
    if (current.rowCount === 0) return res.status(404).render('errors/404', { title: '404 — Not Found' });
    if (errors.length) {
      return res.status(400).render('expenses/edit', {
        title: 'Edit Expense — MessMate', expense: { ...current.rows[0], ...req.body }, messGroups,
        categories, formData: req.body, validationErrors: errors,
      });
    }
    await pool.query(
      `UPDATE bazar_expenses
       SET mess_group_id = $1, expense_date = $2, category = $3, description = $4, amount = $5,
           vendor = $6, payment_method = $7, notes = $8
       WHERE id = $9`,
      [
        Number(expense.mess_group_id), expense.expense_date, expense.category, expense.description,
        Number(expense.amount), expense.vendor || null, expense.payment_method || null, expense.notes || null, req.params.id,
      ]
    );
    req.session.flash = { success: 'Expense updated successfully.' };
    return res.redirect('/expenses');
  } catch (err) {
    console.error('Error updating expense:', err);
    return res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to update expense' });
  }
};

exports.delete = async (req, res) => {
  try {
    if (!positiveInteger(req.params.id)) return res.status(404).render('errors/404', { title: '404 — Not Found' });
    const result = await pool.query('DELETE FROM bazar_expenses WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).render('errors/404', { title: '404 — Not Found' });
    req.session.flash = { success: 'Expense deleted successfully.' };
    return req.method === 'DELETE' ? res.json({ success: true }) : res.redirect('/expenses');
  } catch (err) {
    console.error('Error deleting expense:', err);
    return res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to delete expense' });
  }
};
