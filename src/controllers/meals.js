const { pool } = require('../config/db');
const { text, positiveInteger, validDate, validAmount } = require('../utils/validation');

const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

async function loadGroups(req) {
  if (req.session.userRole === 'admin') {
    const result = await pool.query('SELECT id, name, code FROM mess_groups ORDER BY name');
    return result.rows;
  }
  if (!positiveInteger(req.session.messGroupId)) {
    return [];
  }
  const result = await pool.query(
    'SELECT id, name, code FROM mess_groups WHERE id = $1',
    [req.session.messGroupId]
  );
  return result.rows;
}

async function loadMemberAccounts() {
  const result = await pool.query(
    `SELECT id, full_name, username
     FROM users
     WHERE role = 'member'
     ORDER BY full_name`
  );
  return result.rows;
}

function validateMeal(body, groupId) {
  const errors = [];
  const meal = {
    mess_group_id: groupId,
    meal_date: text(body.meal_date),
    meal_type: text(body.meal_type),
    menu_items: text(body.menu_items),
    quantity: text(body.quantity) || '0',
    cost_per_head: text(body.cost_per_head) || '0',
  };

  if (!positiveInteger(meal.mess_group_id)) errors.push('Select a valid mess group.');
  if (!validDate(meal.meal_date)) errors.push('Enter a valid meal date.');
  if (!mealTypes.includes(meal.meal_type)) errors.push('Select a valid meal type.');
  if (!meal.menu_items || meal.menu_items.length > 5000) errors.push('Menu items are required and must be at most 5,000 characters.');
  if (!/^\d+$/.test(meal.quantity) || !Number.isSafeInteger(Number(meal.quantity)) || Number(meal.quantity) > 2147483647) {
    errors.push('Quantity must be a whole number between 0 and 2,147,483,647.');
  }
  if (!validAmount(meal.cost_per_head)) errors.push('Cost per head must be a non-negative amount with up to two decimal places.');

  return { errors, meal };
}

function getGroupId(req) {
  return req.session.userRole === 'admin' ? text(req.body.mess_group_id) : req.session.messGroupId;
}

exports.index = async (req, res) => {
  try {
    const params = [];
    const conditions = [];
    if (req.session.userRole === 'admin') {
      if (positiveInteger(req.query.mess_group_id)) {
        params.push(req.query.mess_group_id);
        conditions.push(`m.mess_group_id = $${params.length}`);
      }
      if (positiveInteger(req.query.member_id)) {
        params.push(req.query.member_id);
        conditions.push(`m.created_by = $${params.length}`);
      }
    } else {
      params.push(req.session.userId);
      conditions.push(`m.created_by = $${params.length}`);
      params.push(req.session.messGroupId);
      conditions.push(`m.mess_group_id = $${params.length}`);
    }

    const mealType = text(req.query.meal_type);
    if (mealTypes.includes(mealType)) {
      params.push(mealType);
      conditions.push(`m.meal_type = $${params.length}`);
    }
    const search = text(req.query.search);
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(m.menu_items ILIKE $${params.length} OR m.meal_type ILIKE $${params.length})`);
    }
    if (validDate(req.query.date_from)) {
      params.push(req.query.date_from);
      conditions.push(`m.meal_date >= $${params.length}`);
    }
    if (validDate(req.query.date_to)) {
      params.push(req.query.date_to);
      conditions.push(`m.meal_date <= $${params.length}`);
    }

    const query = `
      SELECT m.*, mg.name AS mess_group_name
      FROM meals m
      JOIN mess_groups mg ON m.mess_group_id = mg.id
      WHERE ${conditions.length ? conditions.join(' AND ') : 'TRUE'}
      ORDER BY m.meal_date DESC, m.meal_type
      LIMIT 100
    `;
    const [mealsResult, messGroups, members] = await Promise.all([
      pool.query(query, params),
      loadGroups(req),
      req.session.userRole === 'admin' ? loadMemberAccounts() : Promise.resolve([]),
    ]);

    res.render('meals/index', {
      title: 'Meals — MessMate',
      meals: mealsResult.rows.map((meal) => ({
        ...meal,
        cost_per_head: Number(meal.cost_per_head),
        total_cost: Number(meal.total_cost),
      })),
      messGroups,
      members,
      currentFilters: req.query,
      canManage: req.session.userRole === 'admin',
    });
  } catch (err) {
    console.error('Error fetching meals:', err);
    res.status(500).render('errors/500', {
      title: '500 — Server Error',
      message: 'Failed to load meals',
    });
  }
};

exports.createForm = async (req, res) => {
  try {
    res.render('meals/create', {
      title: 'Add Meal — MessMate',
      messGroups: await loadGroups(req),
      mealTypes,
      canManage: req.session.userRole === 'admin',
      formData: {},
      validationErrors: [],
    });
  } catch (err) {
    console.error('Error loading meal form:', err);
    res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to load meal form' });
  }
};

exports.create = async (req, res) => {
  try {
    const groupId = getGroupId(req);
    const { errors, meal } = validateMeal(req.body, groupId);
    const groups = await loadGroups(req);
    if (!groups.some((group) => String(group.id) === String(groupId))) {
      errors.push('Select a mess group you are allowed to use.');
    }
    if (errors.length) {
      return res.status(400).render('meals/create', {
        title: 'Add Meal — MessMate', messGroups: groups, mealTypes, formData: req.body,
        validationErrors: errors, canManage: req.session.userRole === 'admin',
      });
    }

    await pool.query(
      `INSERT INTO meals (mess_group_id, meal_date, meal_type, menu_items, quantity, cost_per_head, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [meal.mess_group_id, meal.meal_date, meal.meal_type, meal.menu_items, Number(meal.quantity), Number(meal.cost_per_head), req.session.userId]
    );
    req.session.flash = { success: 'Meal added successfully.' };
    return res.redirect('/meals');
  } catch (err) {
    if (err.code === '23505') {
      req.session.flash = { error: 'You already have a meal entry for this group, date, and meal type.' };
      return res.redirect('/meals/create');
    }
    console.error('Error creating meal:', err);
    return res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to add meal' });
  }
};

