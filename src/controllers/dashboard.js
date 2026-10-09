const { pool } = require('../config/db');
const { positiveInteger } = require('../utils/validation');

exports.member = async (req, res) => {
  try {
    const userId = req.session.userId;
    const groupId = positiveInteger(req.session.messGroupId) ? req.session.messGroupId : null;
    const memberResult = await pool.query(
      `SELECT id, name, roll_number
       FROM members
       WHERE LOWER(email) = LOWER((SELECT email FROM users WHERE id = $1))
         AND ($2::integer IS NULL OR mess_group_id = $2)
       ORDER BY id
       LIMIT 1`,
      [userId, groupId]
    );
    const member = memberResult.rows[0] || null;
    if (!positiveInteger(groupId)) {
      return res.render('dashboard/member', {
        title: 'My Dashboard — MessMate',
        member,
        stats: {
          mealEntries: 0,
          mealUnits: 0,
          mealRate: '0.00',
          mealCost: '0.00',
          paid: '0.00',
          balance: '0.00',
          due: '0.00',
          advance: '0.00',
        },
        chart: [],
      });
    }
    const [mealResult, expenseResult, paymentResult, groupMealResult, chartResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS entries, COALESCE(SUM(quantity), 0) AS meal_count
         FROM meals
         WHERE created_by = $1
           AND ($2::integer IS NULL OR mess_group_id = $2)
           AND meal_date >= date_trunc('month', CURRENT_DATE)::date
           AND meal_date <= CURRENT_DATE`,
        [userId, groupId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM bazar_expenses
         WHERE ($1::integer IS NULL OR mess_group_id = $1)
           AND expense_date >= date_trunc('month', CURRENT_DATE)::date
           AND expense_date <= CURRENT_DATE`,
        [groupId]
      ),
      member
        ? pool.query(
            `SELECT COALESCE(SUM(amount) FILTER (WHERE status IN ('paid', 'partial')), 0) AS paid
             FROM payments
             WHERE member_id = $1
               AND mess_group_id = $2
               AND payment_month = to_char(CURRENT_DATE, 'YYYY-MM')`,
            [member.id, groupId]
          )
        : Promise.resolve({ rows: [{ paid: 0 }] }),
      pool.query(
        `SELECT COALESCE(SUM(quantity), 0) AS meal_count
         FROM meals
         WHERE ($1::integer IS NULL OR mess_group_id = $1)
           AND meal_date >= date_trunc('month', CURRENT_DATE)::date
           AND meal_date <= CURRENT_DATE`,
        [groupId]
      ),
      pool.query(
        `SELECT days.day::date AS day, COALESCE(SUM(m.quantity), 0) AS meal_count
         FROM generate_series(
           date_trunc('month', CURRENT_DATE)::date,
           CURRENT_DATE,
           interval '1 day'
         ) AS days(day)
         LEFT JOIN meals m ON m.meal_date = days.day::date
           AND m.created_by = $1
           AND ($2::integer IS NULL OR m.mess_group_id = $2)
         GROUP BY days.day
         ORDER BY days.day`,
        [userId, groupId]
      ),
    ]);

    const mealUnits = Number(mealResult.rows[0].meal_count);
    const monthlyExpenses = Number(expenseResult.rows[0].total);
    const groupMealUnits = Number(groupMealResult.rows[0].meal_count);
    const mealRate = groupMealUnits > 0 ? monthlyExpenses / groupMealUnits : 0;
    const mealCost = mealUnits * mealRate;
    const paid = Number(paymentResult.rows[0].paid);
    const balance = paid - mealCost;

    res.render('dashboard/member', {
      title: 'My Dashboard — MessMate',
      member,
      stats: {
        mealEntries: Number(mealResult.rows[0].entries),
        mealUnits,
        mealRate: mealRate.toFixed(2),
        mealCost: mealCost.toFixed(2),
        paid: paid.toFixed(2),
        balance: balance.toFixed(2),
        due: Math.max(-balance, 0).toFixed(2),
        advance: Math.max(balance, 0).toFixed(2),
      },
      chart: chartResult.rows,
    });
  } catch (err) {
    console.error('Error fetching member dashboard:', err);
    res.status(500).render('errors/500', {
      title: '500 — Server Error',
      message: 'Failed to load member dashboard',
    });
  }
};
