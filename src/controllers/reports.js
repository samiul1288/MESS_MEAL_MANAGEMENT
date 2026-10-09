const { pool } = require('../config/db');
const { positiveInteger, validDate } = require('../utils/validation');

const categories = ['food', 'medicine', 'repair', 'utility', 'miscellaneous'];
const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

function groupFilter(value) {
  if (String(value) === '0') return null;
  return positiveInteger(value) ? Number(value) : null;
}

function reportDates(query) {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = `${today.slice(0, 7)}-01`;
  const dateFrom = validDate(query.date_from) ? query.date_from : firstOfMonth;
  const dateTo = validDate(query.date_to) ? query.date_to : today;
  return { dateFrom, dateTo };
}

exports.dashboard = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const groupId = groupFilter(req.query.mess_group_id);
    const monthStart = `${today.slice(0, 7)}-01`;
    const [mealsResult, expensesResult, paymentsResult, membersResult, rateResult, groupsResult, chartResult] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(quantity), 0) AS total, COALESCE(SUM(total_cost), 0) AS total_cost
         FROM meals WHERE ($1::integer IS NULL OR mess_group_id = $1) AND meal_date <= $2`,
        [groupId, today]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_spent
         FROM bazar_expenses WHERE ($1::integer IS NULL OR mess_group_id = $1) AND expense_date <= $2`,
        [groupId, today]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_dues,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS total_paid
         FROM payments WHERE ($1::integer IS NULL OR mess_group_id = $1) AND payment_month <= $2`,
        [groupId, today.slice(0, 7)]
      ),
      pool.query(
        `SELECT COUNT(*) AS total_members,
                COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_members
         FROM members WHERE ($1::integer IS NULL OR mess_group_id = $1)`,
        [groupId]
      ),
      pool.query(
        `SELECT COALESCE((SELECT SUM(amount) FROM bazar_expenses
                           WHERE ($1::integer IS NULL OR mess_group_id = $1)
                             AND expense_date BETWEEN $2 AND $3), 0) AS expenses,
                COALESCE((SELECT SUM(quantity) FROM meals
                           WHERE ($1::integer IS NULL OR mess_group_id = $1)
                             AND meal_date BETWEEN $2 AND $3), 0) AS meal_units`,
        [groupId, monthStart, today]
      ),
      pool.query('SELECT id, name, code FROM mess_groups ORDER BY name'),
      pool.query(
        `WITH months AS (
           SELECT generate_series(
             date_trunc('month', CURRENT_DATE) - interval '5 months',
             date_trunc('month', CURRENT_DATE),
             interval '1 month'
           )::date AS month
         )
         SELECT to_char(months.month, 'YYYY-MM') AS month,
                COALESCE(meal_totals.meal_units, 0) AS meal_units,
                COALESCE(expense_totals.amount, 0) AS expenses
         FROM months
         LEFT JOIN (
           SELECT date_trunc('month', meal_date)::date AS month, SUM(quantity) AS meal_units
           FROM meals
           WHERE ($1::integer IS NULL OR mess_group_id = $1)
             AND meal_date >= date_trunc('month', CURRENT_DATE) - interval '5 months'
             AND meal_date < date_trunc('month', CURRENT_DATE) + interval '1 month'
           GROUP BY 1
         ) meal_totals ON meal_totals.month = months.month
         LEFT JOIN (
           SELECT date_trunc('month', expense_date)::date AS month, SUM(amount) AS amount
           FROM bazar_expenses
           WHERE ($1::integer IS NULL OR mess_group_id = $1)
             AND expense_date >= date_trunc('month', CURRENT_DATE) - interval '5 months'
             AND expense_date < date_trunc('month', CURRENT_DATE) + interval '1 month'
           GROUP BY 1
         ) expense_totals ON expense_totals.month = months.month
         ORDER BY months.month`,
        [groupId]
      ),
    ]);
    const currentMealRate = Number(rateResult.rows[0].meal_units) > 0
      ? Number(rateResult.rows[0].expenses) / Number(rateResult.rows[0].meal_units)
      : 0;
    const stats = {
      totalMeals: Number(mealsResult.rows[0].total),
      totalMealCost: Number(mealsResult.rows[0].total_cost).toFixed(2),
      totalExpenses: Number(expensesResult.rows[0].total_spent).toFixed(2),
      totalDuesCollected: Number(paymentsResult.rows[0].total_paid).toFixed(2),
      totalDues: Number(paymentsResult.rows[0].total_dues).toFixed(2),
      totalMembers: membersResult.rows[0].total_members || 0,
      activeMembers: membersResult.rows[0].active_members || 0,
      currentMealRate: currentMealRate.toFixed(2),
    };
    let messGroupName = 'All Mess Groups';
    if (groupId !== null) {
      const group = await pool.query('SELECT name FROM mess_groups WHERE id = $1', [groupId]);
      messGroupName = group.rows[0]?.name || 'Unknown Group';
    }
    res.render('reports/dashboard', {
      title: 'Dashboard — MessMate',
      stats,
      messGroupName,
      messGroupId: groupId || 0,
      messGroups: groupsResult.rows,
      currentFilters: req.query,
      chart: chartResult.rows,
    });
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to load dashboard' });
  }
};

exports.monthlyReport = async (req, res) => {
  try {
    const groupId = groupFilter(req.query.mess_group_id);
    let { dateFrom, dateTo } = reportDates(req.query);
    const errors = [];
    if (dateFrom > dateTo) errors.push('Start date must be on or before end date.');
    if ((new Date(`${dateTo}T00:00:00Z`) - new Date(`${dateFrom}T00:00:00Z`)) / 86400000 > 366) {
      errors.push('Choose a date range no longer than 366 days.');
    }

    const groupsResult = await pool.query('SELECT id, name, code FROM mess_groups ORDER BY name');
    const membersResult = await pool.query(
      `SELECT DISTINCT member.id, member.name, member.roll_number
       FROM members member
       JOIN users owner ON (
         member.user_id = owner.id
         OR (member.user_id IS NULL AND LOWER(owner.email) = LOWER(member.email))
       )
       WHERE ($1::integer IS NULL OR member.mess_group_id = $1)
       ORDER BY member.name`,
      [groupId]
    );
    const memberId = positiveInteger(req.query.member_id) ? Number(req.query.member_id) : null;
    const selectedMember = memberId
      ? membersResult.rows.find((member) => Number(member.id) === memberId)
      : null;
    if (memberId && !selectedMember) errors.push('Select a valid member for this mess group.');

    if (errors.length) {
      return res.status(400).render('reports/monthly', {
        title: 'Monthly Report — MessMate',
        currentFilters: req.query,
        messGroups: groupsResult.rows,
        members: membersResult.rows,
        report: null,
        chart: [],
        errors,
      });
    }

    const selectedOwnerResult = selectedMember
      ? await pool.query(
          `SELECT owner.id
           FROM members member
           JOIN users owner ON (
             member.user_id = owner.id
             OR (member.user_id IS NULL AND LOWER(owner.email) = LOWER(member.email))
           )
           WHERE member.id = $1
           ORDER BY owner.id
           LIMIT 1`,
          [memberId]
        )
      : null;
    const ownerId = selectedOwnerResult?.rows[0]?.id || null;
    const [totalsResult, dailyResult] = await Promise.all([
      pool.query(
        `SELECT COALESCE((SELECT SUM(amount) FROM bazar_expenses
                           WHERE ($1::integer IS NULL OR mess_group_id = $1)
                             AND expense_date BETWEEN $2 AND $3), 0) AS expenses,
                COALESCE((SELECT SUM(quantity) FROM meals
                           WHERE ($1::integer IS NULL OR mess_group_id = $1)
                             AND meal_date BETWEEN $2 AND $3), 0) AS group_meal_units,
                COALESCE((SELECT SUM(quantity) FROM meals
                           WHERE ($1::integer IS NULL OR mess_group_id = $1)
                             AND meal_date BETWEEN $2 AND $3
                             AND ($4::integer IS NULL OR created_by = $4)), 0) AS selected_meal_units`,
        [groupId, dateFrom, dateTo, ownerId]
      ),
      pool.query(
        `WITH days AS (
           SELECT generate_series($2::date, $3::date, interval '1 day')::date AS day
         )
         SELECT days.day,
                COALESCE(meal_totals.meal_units, 0) AS meal_units,
                COALESCE(expense_totals.amount, 0) AS expenses
         FROM days
         LEFT JOIN (
           SELECT meal_date AS day, SUM(quantity) AS meal_units
           FROM meals
           WHERE ($1::integer IS NULL OR mess_group_id = $1)
             AND meal_date BETWEEN $2 AND $3
             AND ($4::integer IS NULL OR created_by = $4)
           GROUP BY meal_date
         ) meal_totals ON meal_totals.day = days.day
         LEFT JOIN (
           SELECT expense_date AS day, SUM(amount) AS amount
           FROM bazar_expenses
           WHERE ($1::integer IS NULL OR mess_group_id = $1)
             AND expense_date BETWEEN $2 AND $3
           GROUP BY expense_date
         ) expense_totals ON expense_totals.day = days.day
         ORDER BY days.day`,
        [groupId, dateFrom, dateTo, ownerId]
      ),
    ]);
    const totals = totalsResult.rows[0];
    const expenses = Number(totals.expenses);
    const groupMealUnits = Number(totals.group_meal_units);
    const mealRate = groupMealUnits > 0 ? expenses / groupMealUnits : 0;
    const memberMealUnits = Number(totals.selected_meal_units);

    res.render('reports/monthly', {
      title: 'Monthly Report — MessMate',
      currentFilters: { ...req.query, date_from: dateFrom, date_to: dateTo },
      messGroups: groupsResult.rows,
      members: membersResult.rows,
      report: {
        expenses: expenses.toFixed(2),
        groupMealUnits,
        memberMealUnits,
        mealRate: mealRate.toFixed(2),
        memberMealCost: (mealRate * memberMealUnits).toFixed(2),
        selectedMember,
      },
      chart: dailyResult.rows,
      errors: [],
    });
  } catch (err) {
    console.error('Error fetching monthly report:', err);
    res.status(500).render('errors/500', {
      title: '500 — Server Error',
      message: 'Failed to load monthly report',
    });
  }
};

exports.mealsReport = async (req, res) => {
  try {
    const { dateFrom, dateTo } = reportDates(req.query);
    const groupId = groupFilter(req.query.mess_group_id);
    const [mealsResult, groupsResult] = await Promise.all([
      pool.query(
        `SELECT meal_type, COUNT(*) AS count, COALESCE(SUM(total_cost), 0) AS total_cost
         FROM meals
         WHERE ($1::integer IS NULL OR mess_group_id = $1) AND meal_date BETWEEN $2 AND $3
         GROUP BY meal_type ORDER BY meal_type`,
        [groupId, dateFrom, dateTo]
      ),
      pool.query('SELECT id, name FROM mess_groups ORDER BY name'),
    ]);
    const breakdown = Object.fromEntries(mealTypes.map((type) => [type, { count: 0, total_cost: '0.00' }]));
    mealsResult.rows.forEach((meal) => {
      breakdown[meal.meal_type] = { count: meal.count, total_cost: Number(meal.total_cost).toFixed(2) };
    });
    const totals = {
      totalCount: mealsResult.rows.reduce((sum, meal) => sum + Number(meal.count), 0),
      totalCost: mealsResult.rows.reduce((sum, meal) => sum + Number(meal.total_cost), 0).toFixed(2),
    };
    res.render('reports/meals', {
      title: 'Meal Report — MessMate', meals: mealsResult.rows, categories: breakdown, totals,
      messGroups: groupsResult.rows, currentFilters: req.query,
    });
  } catch (err) {
    console.error('Error fetching meals report:', err);
    res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to load meal report' });
  }
};

exports.expensesReport = async (req, res) => {
  try {
    const { dateFrom, dateTo } = reportDates(req.query);
    const groupId = groupFilter(req.query.mess_group_id);
    const params = [groupId, dateFrom, dateTo];
    let query = `
      SELECT e.*, mg.name AS mess_group_name
      FROM bazar_expenses e
      JOIN mess_groups mg ON e.mess_group_id = mg.id
      WHERE ($1::integer IS NULL OR e.mess_group_id = $1)
        AND e.expense_date BETWEEN $2 AND $3
    `;
    if (categories.includes(req.query.category)) {
      params.push(req.query.category);
      query += ` AND e.category = $${params.length}`;
    }
    query += ' ORDER BY e.expense_date, e.category';
    const [expensesResult, groupsResult] = await Promise.all([
      pool.query(query, params),
      pool.query('SELECT id, name FROM mess_groups ORDER BY name'),
    ]);
    const expenses = expensesResult.rows.map((expense) => ({ ...expense, amount: Number(expense.amount) }));
    const categoryBreakdown = Object.fromEntries(categories.map((category) => [category, { count: 0, amount: 0 }]));
    expenses.forEach((expense) => {
      categoryBreakdown[expense.category].count += 1;
      categoryBreakdown[expense.category].amount += expense.amount;
    });
    const totals = {
      totalCount: expenses.length,
      totalAmount: expenses.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2),
    };
    res.render('reports/expenses', {
      title: 'Expense Report — MessMate', expenses, categories: categoryBreakdown, totals,
      messGroups: groupsResult.rows, currentFilters: req.query,
    });
  } catch (err) {
    console.error('Error fetching expenses report:', err);
    res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to load expense report' });
  }
};

exports.paymentsReport = async (req, res) => {
  try {
    const { dateFrom, dateTo } = reportDates(req.query);
    const groupId = groupFilter(req.query.mess_group_id);
    const result = await pool.query(
      `SELECT p.*, m.name AS member_name
       FROM payments p
       JOIN members m ON p.member_id = m.id
       WHERE ($1::integer IS NULL OR p.mess_group_id = $1)
         AND p.payment_date BETWEEN $2 AND $3
       ORDER BY p.payment_date DESC`,
      [groupId, dateFrom, dateTo]
    );
    const payments = result.rows.map((payment) => ({ ...payment, amount: Number(payment.amount) }));
    const totals = {
      totalCount: payments.length,
      totalPaid: payments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0).toFixed(2),
      totalPending: payments.filter((payment) => payment.status !== 'paid').reduce((sum, payment) => sum + payment.amount, 0).toFixed(2),
    };
    res.render('reports/payments', { title: 'Payments Report — MessMate', payments, totals, currentFilters: req.query });
  } catch (err) {
    console.error('Error fetching payments report:', err);
    res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to load payments report' });
  }
};
