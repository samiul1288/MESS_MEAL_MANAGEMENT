const { pool } = require('../config/db');
const { text, positiveInteger } = require('../utils/validation');

function validateGroup(body) {
  const group = {
    name: text(body.name),
    code: text(body.code).toUpperCase(),
    description: text(body.description),
  };
  const errors = [];
  if (group.name.length < 2 || group.name.length > 100) {
    errors.push('Group name must be between 2 and 100 characters.');
  }
  if (!/^[A-Z0-9_-]{2,20}$/.test(group.code)) {
    errors.push('Group code must be 2–20 characters using letters, numbers, hyphens, or underscores.');
  }
  if (group.description.length > 1000) {
    errors.push('Description must be at most 1,000 characters.');
  }
  return { group, errors };
}

exports.index = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.id, g.name, g.code, g.description,
              (SELECT COUNT(*) FROM members m WHERE m.mess_group_id = g.id) AS member_count
       FROM mess_groups g
       ORDER BY g.name`
    );
    return res.render('groups/index', {
      title: 'Mess Groups — MessMate',
      groups: result.rows,
    });
  } catch (error) {
    console.error('Error loading mess groups:', error);
    return res.status(500).render('errors/500', {
      title: '500 — Server Error',
      message: 'Failed to load mess groups',
    });
  }
};

exports.createForm = (req, res) => res.render('groups/form', {
  title: 'Add Mess Group — MessMate',
  heading: 'Add Mess Group',
  action: '/groups',
  group: {},
  validationErrors: [],
});

exports.create = async (req, res) => {
  const { group, errors } = validateGroup(req.body);
  if (errors.length) {
    return res.status(400).render('groups/form', {
      title: 'Add Mess Group — MessMate',
      heading: 'Add Mess Group',
      action: '/groups',
      group,
      validationErrors: errors,
    });
  }
  try {
    await pool.query(
      'INSERT INTO mess_groups (name, code, description) VALUES ($1, $2, $3)',
      [group.name, group.code, group.description || null]
    );
    req.session.flash = { success: 'Mess group created successfully.' };
    return res.redirect('/groups');
  } catch (error) {
    if (error.code === '23505') {
      req.session.flash = { error: 'That group code is already in use.' };
      return res.redirect('/groups/create');
    }
    console.error('Error creating mess group:', error);
    return res.status(500).render('errors/500', {
      title: '500 — Server Error',
      message: 'Failed to create mess group',
    });
  }
};

exports.editForm = async (req, res) => {
  if (!positiveInteger(req.params.id)) {
    return res.status(404).render('errors/404', { title: '404 — Not Found' });
  }
  try {
    const result = await pool.query(
      'SELECT id, name, code, description FROM mess_groups WHERE id = $1',
      [req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).render('errors/404', { title: '404 — Not Found' });
    }
    return res.render('groups/form', {
      title: 'Edit Mess Group — MessMate',
      heading: 'Edit Mess Group',
      action: `/groups/${req.params.id}`,
      group: result.rows[0],
      validationErrors: [],
    });
  } catch (error) {
    console.error('Error loading mess group:', error);
    return res.status(500).render('errors/500', {
      title: '500 — Server Error',
      message: 'Failed to load mess group',
    });
  }
};

exports.update = async (req, res) => {
  if (!positiveInteger(req.params.id)) {
    return res.status(404).render('errors/404', { title: '404 — Not Found' });
  }
  const { group, errors } = validateGroup(req.body);
  if (errors.length) {
    return res.status(400).render('groups/form', {
      title: 'Edit Mess Group — MessMate',
      heading: 'Edit Mess Group',
      action: `/groups/${req.params.id}`,
      group: { ...group, id: req.params.id },
      validationErrors: errors,
    });
  }
  try {
    const result = await pool.query(
      `UPDATE mess_groups
       SET name = $1, code = $2, description = $3
       WHERE id = $4
       RETURNING id`,
      [group.name, group.code, group.description || null, req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).render('errors/404', { title: '404 — Not Found' });
    }
    req.session.flash = { success: 'Mess group updated successfully.' };
    return res.redirect('/groups');
  } catch (error) {
    if (error.code === '23505') {
      req.session.flash = { error: 'That group code is already in use.' };
      return res.redirect(`/groups/${req.params.id}/edit`);
    }
    console.error('Error updating mess group:', error);
    return res.status(500).render('errors/500', {
      title: '500 — Server Error',
      message: 'Failed to update mess group',
    });
  }
};

exports.delete = async (req, res) => {
  if (!positiveInteger(req.params.id)) {
    return res.status(404).render('errors/404', { title: '404 — Not Found' });
  }
  try {
    const usage = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE mess_group_id = $1) +
         (SELECT COUNT(*) FROM members WHERE mess_group_id = $1) +
         (SELECT COUNT(*) FROM meals WHERE mess_group_id = $1) +
         (SELECT COUNT(*) FROM bazar_expenses WHERE mess_group_id = $1) +
         (SELECT COUNT(*) FROM payments WHERE mess_group_id = $1) +
         (SELECT COUNT(*) FROM notices WHERE mess_group_id = $1) AS usage_count`,
      [req.params.id]
    );
    if (Number(usage.rows[0].usage_count) > 0) {
      req.session.flash = {
        error: 'This group has linked users or records. Move or remove them before deleting the group.',
      };
      return res.redirect('/groups');
    }
    const result = await pool.query('DELETE FROM mess_groups WHERE id = $1', [req.params.id]);
    if (!result.rowCount) {
      return res.status(404).render('errors/404', { title: '404 — Not Found' });
    }
    req.session.flash = { success: 'Mess group deleted successfully.' };
    return res.redirect('/groups');
  } catch (error) {
    if (error.code === '23503') {
      req.session.flash = {
        error: 'This group is still in use. Move or remove its linked data before deleting it.',
      };
      return res.redirect('/groups');
    }
    console.error('Error deleting mess group:', error);
    return res.status(500).render('errors/500', {
      title: '500 — Server Error',
      message: 'Failed to delete mess group',
    });
  }
};
