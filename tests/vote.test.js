
const request = require('supertest');
const app = require('../server');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Vote = require('../models/Vote');
const VoteOption = require('../models/VoteOption');
const { jwtSecret } = require('../middleware/auth');

describe('Voting flow', () => {
  test('submitVote creates option and sets user.voteStatus true', async () => {
    const password = await bcrypt.hash('password', 10);
    const user = await User.create({ name: 'Bob', email: 'bob@example.com', password, role: 'user' });

    const token = jwt.sign({ id: user._id.toString(), role: user.role }, jwtSecret, { expiresIn: '1h' });

    const res = await request(app)
      .post('/api/votes/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ customText: 'Custom Option', customDetail: 'details' });

    expect(res.status).toBe(200);
    expect(res.body.option).toBeDefined();
    expect(res.body.vote).toBeDefined();

    const freshUser = await User.findById(user._id);
    expect(freshUser.voteStatus).toBe(true);

    const vote = await Vote.findOne({ userId: user._id });
    expect(vote).not.toBeNull();
    expect(vote.answer).toBe(res.body.option.optionId);

    const option = await VoteOption.findOne({ optionId: res.body.option.optionId });
    expect(option).not.toBeNull();
    expect(option.isMain).toBe(false);
  });
});
