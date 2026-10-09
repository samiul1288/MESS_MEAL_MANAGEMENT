const { pool } = require('../config/db');

exports.show = async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT users.id, users.username, users.email, users.full_name, users.role,
              users.is_active, users.created_at, groups.name AS mess_group_name
       FROM users
       LEFT JOIN mess_groups groups ON groups.id = users.mess_group_id
       WHERE users.id = $1`,
      [req.session.userId]
    );
    const user = userResult.rows[0];
    if (!user) {
      return req.session.destroy((err) => {
        if (err) {
          console.error('Failed to destroy session for missing profile:', err);
          return res.status(500).render('errors/500', {
            title: '500 — Server Error',
            message: 'Could not reset the invalid session',
          });
        }
        return res.redirect('/auth/login');
      });
    }

    let member = null;
    if (user.role === 'member') {
      const memberResult = await pool.query(
        `SELECT name, roll_number, hall, room, phone
         FROM members
         WHERE LOWER(email) = LOWER($1)
           AND ($2::integer IS NULL OR mess_group_id = $2)
         ORDER BY id
         LIMIT 1`,
        [user.email, req.session.messGroupId || null]
      );
      member = memberResult.rows[0] || null;
    }

    return res.render('profile/index', {
      title: 'Your Profile — MessMate',
      user,
      member,
      homeUrl: user.role === 'admin' ? '/reports' : user.role === 'member' ? '/dashboard' : '/meals',
    });
  } catch (err) {
    console.error('Error loading profile:', err);
    return res.status(500).render('errors/500', {
      title: '500 — Server Error',
      message: 'Failed to load your profile',
    });
  }
};
