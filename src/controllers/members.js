const { pool } = require('../config/db');
const { text, positiveInteger } = require('../utils/validation');

async function loadGroups(db = pool) {
  const result = await db.query('SELECT id, name, code FROM mess_groups ORDER BY name');
  return result.rows;
}

async function loadAccounts(excludeMemberId = null, db = pool) {
  const result = await db.query(
    `SELECT u.id, u.full_name, u.username, u.email,
            CASE WHEN m.id IS NULL THEN FALSE ELSE TRUE END AS linked
     FROM users u
     LEFT JOIN members m ON m.user_id = u.id
     WHERE u.role = 'member'
       AND (m.id IS NULL OR m.id = $1)
     ORDER BY u.full_name, u.username`,
    [excludeMemberId]
  );
  return result.rows;
}

function validateMember(body) {
  const member = {
    mess_group_id: text(body.mess_group_id),
    account_id: text(body.account_id),
    roll_number: text(body.roll_number),
    name: text(body.name),
    hall: text(body.hall),
    room: text(body.room),
    batch: text(body.batch),
    phone: text(body.phone),
    email: text(body.email).toLowerCase(),
    status: text(body.status) || 'active',
  };
  const errors = [];
  if (!positiveInteger(member.mess_group_id)) errors.push('Select a valid mess group.');
  if (member.account_id && !positiveInteger(member.account_id)) errors.push('Select a valid member login account.');
  if (!member.roll_number || member.roll_number.length > 20) errors.push('Roll number is required and must be at most 20 characters.');
  if (!member.name || member.name.length > 100) errors.push('Name is required and must be at most 100 characters.');
  if (!member.hall || member.hall.length > 50) errors.push('Hall is required and must be at most 50 characters.');
  if (member.room.length > 20) errors.push('Room must be at most 20 characters.');
  if (member.batch.length > 20) errors.push('Batch must be at most 20 characters.');
  if (member.phone.length > 15) errors.push('Phone must be at most 15 characters.');
  if (member.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email) || member.email.length > 100)) {
    errors.push('Enter a valid email address of at most 100 characters.');
  }
  if (!['active', 'inactive', 'suspended'].includes(member.status)) errors.push('Select a valid member status.');
  return { member, errors };
}

async function renderMemberForm(res, options) {
  const [messGroups, accounts] = await Promise.all([
    loadGroups(),
    loadAccounts(options.excludeMemberId || null),
  ]);
  return res.status(options.status || 200).render('members/form', {
    title: options.title,
    heading: options.heading,
    action: options.action,
    member: options.member || {},
    messGroups,
    accounts,
    validationErrors: options.validationErrors || [],
  });
}

exports.index = async (req, res) => {
  try {
    if (req.session.userRole !== 'admin') {
      const result = await pool.query(
        `SELECT m.*, mg.name AS mess_group_name
         FROM members m
         JOIN mess_groups mg ON m.mess_group_id = mg.id
         JOIN users u ON (m.user_id = u.id OR (m.user_id IS NULL AND LOWER(m.email) = LOWER(u.email)))
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

    const params = [];
    const conditions = [];
    if (positiveInteger(req.query.mess_group_id)) {
      params.push(req.query.mess_group_id);
      conditions.push(`m.mess_group_id = $${params.length}`);
    }
    const status = text(req.query.status);
    if (['active', 'inactive', 'suspended'].includes(status)) {
      params.push(status);
      conditions.push(`m.status = $${params.length}`);
    }
    const search = text(req.query.search);
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(m.name ILIKE $${params.length} OR m.roll_number ILIKE $${params.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [membersResult, messGroups] = await Promise.all([
      pool.query(
        `SELECT m.*, mg.name AS mess_group_name, u.username AS account_username
         FROM members m
         JOIN mess_groups mg ON m.mess_group_id = mg.id
         LEFT JOIN users u ON (m.user_id = u.id OR (m.user_id IS NULL AND LOWER(m.email) = LOWER(u.email) AND u.role = 'member'))
         ${where}
         ORDER BY m.name
         LIMIT 100`,
        params
      ),
      loadGroups(),
    ]);
    return res.render('members/index', {
      title: 'Members — MessMate',
      members: membersResult.rows,
      messGroups,
      currentFilters: req.query,
      canManage: true,
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return res.status(500).render('errors/500', {
      title: '500 — Server Error',
      message: 'Failed to load members',
    });
  }
};

exports.createForm = async (req, res) => {
  try {
    return await renderMemberForm(res, {
      title: 'Add Member — MessMate',
      heading: 'Add Member',
      action: '/members/create',
    });
  } catch (error) {
    console.error('Error loading member form:', error);
    return res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to load member form' });
  }
};

exports.create = async (req, res) => {
  const { member, errors } = validateMember(req.body);
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const groupResult = await client.query('SELECT id FROM mess_groups WHERE id = $1', [member.mess_group_id]);
    if (!groupResult.rowCount) errors.push('Select an existing mess group.');

    let account = null;
    if (member.account_id && positiveInteger(member.account_id)) {
      const accountResult = await client.query(
        `SELECT u.id, u.email
         FROM users u
         WHERE u.id = $1 AND u.role = 'member'
           AND NOT EXISTS (SELECT 1 FROM members m WHERE m.user_id = u.id)
         FOR UPDATE`,
        [member.account_id]
      );
      account = accountResult.rows[0] || null;
      if (!account) errors.push('That login account is unavailable or already linked to another member.');
    }
    if (account) member.email = account.email.toLowerCase();
    if (errors.length) {
      await client.query('ROLLBACK');
      return await renderMemberForm(res, {
        title: 'Add Member — MessMate',
        heading: 'Add Member',
        action: '/members/create',
        member,
        validationErrors: errors,
        status: 400,
      });
    }

    await client.query(
      `INSERT INTO members
         (user_id, mess_group_id, roll_number, name, hall, room, batch, phone, email, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        account?.id || null, member.mess_group_id, member.roll_number, member.name,
        member.hall, member.room || null, member.batch || null, member.phone || null,
        member.email || null, member.status,
      ]
    );
    if (account) {
      await client.query('UPDATE users SET mess_group_id = $1, updated_at = NOW() WHERE id = $2', [
        member.mess_group_id,
        account.id,
      ]);
    }
    await client.query('COMMIT');
    req.session.flash = {
      success: account
        ? 'Member added and login account assigned to the mess group.'
        : 'Member added successfully.',
    };
    return res.redirect('/members');
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') {
      req.session.flash = { error: 'That login account or roll number is already linked.' };
      return res.redirect('/members/create');
    }
    console.error('Error creating member:', error);
    return res.status(500).render('errors/500', {
      title: '500 — Server Error',
      message: 'Failed to add member',
    });
  } finally {
    client?.release();
  }
};