exports.editForm = async (req, res) => {
  try {
    if (!positiveInteger(req.params.id)) {
      return res.status(404).render('errors/404', { title: '404 — Not Found' });
    }
    const result = await pool.query('SELECT * FROM meals WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).render('errors/404', { title: '404 — Not Found' });
    }
    res.render('meals/edit', {
      title: 'Edit Meal — MessMate',
      meal: result.rows[0],
      messGroups: await loadGroups(req),
      mealTypes,
      formData: result.rows[0],
      validationErrors: [],
    });
  } catch (err) {
    console.error('Error fetching meal:', err);
    res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to load meal' });
  }
};

exports.update = async (req, res) => {
  try {
    if (!positiveInteger(req.params.id)) {
      return res.status(404).render('errors/404', { title: '404 — Not Found' });
    }
    const groupId = getGroupId(req);
    const { errors, meal } = validateMeal(req.body, groupId);
    const groups = await loadGroups(req);
    if (!groups.some((group) => String(group.id) === String(groupId))) {
      errors.push('Select a mess group you are allowed to use.');
    }
    if (errors.length) {
      const current = await pool.query('SELECT * FROM meals WHERE id = $1', [req.params.id]);
      if (current.rowCount === 0) return res.status(404).render('errors/404', { title: '404 — Not Found' });
      return res.status(400).render('meals/edit', {
        title: 'Edit Meal — MessMate', meal: { ...current.rows[0], ...req.body }, messGroups: groups,
        mealTypes, formData: req.body, validationErrors: errors,
      });
    }
    const result = await pool.query(
      `UPDATE meals
       SET mess_group_id = $1, meal_date = $2, meal_type = $3, menu_items = $4, quantity = $5, cost_per_head = $6
       WHERE id = $7`,
      [meal.mess_group_id, meal.meal_date, meal.meal_type, meal.menu_items, Number(meal.quantity), Number(meal.cost_per_head), req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).render('errors/404', { title: '404 — Not Found' });
    req.session.flash = { success: 'Meal updated successfully.' };
    return res.redirect('/meals');
  } catch (err) {
    if (err.code === '23505') {
      req.session.flash = { error: 'You already have a meal entry for this group, date, and meal type.' };
      return res.redirect('/meals');
    }
    console.error('Error updating meal:', err);
    return res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to update meal' });
  }
};

exports.delete = async (req, res) => {
  try {
    if (!positiveInteger(req.params.id)) {
      return res.status(404).render('errors/404', { title: '404 — Not Found' });
    }
    const result = await pool.query('DELETE FROM meals WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).render('errors/404', { title: '404 — Not Found' });
    req.session.flash = { success: 'Meal deleted successfully.' };
    return req.method === 'DELETE' ? res.json({ success: true }) : res.redirect('/meals');
  } catch (err) {
    console.error('Error deleting meal:', err);
    return res.status(500).render('errors/500', { title: '500 — Server Error', message: 'Failed to delete meal' });
  }
};
