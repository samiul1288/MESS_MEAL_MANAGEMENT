const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('../src/config/db');
const mealsController = require('../src/controllers/meals');
const expensesController = require('../src/controllers/expenses');
const dashboardController = require('../src/controllers/dashboard');
const reportsController = require('../src/controllers/reports');
const profileController = require('../src/controllers/profile');
const app = require('../src/app');
const paymentsController = require('../src/controllers/payments');
const groupsController = require('../src/controllers/groups');
const membersController = require('../src/controllers/members');
const auth = require('../src/middleware/auth');
const { validAmount, validDate } = require('../src/utils/validation');

function response() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    render(view, locals) {
      this.rendered = { view, locals };
      return this;
    },
    redirect(location) {
      this.redirectedTo = location;
      return this;
    },
  };
}

async function withMockQuery(mockQuery, callback) {
  const originalQuery = pool.query;
  pool.query = mockQuery;
  try {
    await callback();
  } finally {
    pool.query = originalQuery;
  }
}

test('date and amount validation rejects invalid calendar dates and out-of-range values', () => {
  assert.equal(validDate('2024-02-29'), true);
  assert.equal(validDate('2025-02-29'), false);
  assert.equal(validAmount('99999999.99'), true);
  assert.equal(validAmount('100000000'), false);
  assert.equal(validAmount('1.234'), false);
});

