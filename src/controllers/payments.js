const { pool } = require('../config/db');
const { text, positiveInteger, validDate, validAmount } = require('../utils/validation');

const statuses = ['paid', 'pending', 'partial', 'overdue'];

function validatePayment(body) {
  const payment = {
    member_id: text(body.member_id),
    payment_month: text(body.payment_month),
    amount: text(body.amount),
    payment_date: text(body.payment_date),
    payment_method: text(body.payment_method),
    status: text(body.status) || 'pending',
    notes: text(body.notes),
  };
  const errors = [];

  if (!positiveInteger(payment.member_id)) errors.push('Select a valid member.');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(payment.payment_month)) errors.push('Payment month must use YYYY-MM format.');
  if (!validAmount(payment.amount)) errors.push('Amount must be a non-negative amount with up to two decimal places.');
  if (payment.payment_date && !validDate(payment.payment_date)) errors.push('Enter a valid payment date.');
  if (!statuses.includes(payment.status)) errors.push('Select a valid payment status.');
  if (payment.payment_method.length > 30) errors.push('Payment method must be at most 30 characters.');
  if (payment.notes.length > 5000) errors.push('Notes must be at most 5,000 characters.');
  return { errors, payment };
}

async function loadMembers() {
  const result = await pool.query(
    'SELECT id, name, roll_number, mess_group_id FROM members ORDER BY name'
  );
  return result.rows;
}

async function loadPaymentForm(req, res, options) {
  const members = await loadMembers();
  res.render(options.view, {
    title: options.title,
    members,
    statuses,
    payment: options.payment || {},
    formData: options.formData || options.payment || {},
    validationErrors: options.validationErrors || [],
  });
}

exports.index = async (req, res) => {
  try {
    const params = [];
    const conditions = [];
    if (req.session.userRole === 'admin') {
      if (positiveInteger(req.query.mess_group_id)) {
        params.push(req.query.mess_group_id);
        conditions.push(`p.mess_group_id = $${params.length}`);
      }
      const status = text(req.query.status);
      if (statuses.includes(status)) {
        params.push(status);
        conditions.push(`p.status = $${params.length}`);
      }
      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(text(req.query.payment_month))) {
        params.push(req.query.payment_month);
        conditions.push(`p.payment_month = $${params.length}`);
      }
      if (positiveInteger(req.query.member_id)) {
        params.push(req.query.member_id);
        conditions.push(`p.member_id = $${params.length}`);
      }
      const search = text(req.query.search);
      if (search) {
        params.push(`%${search}%`);
        conditions.push(`(m.name ILIKE $${params.length} OR m.roll_number ILIKE $${params.length})`);
      }
    } else {
      params.push(req.session.userId);
      conditions.push(`EXISTS (
        SELECT 1
        FROM members own_member
        JOIN users own_user ON (
          own_member.user_id = own_user.id
          OR (own_member.user_id IS NULL AND LOWER(own_member.email) = LOWER(own_user.email))
        )
        WHERE own_member.id = p.member_id
          AND own_user.id = $${params.length}
          AND own_member.mess_group_id = own_user.mess_group_id
          AND own_member.mess_group_id = p.mess_group_id
      )`);
    }
    if (validDate(req.query.date_from)) {
      params.push(req.query.date_from);
      conditions.push(`p.payment_date >= $${params.length}`);
    }
    if (validDate(req.query.date_to)) {
      params.push(req.query.date_to);
      conditions.push(`p.payment_date <= $${params.length}`);
    }
    const [result, members] = await Promise.all([
      pool.query(
      `SELECT p.*, m.name AS member_name, m.roll_number, mg.name AS mess_group_name
       FROM payments p
       JOIN members m ON p.member_id = m.id
       JOIN mess_groups mg ON p.mess_group_id = mg.id
       WHERE ${conditions.length ? conditions.join(' AND ') : 'TRUE'}
       ORDER BY p.payment_month DESC, p.payment_date DESC NULLS LAST, m.name
       LIMIT 200`,
      params
      ),
      req.session.userRole === 'admin' ? loadMembers() : Promise.resolve([]),
    ]);
    res.render('payments/index', {
      title: 'Payments — MessMate',
      payments: result.rows.map((payment) => ({ ...payment, amount: Number(payment.amount) })),
      currentFilters: req.query,
      members,
      canManage: req.session.userRole === 'admin',
    });
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to load payments' });
  }
};