exports.editForm = async (req, res) => {
  if (!positiveInteger(req.params.id)) {
    return res.status(404).render('errors/404', { title: '404 — Not Found' });
  }
  try {
    const result = await pool.query(
      `SELECT m.*, COALESCE(m.user_id, u.id) AS linked_user_id
       FROM members m
       LEFT JOIN users u ON m.user_id = u.id
          OR (m.user_id IS NULL AND LOWER(m.email) = LOWER(u.email) AND u.role = 'member')
       WHERE m.id = $1
       ORDER BY u.id
       LIMIT 1`,
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).render('errors/404', { title: '404 — Not Found' });
    return await renderMemberForm(res, {
      title: 'Edit Member — MessMate',
      heading: 'Edit Member',
      action: `/members/${req.params.id}/update`,
      member: { ...result.rows[0], account_id: result.rows[0].linked_user_id || '' },
      excludeMemberId: req.params.id,
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    return res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to load member' });
  }
};

exports.update = async (req, res) => {
  if (!positiveInteger(req.params.id)) {
    return res.status(404).render('errors/404', { title: '404 — Not Found' });
  }
  const { member, errors } = validateMember(req.body);
  let client;
  let previousUserId = null;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const currentResult = await client.query(
      'SELECT user_id FROM members WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (!currentResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).render('errors/404', { title: '404 — Not Found' });
    }
    previousUserId = currentResult.rows[0].user_id;

    const groupResult = await client.query('SELECT id FROM mess_groups WHERE id = $1', [member.mess_group_id]);
    if (!groupResult.rowCount) errors.push('Select an existing mess group.');
    let account = null;
    if (member.account_id && positiveInteger(member.account_id)) {
      const accountResult = await client.query(
        `SELECT u.id, u.email
         FROM users u
         WHERE u.id = $1 AND u.role = 'member'
           AND NOT EXISTS (
             SELECT 1 FROM members m WHERE m.user_id = u.id AND m.id <> $2
           )
         FOR UPDATE`,
        [member.account_id, req.params.id]
      );
      account = accountResult.rows[0] || null;
      if (!account) errors.push('That login account is unavailable or linked to another member.');
    }
    if (account) member.email = account.email.toLowerCase();
    if (errors.length) {
      await client.query('ROLLBACK');
      return await renderMemberForm(res, {
        title: 'Edit Member — MessMate',
        heading: 'Edit Member',
        action: `/members/${req.params.id}/update`,
        member: { ...member, id: req.params.id },
        excludeMemberId: req.params.id,
        validationErrors: errors,
        status: 400,
      });
    }

    await client.query(
      `UPDATE members
       SET user_id = $1, mess_group_id = $2, roll_number = $3, name = $4, hall = $5,
           room = $6, batch = $7, phone = $8, email = $9, status = $10, updated_at = NOW()
       WHERE id = $11`,
      [
        account?.id || null, member.mess_group_id, member.roll_number, member.name,
        member.hall, member.room || null, member.batch || null, member.phone || null,
        member.email || null, member.status, req.params.id,
      ]
    );
    if (previousUserId && String(previousUserId) !== String(account?.id || '')) {
      await client.query(
        'UPDATE users SET mess_group_id = NULL, updated_at = NOW() WHERE id = $1',
        [previousUserId]
      );
    }
    if (account) {
      await client.query('UPDATE users SET mess_group_id = $1, updated_at = NOW() WHERE id = $2', [
        member.mess_group_id,
        account.id,
      ]);
    }
    await client.query('COMMIT');
    req.session.flash = { success: 'Member and login account assignment updated successfully.' };
    return res.redirect('/members');
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') {
      req.session.flash = { error: 'That login account or roll number is already linked.' };
      return res.redirect(`/members/${req.params.id}/edit`);
    }
    console.error('Error updating member:', error);
    return res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to update member' });
  } finally {
    client?.release();
  }
};

exports.delete = async (req, res) => {
  if (!positiveInteger(req.params.id)) {
    return res.status(404).render('errors/404', { title: '404 — Not Found' });
  }
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query('SELECT user_id FROM members WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).render('errors/404', { title: '404 — Not Found' });
    }
    if (result.rows[0].user_id) {
      await client.query(
        'UPDATE users SET mess_group_id = NULL, updated_at = NOW() WHERE id = $1',
        [result.rows[0].user_id]
      );
    }
    await client.query('DELETE FROM members WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    req.session.flash = { success: 'Member profile deleted and its login account unassigned.' };
    return res.redirect('/members');
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Error deleting member:', error);
    return res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to delete member' });
  } finally {
    client?.release();
  }
};