test('GET /hello responds with a working greeting', async () => {
  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/hello`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type').split(';')[0], 'text/plain');
    assert.equal(await response.text(), 'Hello from MessMate!');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test('profile page loads only the authenticated user and their linked member profile', async () => {
  const calls = [];
  await withMockQuery(async (sql, params) => {
    calls.push([sql, params]);
    if (sql.includes('FROM users')) {
      return {
        rows: [{
          id: 41, username: 'member', email: 'member@example.test', full_name: 'Test Member',
          role: 'member', is_active: true, created_at: '2026-10-01', mess_group_name: 'North',
        }],
      };
    }
    if (sql.includes('FROM members')) {
      return { rows: [{ name: 'Test Member', roll_number: 'R41', hall: 'North', room: '10', phone: '555' }] };
    }
    assert.fail(`Unexpected profile SQL: ${sql}`);
  }, async () => {
    const res = response();
    await profileController.show({ session: { userId: 41, userRole: 'member', messGroupId: 7 } }, res);
    assert.equal(res.rendered.view, 'profile/index');
    assert.equal(res.rendered.locals.user.username, 'member');
    assert.equal(res.rendered.locals.member.roll_number, 'R41');
    assert.equal(res.rendered.locals.homeUrl, '/dashboard');
  });
  assert.deepEqual(calls.map(([, params]) => params), [[41], [41, 'member@example.test', 7]]);
});

test('meal uniqueness allows separate member entries for the same meal slot', () => {
  const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
  const migration = fs.readFileSync(
    path.join(__dirname, '../db/migrations/001_meal_entries_per_creator.sql'),
    'utf8'
  );

  assert.match(schema, /UNIQUE \(mess_group_id, meal_date, meal_type, created_by\)/);
  assert.match(migration, /ON meals \(mess_group_id, meal_date, meal_type, created_by\)/);
  assert.match(migration, /DROP CONSTRAINT IF EXISTS uq_meal_date_group/);
});

test('member meal listing is scoped to their own creator and group IDs', async () => {
  const calls = [];
  await withMockQuery(async (query, params) => {
    calls.push([query, params]);
    if (query.includes('FROM mess_groups WHERE id')) return { rows: [{ id: 7, name: 'Group', code: 'G7' }] };
    return { rows: [] };
  }, async () => {
    const res = response();
    await mealsController.index({
      session: { userId: 41, userRole: 'member', messGroupId: 7 },
      query: { mess_group_id: '99' },
    }, res);

    assert.equal(res.rendered.view, 'meals/index');
  });
  const [sql, params] = calls.find(([query]) => query.includes('FROM meals m'));
  assert.match(sql, /m\.created_by = \$1/);
  assert.match(sql, /m\.mess_group_id = \$2/);
  assert.deepEqual(params, [41, 7]);
});

test('member meal creation ignores a submitted group and records the authenticated owner', async () => {
  const calls = [];
  await withMockQuery(async (sql, params) => {
    calls.push([sql, params]);
    if (sql.includes('FROM mess_groups WHERE id')) return { rows: [{ id: 7, name: 'Group', code: 'G7' }] };
    return { rowCount: 1, rows: [] };
  }, async () => {
    const req = {
      session: { userId: 41, userRole: 'member', messGroupId: 7 },
      body: {
        mess_group_id: '99',
        meal_date: '2026-10-09',
        meal_type: 'lunch',
        menu_items: 'Rice and vegetables',
        quantity: '12',
        cost_per_head: '25.50',
      },
    };
    const res = response();
    await mealsController.create(req, res);
    assert.equal(res.redirectedTo, '/meals');
  });

  const insert = calls.find(([sql]) => sql.includes('INSERT INTO meals'));
  assert.ok(insert);
  assert.deepEqual(insert[1], [7, '2026-10-09', 'lunch', 'Rice and vegetables', 12, 25.5, 41, 41]);
});

test('admin meal creation assigns the selected member and records the admin actor', async () => {
  const calls = [];
  await withMockQuery(async (sql, params) => {
    calls.push([sql, params]);
    if (sql.includes('FROM mess_groups ORDER BY name')) {
      return { rows: [{ id: 7, name: 'North Mess', code: 'NORTH' }] };
    }
    if (sql.includes('FROM users u') && sql.includes('mess_group_name')) {
      return {
        rows: [{
          id: 41,
          full_name: 'Rafi Ahmed',
          username: 'rafi',
          mess_group_id: 7,
          mess_group_name: 'North Mess',
        }],
      };
    }
    if (sql.includes('INSERT INTO meals')) return { rowCount: 1, rows: [] };
    assert.fail(`Unexpected admin meal SQL: ${sql}`);
  }, async () => {
    const req = {
      session: { userId: 5, userRole: 'admin' },
      body: {
        mess_group_id: '7',
        member_id: '41',
        meal_date: '2026-10-09',
        meal_type: 'lunch',
        menu_items: 'Rice and vegetables',
        quantity: '1',
        cost_per_head: '45.50',
      },
    };
    const res = response();
    await mealsController.create(req, res);
    assert.equal(res.redirectedTo, '/meals');
    assert.match(req.session.flash.success, /selected member/);
  });

  const insert = calls.find(([sql]) => sql.includes('INSERT INTO meals'));
  assert.ok(insert);
  assert.match(insert[0], /created_by, entered_by/);
  assert.deepEqual(insert[1], [7, '2026-10-09', 'lunch', 'Rice and vegetables', 1, 45.5, 41, 5]);
});

test('admin meal creation rejects a member from a different selected group', async () => {
  let insertAttempted = false;
  await withMockQuery(async (sql) => {
    if (sql.includes('FROM mess_groups ORDER BY name')) {
      return { rows: [{ id: 7, name: 'North Mess', code: 'NORTH' }] };
    }
    if (sql.includes('FROM users u') && sql.includes('mess_group_name')) {
      return {
        rows: [{ id: 41, full_name: 'Rafi Ahmed', username: 'rafi', mess_group_id: 8, mess_group_name: 'South Mess' }],
      };
    }
    if (sql.includes('INSERT INTO meals')) insertAttempted = true;
    assert.fail(`Unexpected query for mismatched group: ${sql}`);
  }, async () => {
    const res = response();
    await mealsController.create({
      session: { userId: 5, userRole: 'admin' },
      body: {
        mess_group_id: '7',
        member_id: '41',
        meal_date: '2026-10-09',
        meal_type: 'lunch',
        menu_items: 'Rice',
        quantity: '1',
        cost_per_head: '10',
      },
    }, res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.rendered.locals.validationErrors.some((error) => error.includes('does not belong')));
  });
  assert.equal(insertAttempted, false);
});

test('member payment query is constrained to their matching profile', async () => {
  let captured;
  await withMockQuery(async (sql, params) => {
    captured = [sql, params];
    return { rows: [] };
  }, async () => {
    const res = response();
    await paymentsController.index({ session: { userId: 41, userRole: 'member' }, query: {} }, res);
    assert.equal(res.rendered.view, 'payments/index');
  });
  assert.match(captured[0], /EXISTS/);
  assert.match(captured[0], /LOWER\(own_member\.email\) = LOWER\(own_user\.email\)/);
  assert.deepEqual(captured[1], [41]);
});

test('member dashboard calculates meal rate, due, and advance from scoped data', async () => {
  await withMockQuery(async (sql) => {
    if (sql.includes('FROM members')) return { rows: [{ id: 9, name: 'Member', roll_number: 'R9' }] };
    if (sql.includes('COUNT(*) AS entries')) return { rows: [{ entries: '4', meal_count: '10' }] };
    if (sql.includes('AS total') && sql.includes('FROM bazar_expenses')) return { rows: [{ total: '90' }] };
    if (sql.includes('FILTER (WHERE status')) return { rows: [{ paid: '20' }] };
    if (sql.includes('AS meal_count') && sql.includes('created_by = $1')) {
      return { rows: [{ meal_count: '10' }] };
    }
    if (sql.includes('AS meal_count')) return { rows: [{ meal_count: '30' }] };
    if (sql.includes('generate_series')) {
      return { rows: [{ day: '2026-10-01', meal_count: '2' }] };
    }
    assert.fail(`Unexpected dashboard SQL: ${sql}`);
  }, async () => {
    const res = response();
    await dashboardController.member(
      { session: { userId: 41, userRole: 'member', messGroupId: 7 } },
      res
    );
    assert.equal(res.rendered.view, 'dashboard/member');
    assert.deepEqual(res.rendered.locals.stats, {
      mealEntries: 4,
      mealUnits: 10,
      mealRate: '3.00',
      mealCost: '30.00',
      paid: '20.00',
      balance: '-10.00',
      due: '10.00',
      advance: '0.00',
    });
  });
});

test('member dashboard without an assigned group does not aggregate other groups', async () => {
  const calls = [];
  await withMockQuery(async (sql, params) => {
    calls.push([sql, params]);
    return { rows: [] };
  }, async () => {
    const res = response();
    await dashboardController.member(
      { session: { userId: 41, userRole: 'member', messGroupId: null } },
      res
    );
    assert.equal(res.rendered.view, 'dashboard/member');
    assert.equal(res.rendered.locals.stats.mealRate, '0.00');
  });
  assert.equal(calls.length, 1);
});

test('expense member filter is parameterized and passed to the expense view', async () => {
  const calls = [];
  await withMockQuery(async (sql, params) => {
    calls.push([sql, params]);
    if (sql.includes('FROM bazar_expenses b')) return { rows: [] };
    if (sql.includes('FROM mess_groups')) return { rows: [] };
    if (sql.includes('FROM users')) return { rows: [{ id: 41, full_name: 'Member', username: 'member' }] };
    assert.fail(`Unexpected expense SQL: ${sql}`);
  }, async () => {
    const res = response();
    await expensesController.index(
      { query: { member_id: '41' }, session: { userRole: 'admin' } },
      res
    );
    assert.equal(res.rendered.view, 'expenses/index');
    assert.equal(res.rendered.locals.members[0].id, 41);
  });
  const expenseQuery = calls.find(([sql]) => sql.includes('FROM bazar_expenses b'));
  assert.match(expenseQuery[0], /b\.created_by = \$1/);
  assert.deepEqual(expenseQuery[1], ['41']);
});

test('admin dashboard calculates current meal rate and uses selected group filters', async () => {
  await withMockQuery(async (sql) => {
    if (sql.includes('AS total_spent')) return { rows: [{ total_spent: '900' }] };
    if (sql.includes('AS total_dues')) return { rows: [{ total_dues: '500', total_paid: '400' }] };
    if (sql.includes('AS total_members')) return { rows: [{ total_members: '20', active_members: '18' }] };
    if (sql.includes('AS expenses') && sql.includes('AS meal_units')) {
      return { rows: [{ expenses: '90', meal_units: '30' }] };
    }
    if (sql.includes('AS total_cost')) return { rows: [{ total: '60', total_cost: '1200' }] };
    if (sql.includes('SELECT id, name, code FROM mess_groups')) return { rows: [] };
    if (sql.includes('WITH months AS')) return { rows: [] };
    assert.fail(`Unexpected admin dashboard SQL: ${sql}`);
  }, async () => {
    const res = response();
    await reportsController.dashboard({ query: { mess_group_id: '0' } }, res);
    assert.equal(res.rendered.view, 'reports/dashboard');
    assert.equal(res.rendered.locals.stats.totalMembers, '20');
    assert.equal(res.rendered.locals.stats.totalMeals, 60);
    assert.equal(res.rendered.locals.stats.totalExpenses, '900.00');
    assert.equal(res.rendered.locals.stats.currentMealRate, '3.00');
  });
});

test('monthly report filters by linked member and calculates group meal rate', async () => {
  const calls = [];
  await withMockQuery(async (sql, params) => {
    calls.push([sql, params]);
    if (sql.includes('SELECT id, name, code FROM mess_groups')) return { rows: [] };
    if (sql.includes('SELECT DISTINCT member.id')) {
      return { rows: [{ id: 9, name: 'Member', roll_number: 'R9' }] };
    }
    if (sql.includes('SELECT owner.id')) return { rows: [{ id: 41 }] };
    if (sql.includes('AS group_meal_units')) {
      return { rows: [{ expenses: '120', group_meal_units: '40', selected_meal_units: '8' }] };
    }
    if (sql.includes('WITH days AS')) return { rows: [] };
    assert.fail(`Unexpected monthly report SQL: ${sql}`);
  }, async () => {
    const res = response();
    await reportsController.monthlyReport({
      query: {
        mess_group_id: '7',
        date_from: '2026-10-01',
        date_to: '2026-10-31',
        member_id: '9',
      },
    }, res);
    assert.equal(res.rendered.view, 'reports/monthly');
    assert.equal(res.rendered.locals.report.mealRate, '3.00');
    assert.equal(res.rendered.locals.report.memberMealUnits, 8);
    assert.equal(res.rendered.locals.report.memberMealCost, '24.00');
  });

  const totalsQuery = calls.find(([sql]) => sql.includes('AS group_meal_units'));
  assert.deepEqual(totalsQuery[1], [7, '2026-10-01', '2026-10-31', 41]);
});

test('non-admin users receive forbidden status from the admin guard', () => {
  const res = response();
  auth.isAdmin({ session: { userId: 41, userRole: 'member' } }, res, () => {
    assert.fail('Members must not pass the admin guard');
  });
  assert.equal(res.statusCode, 403);
  assert.equal(res.rendered.view, 'errors/403');
});

test('member account migration links existing profiles and keeps account links unique', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../db/migrations/003_member_account_group_link.sql'),
    'utf8'
  );
  assert.match(migration, /ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users/);
  assert.match(migration, /LOWER\(m\.email\) = LOWER\(u\.email\)/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS uq_members_user_id/);
  assert.match(migration, /UPDATE users u[\s\S]+SET mess_group_id = m\.mess_group_id/);
});

test('member creation links the selected account and assigns its group transactionally', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push([sql, params]);
      if (sql.includes('FROM mess_groups WHERE id')) return { rowCount: 1, rows: [{ id: 7 }] };
      if (sql.includes('FROM users u')) {
        return { rowCount: 1, rows: [{ id: 41, email: 'member@example.test' }] };
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  const originalConnect = pool.connect;
  pool.connect = async () => client;
  try {
    const req = {
      session: {},
      body: {
        mess_group_id: '7',
        account_id: '41',
        roll_number: 'R41',
        name: 'Test Member',
        hall: 'North',
        room: '10',
        batch: '2026',
        phone: '555',
        status: 'active',
      },
    };
    const res = response();
    await membersController.create(req, res);
    assert.equal(res.redirectedTo, '/members');
    assert.match(req.session.flash.success, /assigned/);
    const insert = calls.find(([sql]) => sql.includes('INSERT INTO members'));
    assert.deepEqual(insert[1], [41, '7', 'R41', 'Test Member', 'North', '10', '2026', '555', 'member@example.test', 'active']);
    assert.ok(calls.some(([sql, params]) => sql.includes('UPDATE users SET mess_group_id') && params[0] === '7' && params[1] === 41));
    assert.equal(calls[0][0], 'BEGIN');
    assert.equal(calls.at(-1)[0], 'COMMIT');
  } finally {
    pool.connect = originalConnect;
  }
});

test('group deletion is refused while records or members reference it', async () => {
  let queryCount = 0;
  await withMockQuery(async () => {
    queryCount += 1;
    return { rows: [{ usage_count: '2' }] };
  }, async () => {
    const req = { params: { id: '7' }, session: {} };
    const res = response();
    await groupsController.delete(req, res);
    assert.equal(res.redirectedTo, '/groups');
    assert.equal(req.session.flash.error.includes('linked users or records'), true);
  });
  assert.equal(queryCount, 1);
});