exports.createForm = async (req, res) => {
  try {
    await loadPaymentForm(req, res, { view: 'payments/create', title: 'Add Payment — MessMate' });
  } catch (err) {
    console.error('Error loading payment form:', err);
    res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to load payment form' });
  }
};

exports.create = async (req, res) => {
  try {
    const { errors, payment } = validatePayment(req.body);
    const members = await loadMembers();
    const member = members.find((item) => String(item.id) === payment.member_id);
    if (!member) errors.push('Select an existing member.');
    if (errors.length) {
      return res.status(400).render('payments/create', {
        title: 'Add Payment — MessMate', members, statuses, payment: {}, formData: req.body, validationErrors: errors,
      });
    }
    await pool.query(
      `INSERT INTO payments
       (member_id, mess_group_id, payment_month, amount, payment_date, payment_method, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        member.id, member.mess_group_id, payment.payment_month, Number(payment.amount),
        payment.payment_date || null, payment.payment_method || null, payment.status, payment.notes || null,
      ]
    );
    req.session.flash = { success: 'Payment added successfully.' };
    return res.redirect('/payments');
  } catch (err) {
    if (err.code === '23505') {
      req.session.flash = { error: 'A payment already exists for this member and month.' };
      return res.redirect('/payments/create');
    }
    console.error('Error creating payment:', err);
    return res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to add payment' });
  }
};

exports.editForm = async (req, res) => {
  try {
    if (!positiveInteger(req.params.id)) return res.status(404).render('errors/404', { title: '404 — Not Found' });
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).render('errors/404', { title: '404 — Not Found' });
    await loadPaymentForm(req, res, { view: 'payments/edit', title: 'Edit Payment — MessMate', payment: result.rows[0] });
  } catch (err) {
    console.error('Error fetching payment:', err);
    res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to load payment' });
  }
};

exports.update = async (req, res) => {
  try {
    if (!positiveInteger(req.params.id)) return res.status(404).render('errors/404', { title: '404 — Not Found' });
    const current = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
    if (current.rowCount === 0) return res.status(404).render('errors/404', { title: '404 — Not Found' });
    const { errors, payment } = validatePayment(req.body);
    const members = await loadMembers();
    const member = members.find((item) => String(item.id) === payment.member_id);
    if (!member) errors.push('Select an existing member.');
    if (errors.length) {
      return res.status(400).render('payments/edit', {
        title: 'Edit Payment — MessMate', members, statuses, payment: { ...current.rows[0], ...req.body },
        formData: req.body, validationErrors: errors,
      });
    }
    await pool.query(
      `UPDATE payments
       SET member_id = $1, mess_group_id = $2, payment_month = $3, amount = $4, payment_date = $5,
           payment_method = $6, status = $7, notes = $8
       WHERE id = $9`,
      [
        member.id, member.mess_group_id, payment.payment_month, Number(payment.amount),
        payment.payment_date || null, payment.payment_method || null, payment.status, payment.notes || null, req.params.id,
      ]
    );
    req.session.flash = { success: 'Payment updated successfully.' };
    return res.redirect('/payments');
  } catch (err) {
    if (err.code === '23505') {
      req.session.flash = { error: 'A payment already exists for this member and month.' };
      return res.redirect('/payments');
    }
    console.error('Error updating payment:', err);
    return res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to update payment' });
  }
};

exports.delete = async (req, res) => {
  try {
    if (!positiveInteger(req.params.id)) return res.status(404).render('errors/404', { title: '404 — Not Found' });
    const result = await pool.query('DELETE FROM payments WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).render('errors/404', { title: '404 — Not Found' });
    req.session.flash = { success: 'Payment deleted successfully.' };
    return req.method === 'DELETE' ? res.json({ success: true }) : res.redirect('/payments');
  } catch (err) {
    console.error('Error deleting payment:', err);
    return res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to delete payment' });
  }
};
