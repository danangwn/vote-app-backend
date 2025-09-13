
const request = require('supertest');
const app = require('../server');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Vote = require('../models/Vote');
const VoteOption = require('../models/VoteOption');
const { jwtSecret } = require('../middleware/auth');

describe('User delete rules', () => {
  test('admin cannot delete a user who already voted', async () => {
    const password = await bcrypt.hash('pass', 10);
    const admin = await User.create({ name: 'Admin', email: 'admin@example.com', password, role: 'admin' });
    const user = await User.create({ name: 'Voter', email: 'voter@example.com', password, role: 'user', voteStatus: true });

    const opt = await VoteOption.create({ text: 'Opt', detail_text: '', isMain: false });
    await Vote.create({ userId: user._id, answer: opt.optionId });

    const token = jwt.sign({ id: admin._id.toString(), role: admin.role }, jwtSecret, { expiresIn: '1h' });

    const res = await request(app)
      .delete(`/api/users/${user._id.toString()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already voted/i);
  });

  test('admin cannot delete themself', async () => {
    const password = await bcrypt.hash('pass', 10);
    const admin = await User.create({ name: 'Admin2', email: 'admin2@example.com', password, role: 'admin' });

    const token = jwt.sign({ id: admin._id.toString(), role: admin.role }, jwtSecret, { expiresIn: '1h' });

    const res = await request(app)
      .delete(`/api/users/${admin._id.toString()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/cannot delete your own/i);
  });
});
