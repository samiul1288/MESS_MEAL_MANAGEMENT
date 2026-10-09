const bcrypt = require('bcrypt');
const request = require('supertest');
const app = require('../index');
const { pool } = require('../src/config/db');

describe('HTTP authentication and meal CRUD', () => {
  let passwordHash;
  let querySpy;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('correct-password', 4);
  });

  beforeEach(() => {
    querySpy = jest.spyOn(pool, 'query');
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  test('logs in with a valid bcrypt password and establishes an authenticated session', async () => {
    querySpy.mockResolvedValueOnce({
      rows: [{
        id: 41,
        username: 'member',
        email: 'member@example.test',
        full_name: 'Test Member',
        password_hash: passwordHash,
        role: 'member',
        mess_group_id: 7,
        is_active: true,
      }],
    });

    const agent = request.agent(app);
    const login = await agent
      .post('/auth/login')
      .type('form')
      .send({ username: 'member', password: 'correct-password' })
      .expect(302)
      .expect('Location', '/');

    expect(login.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('connect.sid=')])
    );
    expect(login.headers['set-cookie'].join(';')).toMatch(/SameSite=Lax/i);
    expect(login.headers['set-cookie'].join(';')).toMatch(/HttpOnly/i);
    expect(querySpy).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE username = $1',
      ['member']
    );
    querySpy
      .mockResolvedValueOnce({
        rows: [{
          id: 41,
          username: 'member',
          email: 'member@example.test',
          full_name: 'Test Member',
          role: 'member',
          is_active: true,
          created_at: '2026-10-01',
          mess_group_name: 'North Mess',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ name: 'Test Member', roll_number: 'R41', hall: 'North', room: '10', phone: '555' }],
      });
    await agent.get('/profile').expect(200).expect(/Test Member/);
  });

  test('rejects invalid credentials with a friendly error and no authenticated session', async () => {
    querySpy.mockResolvedValueOnce({ rows: [] });

    const agent = request.agent(app);
    await agent
      .post('/auth/login')
      .type('form')
      .send({ username: 'unknown', password: 'incorrect-password' })
      .expect(302)
      .expect('Location', '/auth/login');

    await agent.get('/auth/login').expect(200).expect(/Invalid username or password/);
    await agent.get('/profile').expect(302).expect('Location', '/auth/login');
  });

  test('logs out through POST and invalidates the authenticated session', async () => {
    querySpy.mockResolvedValueOnce({
      rows: [{
        id: 41,
        username: 'member',
        email: 'member@example.test',
        full_name: 'Test Member',
        password_hash: passwordHash,
        role: 'member',
        mess_group_id: 7,
        is_active: true,
      }],
    });

    const agent = request.agent(app);
    await agent
      .post('/auth/login')
      .type('form')
      .send({ username: 'member', password: 'correct-password' })
      .expect(302);
    await agent.get('/auth/logout').expect(404);
    await agent
      .post('/auth/logout')
      .expect(302)
      .expect('Location', '/auth/login');
    await agent.get('/profile').expect(302).expect('Location', '/auth/login');
  });

  test('creates a member meal using only parameterized SQL and the session group/user', async () => {
    querySpy
      .mockResolvedValueOnce({
        rows: [{
          id: 41,
          username: 'member',
          email: 'member@example.test',
          full_name: 'Test Member',
          password_hash: passwordHash,
          role: 'member',
          mess_group_id: 7,
          is_active: true,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 7, name: 'North Mess', code: 'NORTH' }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const agent = request.agent(app);
    await agent
      .post('/auth/login')
      .type('form')
      .send({ username: 'member', password: 'correct-password' })
      .expect(302);

    await agent.post('/expenses/create').type('form').send({}).expect(403);

    await agent
      .post('/meals/create')
      .type('form')
      .send({
        mess_group_id: '999',
        meal_date: '2026-10-09',
        meal_type: 'lunch',
        menu_items: 'Rice and vegetables',
        quantity: '2',
        cost_per_head: '45.50',
      })
      .expect(302)
      .expect('Location', '/meals');

    const insert = querySpy.mock.calls.find(([sql]) => sql.includes('INSERT INTO meals'));
    expect(insert).toBeDefined();
    expect(insert[0]).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7)');
    expect(insert[1]).toEqual([
      7,
      '2026-10-09',
      'lunch',
      'Rice and vegetables',
      2,
      45.5,
      41,
    ]);
  });
});
