// ============================================================
// MessMate — Member Controller
// ============================================================

const { pool } = require('../config/db');

// ============================================================
// GET /members — List members
// ============================================================

exports.index = async (req, res) => {
  try {
    if (req.session.userRole !== 'admin') {
      const result = await pool.query(
        `SELECT m.*, mg.name AS mess_group_name
         FROM members m
         JOIN mess_groups mg ON m.mess_group_id = mg.id
         JOIN users u ON LOWER(m.email) = LOWER(u.email)
         WHERE u.id = $1 AND m.mess_group_id = u.mess_group_id
         ORDER BY m.name`,
        [req.session.userId]
      );
      return res.render('members/index', {
        title: 'My Profile — MessMate',
        members: result.rows,
        messGroups: [],
        currentFilters: {},
        canManage: false,
      });
    }

    const messGroupId = req.query.mess_group_id;
    const status = req.query.status;
    const search = req.query.search;

    let query = `
      SELECT m.*, mg.name as mess_group_name
      FROM members m
      JOIN mess_groups mg ON m.mess_group_id = mg.id
      WHERE 1=1
    `;
    const queryParams = [];
    const conditions = [];

    if (messGroupId) {
      conditions.push('m.mess_group_id = $' + (queryParams.length + 1));
      queryParams.push(messGroupId);
    }
    if (status) {
      conditions.push('m.status = $' + (queryParams.length + 1));
      queryParams.push(status);
    }
    if (search) {
      conditions.push('(m.name ILIKE $' + (queryParams.length + 1) + ' OR m.roll_number ILIKE $' + (queryParams.length + 2) + ')');
      queryParams.push('%' + search + '%', '%' + search + '%');
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY m.name LIMIT 100';

    const result = await pool.query(query, queryParams);
    const members = result.rows;

    const groupsResult = await pool.query(
      'SELECT id, name, code FROM mess_groups ORDER BY name'
    );
    const messGroups = groupsResult.rows;

    res.render('members/index', {
      title: 'Members — MessMate',
      members,
      messGroups,
      currentFilters: req.query,
      canManage: true,
    });
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).render('errors/500', {
      title: '500 — Server Error',
      message: 'Failed to load members',
    });
  }
};

// ============================================================
// GET /members/create — Show create form
// ============================================================

exports.createForm = (req, res) => {
  res.render('members/create', {
    title: 'Add Member — MessMate',
    messGroups: [],
  });
};

// ============================================================
// POST /members/create — Create new member
// ============================================================

exports.create = async (req, res) => {
  try {
    const { mess_group_id, roll_number, name, hall, room, batch, phone, email } = req.body;

    await pool.query(
      `INSERT INTO members (mess_group_id, roll_number, name, hall, room, batch, phone, email, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
      [mess_group_id, roll_number, name, hall, room, batch, phone, email]
    );

    req.session.flash = { success: 'Member added successfully!' };
    res.redirect('/members');
  } catch (err) {
    console.error('Error creating member:', err);
    res.status(500).render('errors/500', {
      title: '500 — Server Error',
      message: 'Failed to add member',
    });
  }
};

// ============================================================
// GET /members/:id/edit — Show edit form
// ============================================================

exports.editForm = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM members WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).render('errors/404', { title: '404 — Not Found' });
    }

    const member = result.rows[0];

    const groupsResult = await pool.query(
      'SELECT id, name, code FROM mess_groups ORDER BY name'
    );

    res.render('members/edit', {
      title: 'Edit Member — MessMate',
      member,
      messGroups: groupsResult.rows,
    });
  } catch (err) {
    console.error('Error fetching member:', err);
    res.status(500).render('errors/500', {
      title: '500 — Server Error',
      message: 'Failed to load member',
    });
  }
};

// ============================================================
// PUT /members/:id — Update member
// ============================================================

exports.update = async (req, res) => {
  try {
    const { mess_group_id, roll_number, name, hall, room, batch, phone, email, status } = req.body;

    await pool.query(
      `UPDATE members
       SET mess_group_id = $1, roll_number = $2, name = $3, hall = $4, room = $5, batch = $6, phone = $7, email = $8, status = $9, updated_at = NOW()
       WHERE id = $10`,
      [mess_group_id, roll_number, name, hall, room, batch, phone, email, status, req.params.id]
    );

    req.session.flash = { success: 'Member updated successfully!' };
    res.redirect('/members');
  } catch (err) {
    console.error('Error updating member:', err);
    res.status(500).render('errors/500', {
      title: '500 — Server Error',
      message: 'Failed to update member',
    });
  }
};

// ============================================================
// DELETE /members/:id — Delete member
// ============================================================

exports.delete = async (req, res) => {
  try {
    await pool.query('DELETE FROM members WHERE id = $1', [req.params.id]);
    req.session.flash = { success: 'Member deleted successfully!' };
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting member:', err);
    res.status(500).json({ success: false, message: 'Failed to delete member' });
  }
};
