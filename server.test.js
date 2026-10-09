const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const request = require('supertest');

const app = require('./server');

async function startSmtpSink() {
  const emails = [];
  const server = net.createServer((socket) => {
    let input = '';
    let message = '';
    let readingMessage = false;
    socket.write('220 smtp.test ESMTP\r\n');
    socket.on('data', (chunk) => {
      input += chunk.toString();
      let lineEnd = input.indexOf('\r\n');
      while (lineEnd !== -1) {
        const line = input.slice(0, lineEnd);
        input = input.slice(lineEnd + 2);
        if (readingMessage) {
          if (line === '.') {
            readingMessage = false;
            emails.push(message);
            message = '';
            socket.write('250 2.0.0 queued\r\n');
          } else {
            message += `${line.replace(/^\.\./, '.')}\n`;
          }
        } else if (line.startsWith('EHLO') || line.startsWith('HELO')) {
          socket.write('250-smtp.test\r\n250 AUTH PLAIN LOGIN\r\n');
        } else if (line.startsWith('AUTH ')) {
          socket.write('235 2.7.0 authenticated\r\n');
        } else if (line.startsWith('MAIL FROM') || line.startsWith('RCPT TO')) {
          socket.write('250 2.1.0 accepted\r\n');
        } else if (line === 'DATA') {
          readingMessage = true;
          socket.write('354 send message content\r\n');
        } else if (line === 'QUIT') {
          socket.write('221 2.0.0 goodbye\r\n');
          socket.end();
        } else {
          socket.write('250 2.0.0 ok\r\n');
        }
        lineEnd = input.indexOf('\r\n');
      }
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { emails, port: server.address().port, close: () => new Promise((resolve) => server.close(resolve)) };
}

test('GET /api/health returns ok', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('GET /api/questions returns the full multi-exam question bank', async () => {
  const response = await request(app).get('/api/questions');
  assert.equal(response.status, 200);
  assert.equal(response.body.questions.length, 518);
  assert.deepEqual(new Set(response.body.questions.map((question) => question.exam)), new Set(['SSC CGL', 'Railway NTPC', 'Railway Group D']));
});

test('Hindi subject sets contain Hindi grammar questions for each exam', async () => {
  for (const exam of ['SSC CGL', 'Railway NTPC', 'Railway Group D']) {
    const response = await request(app).get('/api/question-sets').query({ exam, subject: 'Hindi', set: 1 });
    assert.equal(response.status, 200);
    assert.equal(response.body.subject, 'Hindi');
    assert.equal(response.body.questions.length, 50);
    assert.ok(response.body.questions.every((question) => /[\u0900-\u097f]/.test(question.text)));
    assert.ok(response.body.questions.some((question) => question.topic === 'व्याकरण' || question.topic === 'संज्ञा'));
  }
});

test('subject tests are graded from answers rather than a submitted score', async () => {
  const questions = await request(app).get('/api/question-sets').query({ exam: 'SSC CGL', subject: 'Hindi', set: 1 });
  assert.equal(questions.body.questions.length, 50);
  assert.equal('answer' in questions.body.questions[0], false);
  const result = await request(app).post('/api/question-sets/results').send({
    exam: 'SSC CGL', subject: 'Hindi', set: 1, answers: Array(50).fill(null), score: 50
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.attempt.score, 0);
  assert.equal(result.body.attempt.total, 50);
});

test('mock-test endpoints return the advertised exam size and duration', async () => {
  const expectedTests = [
    ['sbi-clerk', 'SBI Clerk', 100, 3600],
    ['ssc-cgl', 'SSC CGL', 100, 3600],
    ['nda-mathematics', 'NDA', 120, 9000]
  ];
  for (const [id, exam, totalQuestions, durationSeconds] of expectedTests) {
    const response = await request(app).get(`/api/mock-tests/${id}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.exam, exam);
    assert.equal(response.body.totalQuestions, totalQuestions);
    assert.equal(response.body.durationSeconds, durationSeconds);
    assert.equal(response.body.questions.length, totalQuestions);
    assert.equal(new Set(response.body.questions.map((question) => question.id)).size, totalQuestions);
  }
  assert.equal((await request(app).get('/api/mock-tests/not-a-test')).status, 404);
});

test('class test series return class-specific subjects and questions', async () => {
  const classNine = await request(app).get('/api/classes/9/series');
  const classTwelve = await request(app).get('/api/classes/12/series');
  assert.equal(classNine.status, 200);
  assert.equal(classTwelve.status, 200);
  assert.deepEqual(classNine.body.subjects.map((entry) => entry.subject), ['Mathematics', 'Science', 'English', 'Social Science']);
  assert.ok(classTwelve.body.subjects.some((entry) => entry.subject === 'Physics'));

  const questionsNine = await request(app).get('/api/classes/9/series/Mathematics/1');
  const questionsTwelve = await request(app).get('/api/classes/12/series/Mathematics/1');
  assert.equal(questionsNine.body.questions.length, 10);
  assert.equal(new Set(questionsNine.body.questions.map((question) => question.text)).size, 10);
  assert.equal(new Set(questionsTwelve.body.questions.map((question) => question.text)).size, 10);
  assert.equal('answer' in questionsNine.body.questions[0], false);
  assert.notEqual(questionsNine.body.questions[0].text, questionsTwelve.body.questions[0].text);
  assert.equal((await request(app).get('/api/classes/8/series')).status, 404);
  assert.equal((await request(app).get('/api/classes/9/series/Physics/1')).status, 404);
  assert.equal((await request(app).get('/classes/9')).status, 200);
});

test('class test results are graded by the backend', async () => {
  const signup = await request(app).post('/api/auth/signup').send({ name: 'Class Tester', email: `class-${Date.now()}@example.com`, password: 'secret123' });
  const authorization = { Authorization: `Bearer ${signup.body.token}` };
  const testSet = await request(app).get('/api/classes/9/series/Mathematics/1');
  const answers = Array(10).fill(0);
  const result = await request(app).post('/api/classes/9/series/Mathematics/1/results').set(authorization).send({ answers, durationSeconds: 90 });
  assert.equal(result.status, 201);
  assert.equal(result.body.attempt.score, 10);
  assert.equal(result.body.attempt.classNumber, '9');
  const guestResult = await request(app).post('/api/classes/9/series/Mathematics/1/results').send({ answers });
  assert.equal(guestResult.status, 200);
  assert.equal(guestResult.body.attempt.score, 10);
  assert.equal((await request(app).post('/api/classes/9/series/Mathematics/1/results').set(authorization).send({ answers: [0] })).status, 400);
});

test('private data files and backend source are not served as static assets', async () => {
  assert.equal((await request(app).get('/data/users.json')).status, 404);
  assert.equal((await request(app).get('/server.js')).status, 404);
});

test('POST /api/contact stores a contact message', async () => {
  const response = await request(app).post('/api/contact').send({
    name: 'Website Visitor',
    email: `visitor-${Date.now()}@example.com`,
    subject: 'Help with mock tests',
    message: 'I have a question about the practice tests.'
  });

  assert.equal(response.status, 201);
  assert.match(response.body.message, /get back to you/i);
});

test('POST /api/auth/signup creates a user', async () => {
  const uniqueEmail = `testuser-${Date.now()}@example.com`;
  const response = await request(app).post('/api/auth/signup').send({
    name: 'Test User',
    email: uniqueEmail,
    password: 'secret123',
    exam: 'UPSC',
    location: 'Delhi'
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, uniqueEmail);
  assert.equal(typeof response.body.token, 'string');
  assert.equal('password' in response.body.user, false);
});

test('POST /api/auth/guest creates a unique guest profile', async () => {
  const first = await request(app).post('/api/auth/guest').send({
    name: 'Guest Learner', exam: 'SSC CGL', location: 'Jaipur'
  });
  const second = await request(app).post('/api/auth/guest').send({
    name: 'Another Guest', exam: 'UPSC', location: 'Kochi'
  });

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.match(first.body.guestId, /^GUEST-/);
  assert.notEqual(first.body.guestId, second.body.guestId);
  assert.equal(first.body.user.isGuest, true);
  assert.equal(first.body.user.exam, 'SSC CGL');
  assert.equal(typeof first.body.token, 'string');
});

test('POST /api/auth/login issues a session and logout revokes it', async () => {
  const email = `login-${Date.now()}@example.com`;
  await request(app).post('/api/auth/signup').send({ name: 'Login User', email, password: 'secret123' });
  const login = await request(app).post('/api/auth/login').send({ email, password: 'secret123' });
  assert.equal(login.status, 200);
  assert.equal(typeof login.body.token, 'string');
  const authorization = { Authorization: `Bearer ${login.body.token}` };
  assert.equal((await request(app).get('/api/profile/me').set(authorization)).status, 200);
  assert.equal((await request(app).post('/api/auth/logout').set(authorization)).status, 200);
  assert.equal((await request(app).get('/api/profile/me').set(authorization)).status, 401);
});

test('password reset rejects the old public demo OTP flow', async () => {
  const response = await request(app).post('/api/auth/reset-password').send({ email: 'anyone@example.com', otp: '123456', newPassword: 'newsecret123' });
  assert.equal(response.status, 400);
});

test('password reset explains when SMTP is not configured', async () => {
  const environmentKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const previousEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
  environmentKeys.forEach((key) => delete process.env[key]);
  try {
    const response = await request(app).post('/api/auth/request-password-reset').send({ email: 'learner@example.com' });
    assert.equal(response.status, 503);
    assert.match(response.body.error, /contact the site administrator/i);
  } finally {
    environmentKeys.forEach((key) => {
      if (previousEnvironment[key] !== undefined) process.env[key] = previousEnvironment[key];
    });
  }
});

test('password reset emails a short-lived code, verifies it, and revokes old sessions', async (context) => {
  const smtp = await startSmtpSink();
  context.after(() => smtp.close());
  const environmentKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const previousEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = String(smtp.port);
  process.env.SMTP_USER = 'test-user';
  process.env.SMTP_PASS = 'test-password';
  process.env.SMTP_FROM = 'Result Darpan <noreply@example.com>';

  try {
    const email = `reset-${Date.now()}@example.com`;
    const signup = await request(app).post('/api/auth/signup').send({ name: 'Reset User', email, password: 'oldpassword123' });
    const requestResponse = await request(app).post('/api/auth/request-password-reset').send({ email });
    assert.equal(requestResponse.status, 200);
    assert.match(requestResponse.body.message, /if an account exists/i);
    const sentEmail = smtp.emails.find((message) => message.includes(email));
    const code = sentEmail?.match(/reset code is (\d{6})/)?.[1];
    assert.ok(code);

    const wrongCode = await request(app).post('/api/auth/verify-password-reset').send({ email, code: '000000' === code ? '000001' : '000000' });
    assert.equal(wrongCode.status, 400);
    const verification = await request(app).post('/api/auth/verify-password-reset').send({ email, code });
    assert.equal(verification.status, 200);
    assert.equal((await request(app).post('/api/auth/verify-password-reset').send({ email, code })).status, 400);

    const reset = await request(app).post('/api/auth/reset-password').send({ email, resetToken: verification.body.resetToken, newPassword: 'newpassword123' });
    assert.equal(reset.status, 200);
    assert.equal((await request(app).get('/api/profile/me').set('Authorization', `Bearer ${signup.body.token}`)).status, 401);
    assert.equal((await request(app).post('/api/auth/login').send({ email, password: 'oldpassword123' })).status, 401);
    assert.equal((await request(app).post('/api/auth/login').send({ email, password: 'newpassword123' })).status, 200);
  } finally {
    environmentKeys.forEach((key) => {
      if (previousEnvironment[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnvironment[key];
    });
  }
});

test('GET /api/admin/summary requires the configured authenticated admin', async () => {
  const previousAdminEmail = process.env.ADMIN_EMAIL;
  const adminEmail = `admin-${Date.now()}@example.com`;
  process.env.ADMIN_EMAIL = adminEmail;
  try {
    const admin = await request(app).post('/api/auth/signup').send({ name: 'Admin User', email: adminEmail, password: 'secret123' });
    const other = await request(app).post('/api/auth/signup').send({ name: 'Regular User', email: `regular-${Date.now()}@example.com`, password: 'secret123' });
    assert.equal((await request(app).get('/api/admin/summary')).status, 401);
    const response = await request(app).get('/api/admin/summary').set('Authorization', `Bearer ${admin.body.token}`);
    assert.equal(response.status, 200);
    assert.equal(typeof response.body.totalUsers, 'number');
    assert.equal(typeof response.body.totalMessages, 'number');
    assert.ok(Array.isArray(response.body.recentUsers));
    assert.ok(Array.isArray(response.body.recentMessages));
    assert.equal((await request(app).get('/api/admin/summary').set('Authorization', `Bearer ${other.body.token}`)).status, 403);
  } finally {
    if (previousAdminEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previousAdminEmail;
  }
});

test('GET /api/profile/me returns only the authenticated user profile and activity', async () => {
  const email = `profile-${Date.now()}@example.com`;
  const signup = await request(app).post('/api/auth/signup').send({
    name: 'Profile User', email, password: 'secret123', exam: 'CAT', location: 'Pune'
  });
  const token = signup.body.token;
  await request(app).post('/api/chat/messages').set('Authorization', `Bearer ${token}`).send({
    text: 'My account message', author: 'student', email
  });
  const response = await request(app).get('/api/profile/me').set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.user.email, email);
  assert.equal(response.body.stats.messagesSent, 1);
  assert.equal((await request(app).get('/api/profile/me')).status, 401);
  assert.equal((await request(app).get('/api/profile/other@example.com').set('Authorization', `Bearer ${token}`)).status, 403);
});

test('server-graded test results update only the authenticated user stats', async () => {
  const email = `results-${Date.now()}@example.com`;
  const signup = await request(app).post('/api/auth/signup').send({
    name: 'Results User', email, password: 'secret123', exam: 'SSC', location: 'Patna'
  });
  const token = signup.body.token;

  const answers = Array(100).fill(null);
  const saveResponse = await request(app).post('/api/mock-tests/ssc-cgl/results').set('Authorization', `Bearer ${token}`).send({ answers, score: 100, durationSeconds: 120 });
  assert.equal(saveResponse.status, 201);
  assert.equal(saveResponse.body.stats.testsTaken, 1);
  assert.equal(saveResponse.body.stats.bestAccuracy, 0);
  assert.equal(saveResponse.body.stats.averageAccuracy, 0);
  assert.equal(saveResponse.body.stats.studyTimeMinutes, 2);
  assert.equal(saveResponse.body.attempt.durationSeconds, 120);
  assert.equal(saveResponse.body.attempt.testId, 'ssc-cgl');
  assert.equal(saveResponse.body.attempt.score, 0);
  assert.equal(saveResponse.body.attempt.total, 100);

  const profileResponse = await request(app).get('/api/profile/me').set('Authorization', `Bearer ${token}`);
  assert.equal(profileResponse.body.stats.testsTaken, 1);
  assert.equal(profileResponse.body.stats.bestAccuracy, 0);
  assert.equal(profileResponse.body.stats.studyTimeMinutes, 2);
  assert.equal((await request(app).post('/api/profile/me/test-results').set('Authorization', `Bearer ${token}`).send({ score: 100, total: 100 })).status, 410);
  assert.equal((await request(app).post(`/api/profile/other@example.com/test-results`).set('Authorization', `Bearer ${token}`).send({ score: 1, total: 1 })).status, 403);
});

test('profile settings and goals persist separately for each signed-in user', async () => {
  const first = await request(app).post('/api/auth/signup').send({ name: 'First User', email: `first-${Date.now()}@example.com`, password: 'secret123' });
  const second = await request(app).post('/api/auth/signup').send({ name: 'Second User', email: `second-${Date.now()}@example.com`, password: 'secret123' });
  const firstAuth = { Authorization: `Bearer ${first.body.token}` };
  const secondAuth = { Authorization: `Bearer ${second.body.token}` };

  await request(app).patch('/api/profile/me').set(firstAuth).send({ name: 'First Updated', schoolClass: '10' }).expect(200);
  await request(app).post('/api/profile/me/goals').set(firstAuth).send({ name: 'SSC CGL' }).expect(201);
  const options = await request(app).get('/api/profile/me/goals/options').set(firstAuth);
  assert.equal(options.body.maxSelections, 5);
  assert.ok(options.body.groups.some((group) => group.exams.includes('NEET UG')));
  await request(app).put('/api/profile/me/goals').set(secondAuth).send({ goals: ['UPSC Civil Services (CSE)', 'NEET UG'] }).expect(200);

  const firstProfile = await request(app).get('/api/profile/me').set(firstAuth);
  const secondProfile = await request(app).get('/api/profile/me').set(secondAuth);
  assert.equal(firstProfile.body.user.name, 'First Updated');
  assert.equal(firstProfile.body.user.schoolClass, '10');
  assert.deepEqual(firstProfile.body.user.goals.map((goal) => goal.name), ['SSC CGL']);
  assert.equal(secondProfile.body.user.schoolClass, null);
  assert.deepEqual(secondProfile.body.user.goals.map((goal) => goal.name), ['UPSC Civil Services (CSE)', 'NEET UG']);
  assert.equal((await request(app).put('/api/profile/me/goals').set(secondAuth).send({ goals: ['SSC CGL', 'SSC CHSL', 'SSC MTS', 'SBI PO', 'NEET UG', 'JEE Main'] })).status, 400);
  assert.equal((await request(app).put('/api/profile/me/goals').set(secondAuth).send({ goals: ['SSC CGL', 'SSC CGL'] })).status, 400);
});

test('levels award points for completed tests and verified helpful chat votes', async () => {
  const authorEmail = `levels-author-${Date.now()}@example.com`;
  const author = await request(app).post('/api/auth/signup').send({ name: 'Helpful Author', email: authorEmail, password: 'secret123' });
  const voter = await request(app).post('/api/auth/signup').send({ name: 'Helpful Voter', email: `levels-voter-${Date.now()}@example.com`, password: 'secret123' });
  const authorAuth = { Authorization: `Bearer ${author.body.token}` };
  const voterAuth = { Authorization: `Bearer ${voter.body.token}` };

  const initial = await request(app).get('/api/profile/me').set(authorAuth);
  assert.equal(initial.body.gamification.points, 0);
  assert.equal(initial.body.gamification.level, 'Newbie');
  await request(app).post('/api/mock-tests/ssc-cgl/results').set(authorAuth).send({ answers: Array(100).fill(null), durationSeconds: 10 }).expect(201);
  const noTestPoints = await request(app).get('/api/profile/me').set(authorAuth);
  assert.equal(noTestPoints.body.gamification.points, 0);
  const testResult = await request(app).post('/api/mock-tests/ssc-cgl/results').set(authorAuth).send({ answers: Array(100).fill(0), durationSeconds: 600 });
  assert.equal(testResult.status, 201);
  assert.equal(testResult.body.stats.testsTaken, 2);
  const firstTest = await request(app).get('/api/profile/me').set(authorAuth);
  assert.equal(firstTest.body.gamification.points, 5);
  assert.equal(firstTest.body.gamification.level, 'Newbie');
  for (let index = 0; index < 19; index += 1) {
    await request(app).post('/api/mock-tests/ssc-cgl/results').set(authorAuth).send({ answers: Array(100).fill(0), durationSeconds: 600 }).expect(201);
  }
  const levelUp = await request(app).get('/api/profile/me').set(authorAuth);
  assert.equal(levelUp.body.gamification.points, 100);
  assert.equal(levelUp.body.gamification.level, 'Learner');
  assert.equal(levelUp.body.gamification.levelNumber, 2);
  assert.equal(levelUp.body.gamification.levelProgress, 0);

  const posted = await request(app).post('/api/chat/messages').set(authorAuth).send({ text: 'Here is a useful study tip.' });
  const messageId = posted.body.message.id;
  const messagesForVoter = await request(app).get('/api/chat/messages').set(voterAuth);
  const messageForVoter = messagesForVoter.body.messages.find((message) => message.id === messageId);
  assert.equal(messageForVoter.isOwnMessage, false);
  assert.equal(messageForVoter.helpfulCount, 0);

  assert.equal((await request(app).post(`/api/chat/messages/${messageId}/helpful`).set(authorAuth)).status, 403);
  assert.equal((await request(app).post(`/api/chat/messages/${messageId}/helpful`).set(voterAuth)).status, 201);
  assert.equal((await request(app).post(`/api/chat/messages/${messageId}/helpful`).set(voterAuth)).status, 409);

  const updated = await request(app).get('/api/profile/me').set(authorAuth);
  assert.equal(updated.body.gamification.testsCompleted, 20);
  assert.equal(updated.body.gamification.helpfulVotes, 1);
  assert.equal(updated.body.gamification.points, 110);
  assert.equal(updated.body.gamification.level, 'Learner');
  assert.equal(updated.body.gamification.levelProgress, 10);
  assert.ok(updated.body.gamification.badges.find((badge) => badge.id === 'first-test')?.earned);
  assert.ok(updated.body.gamification.badges.find((badge) => badge.id === 'helpful-1')?.earned);
  assert.equal((await request(app).get('/api/chat/messages').set(voterAuth)).body.messages.find((message) => message.id === messageId).hasVoted, true);
});

test('POST /api/chat/messages rejects abusive content', async () => {
  const response = await request(app).post('/api/chat/messages').send({ text: 'you are stupid' });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /study room rules/i);
});

test('chat messages cannot claim another user email and public chat hides emails', async () => {
  const email = `chat-owner-${Date.now()}@example.com`;
  const signup = await request(app).post('/api/auth/signup').send({ name: 'Chat Owner', email, password: 'secret123' });
  const mismatch = await request(app).post('/api/chat/messages').set('Authorization', `Bearer ${signup.body.token}`).send({ text: 'A study question', email: 'someone-else@example.com' });
  assert.equal(mismatch.status, 403);
  await request(app).post('/api/chat/messages').set('Authorization', `Bearer ${signup.body.token}`).send({ text: 'A private identity message' }).expect(201);
  const chat = await request(app).get('/api/chat/messages');
  assert.equal(JSON.stringify(chat.body).includes(email), false);
});

test('admin question sets endpoints allow no-code creation, modification, and grading of test sets', async () => {
  const previousAdminEmail = process.env.ADMIN_EMAIL;
  const adminEmail = `admin-studio-${Date.now()}@example.com`;
  process.env.ADMIN_EMAIL = adminEmail;
  try {
    const admin = await request(app).post('/api/auth/signup').send({ name: 'Admin Studio', email: adminEmail, password: 'secret123' });
    const regular = await request(app).post('/api/auth/signup').send({ name: 'Regular User', email: `user-${Date.now()}@example.com`, password: 'secret123' });
    const adminAuth = { Authorization: `Bearer ${admin.body.token}` };
    const regularAuth = { Authorization: `Bearer ${regular.body.token}` };

    // Unauthorized and non-admin checks
    assert.equal((await request(app).get('/api/admin/question-sets')).status, 401);
    assert.equal((await request(app).get('/api/admin/question-sets').set(regularAuth)).status, 403);
    assert.equal((await request(app).get('/api/admin/question-set').query({ classNumber: '10', subject: 'Science', set: 1 })).status, 401);
    assert.equal((await request(app).get('/api/admin/question-set').query({ classNumber: '10', subject: 'Science', set: 1 }).set(regularAuth)).status, 403);

    // Admin loads uncustomized set -> receives default generated questions with answer
    const defaultSetRes = await request(app).get('/api/admin/question-set').query({ classNumber: '10', subject: 'Science', set: 1 }).set(adminAuth);
    assert.equal(defaultSetRes.status, 200);
    assert.equal(defaultSetRes.body.isCustom, false);
    assert.equal(defaultSetRes.body.questions.length, 10);
    assert.ok(typeof defaultSetRes.body.questions[0].answer === 'number');

    // Admin saves custom questions for Class 10 Science Set 1
    const customQuestions = [
      { text: 'Custom Q1: What is the unit of electric current?', options: ['Volt', 'Ampere', 'Ohm', 'Watt'], answer: 1, topic: 'Electricity' },
      { text: 'Custom Q2: Which organelle produces ATP?', options: ['Nucleus', 'Mitochondria', 'Chloroplast', 'Ribosome'], answer: 1, topic: 'Cell Biology' }
    ];
    const saveRes = await request(app).post('/api/admin/question-set').set(adminAuth).send({
      classNumber: '10',
      subject: 'Science',
      setNumber: 1,
      title: 'Class 10 Science Custom Set 1',
      questions: customQuestions
    });
    assert.equal(saveRes.status, 200);
    assert.equal(saveRes.body.ok, true);

    // Verify student-facing endpoint now serves the custom questions (without leaking the answer field)
    const studentSet = await request(app).get('/api/classes/10/series/Science/1');
    assert.equal(studentSet.status, 200);
    assert.equal(studentSet.body.questions.length, 2);
    assert.equal(studentSet.body.questions[0].text, 'Custom Q1: What is the unit of electric current?');
    assert.equal('answer' in studentSet.body.questions[0], false);

    // Verify student test submission grades against the custom answers
    const gradingRes = await request(app).post('/api/classes/10/series/Science/1/results').send({
      answers: [1, 1], // Both correct
      durationSeconds: 30
    });
    assert.equal(gradingRes.status, 200);
    assert.equal(gradingRes.body.attempt.score, 2);
    assert.equal(gradingRes.body.attempt.total, 2);

    // Add a brand-new set: Set 11 (beyond the default 10 sets)
    const set11Questions = [
      { text: 'Set 11 Q1: Speed of light?', options: ['3x10^8 m/s', '100 m/s', '0 m/s', '300 m/s'], answer: 0, topic: 'Optics' }
    ];
    const saveSet11 = await request(app).post('/api/admin/question-set').set(adminAuth).send({
      classNumber: '10',
      subject: 'Science',
      setNumber: 11,
      questions: set11Questions
    });
    assert.equal(saveSet11.status, 200);

    // Verify totalSets dynamically increases to at least 11
    const seriesRes = await request(app).get('/api/classes/10/series');
    const scienceSubj = seriesRes.body.subjects.find((s) => s.subject === 'Science');
    assert.ok(scienceSubj.totalSets >= 11);

    // Clean up custom set 1 and 11
    await request(app).delete('/api/admin/question-set').query({ classNumber: '10', subject: 'Science', set: 1 }).set(adminAuth);
    await request(app).delete('/api/admin/question-set').query({ classNumber: '10', subject: 'Science', set: 11 }).set(adminAuth);

    // After deletion, Set 1 reverts to default
    const revertedRes = await request(app).get('/api/admin/question-set').query({ classNumber: '10', subject: 'Science', set: 1 }).set(adminAuth);
    assert.equal(revertedRes.body.isCustom, false);
    assert.equal(revertedRes.body.questions.length, 10);
  } finally {
    if (previousAdminEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previousAdminEmail;
  }
});

test('POST /api/auth/firebase-sync synchronizes Firebase users and securely resets passwords', async () => {
  const email = `firebase-user-${Date.now()}@example.com`;
  
  // 1. Validates bad email
  const badEmailRes = await request(app).post('/api/auth/firebase-sync').send({ email: 'not-an-email' });
  assert.equal(badEmailRes.status, 400);

  // 2. Sync new user
  const syncRes = await request(app).post('/api/auth/firebase-sync').send({
    email,
    newPassword: 'firebasePassword123',
    firebaseUid: 'fb-uid-12345',
    name: 'Firebase Learner'
  });
  assert.equal(syncRes.status, 200);
  assert.equal(syncRes.body.user.email, email);
  assert.ok(typeof syncRes.body.token === 'string');

  // 3. User can now log in with the new password
  const loginRes = await request(app).post('/api/auth/login').send({
    email,
    password: 'firebasePassword123'
  });
  assert.equal(loginRes.status, 200);
  assert.ok(typeof loginRes.body.token === 'string');

  // 4. Update password with validation
  const shortPassRes = await request(app).post('/api/auth/firebase-sync').send({
    email,
    newPassword: 'short'
  });
  assert.equal(shortPassRes.status, 400);

  const updatePassRes = await request(app).post('/api/auth/firebase-sync').send({
    email,
    newPassword: 'brandNewPassword999'
  });
  assert.equal(updatePassRes.status, 200);

  // 5. Old password is now rejected, new password works
  assert.equal((await request(app).post('/api/auth/login').send({ email, password: 'firebasePassword123' })).status, 401);
  assert.equal((await request(app).post('/api/auth/login').send({ email, password: 'brandNewPassword999' })).status, 200);
});

test('Admin notifications, blogs, study materials, and mentor chat reply APIs', async () => {
  const adminEmail = `admin-cms-${Date.now()}@example.com`;
  const previousAdminEmail = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = adminEmail;

  try {
    // 1. Sign up admin
    const signup = await request(app).post('/api/auth/signup').send({
      name: 'Warish Raj Admin',
      email: adminEmail,
      password: 'adminSecurePassword123'
    });
    assert.equal(signup.status, 201);
    const adminToken = signup.body.token;

    // 2. Notifications CRUD
    const createNotif = await request(app)
      .post('/api/admin/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'BPSC 71st Combined Competitive Exam',
        exam: 'BPSC CCE',
        category: 'State PSC',
        badge: 'BPSC',
        badgeColor: 'coral',
        examDate: '2026-12-10',
        daysText: 'in 70 days',
        vacancies: '1,200 Posts',
        eligibility: 'Graduate',
        applyDeadline: '2026-11-01',
        officialLink: 'https://bpsc.bih.nic.in',
        details: 'Prelims exam announced.'
      });
    assert.equal(createNotif.status, 201);
    const notifId = createNotif.body.notification.id;
    assert.ok(notifId);

    const publicNotifs = await request(app).get('/api/notifications');
    assert.equal(publicNotifs.status, 200);
    assert.ok(publicNotifs.body.notifications.some((n) => n.id === notifId));

    const updateNotif = await request(app)
      .put(`/api/admin/notifications/${notifId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ daysText: 'in 69 days' });
    assert.equal(updateNotif.status, 200);
    assert.equal(updateNotif.body.notification.daysText, 'in 69 days');

    // 3. Blogs CRUD
    const createBlog = await request(app)
      .post('/api/admin/blogs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Top 5 Revision Hacks for Speed and Accuracy',
        category: 'Preparation Strategy',
        author: 'Warish Raj · Mentor',
        readTime: '3 min read',
        tags: ['Hacks', 'Speed', 'Mocks'],
        summary: 'Smart tips to boost your mock score.',
        content: 'Practice mental arithmetic and skip lengthy questions.'
      });
    assert.equal(createBlog.status, 201);
    const blogId = createBlog.body.blog.id;

    const publicBlogs = await request(app).get('/api/blogs');
    assert.equal(publicBlogs.status, 200);
    assert.ok(publicBlogs.body.blogs.some((b) => b.id === blogId));

    const singleBlog = await request(app).get(`/api/blogs/${blogId}`);
    assert.equal(singleBlog.status, 200);
    assert.equal(singleBlog.body.blog.title, 'Top 5 Revision Hacks for Speed and Accuracy');

    // 4. Study Materials CRUD
    const createMat = await request(app)
      .post('/api/admin/study-materials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'General Science Physics Short Notes',
        exam: 'Railways / SSC',
        subject: 'Science',
        fileType: 'PDF',
        fileSize: '1.5 MB',
        downloadUrl: 'https://example.com/physics-notes.pdf',
        description: 'Complete optics and mechanics summary.'
      });
    assert.equal(createMat.status, 201);
    const matId = createMat.body.material.id;

    const publicMats = await request(app).get('/api/study-materials?subject=science');
    assert.equal(publicMats.status, 200);
    assert.ok(publicMats.body.materials.some((m) => m.id === matId));

    // 5. Mentor / Topper Reply Console
    const threads = await request(app)
      .get('/api/admin/mentor-chat/threads')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(threads.status, 200);
    assert.ok(Array.isArray(threads.body.messages));

    const mentorReply = await request(app)
      .post('/api/admin/mentor-chat/reply')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        text: 'Keep practicing 20 minutes daily and your speed will improve!',
        authorType: 'topper',
        name: 'Warish Raj · Official Mentor'
      });
    assert.equal(mentorReply.status, 201);
    assert.equal(mentorReply.body.message.topperName, 'Warish Raj · Official Mentor');

    // Cleanup created test records
    await request(app).delete(`/api/admin/notifications/${notifId}`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).delete(`/api/admin/blogs/${blogId}`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).delete(`/api/admin/study-materials/${matId}`).set('Authorization', `Bearer ${adminToken}`);
  } finally {
    if (typeof previousAdminEmail === 'undefined') delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previousAdminEmail;
  }
});

test('Result Darpan AI Study Mentor generates study guides, routines, tasks, and exam updates', async () => {
  // 1. Study Guide
  const guideRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'Please plan a 60-day study guide and roadmap for SSC CGL', exam: 'SSC CGL' });
  assert.equal(guideRes.status, 200);
  assert.equal(guideRes.body.intent, 'study-guide');
  assert.equal(guideRes.body.sender, 'Result Darpan AI Mentor ✦');
  assert.ok(guideRes.body.reply.includes('Phase 1'));
  assert.ok(guideRes.body.reply.includes('Phase 2'));
  assert.ok(guideRes.body.reply.includes('Phase 3'));

  // 2. Daily Routine & Timetable
  const routineRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'Help me fix my daily routine and timetable for exam prep', exam: 'SSC CGL' });
  assert.equal(routineRes.status, 200);
  assert.equal(routineRes.body.intent, 'daily-routine');
  assert.ok(routineRes.body.reply.includes('Slot 1'));
  assert.ok(routineRes.body.reply.includes('Slot 2'));
  assert.ok(routineRes.body.reply.includes('Slot 3'));

  // 3. Study Tasks & Checklist
  const tasksRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'Give me today study tasks and checklist', exam: 'SSC CGL' });
  assert.equal(tasksRes.status, 200);
  assert.equal(tasksRes.body.intent, 'study-tasks');
  assert.ok(tasksRes.body.reply.includes('Task 1'));
  assert.ok(tasksRes.body.reply.includes('Task 2'));

  // 4. Live Exam Updates & Deadlines from notifications
  const notifsRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'What are the upcoming exam updates and deadlines?' });
  assert.equal(notifsRes.status, 200);
  assert.equal(notifsRes.body.intent, 'exam-updates');
  assert.ok(notifsRes.body.reply.includes('Result Darpan Live Exam Radar'));

  // 5. Specific exam notification lookup (CTET)
  const ctetRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'When is CTET exam date?' });
  assert.equal(ctetRes.status, 200);
  assert.equal(ctetRes.body.intent, 'exam-updates');
  assert.ok(ctetRes.body.reply.includes('CTET'));
  assert.ok(ctetRes.body.reply.includes('ctet.nic.in'));

  // 6. Chat message triggers AI Mentor response
  const chatMsg = await request(app)
    .post('/api/chat/messages')
    .send({ text: 'How do I solve percentage shortcuts?' });
  assert.equal(chatMsg.status, 201);
  assert.ok(chatMsg.body.message);
  assert.ok(chatMsg.body.aiReply);
  assert.equal(chatMsg.body.aiReply.topperName, 'Result Darpan AI Mentor ✦');
  assert.ok(chatMsg.body.aiReply.text.includes('Percentage Multipliers'));

  // 7. Shortcut Chip / General Shortcuts Query
  const shortcutRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'Give me topper calculation shortcuts, speed math tricks, and reasoning formulas' });
  assert.equal(shortcutRes.status, 200);
  assert.equal(shortcutRes.body.intent, 'shortcuts');
  assert.ok(shortcutRes.body.reply.includes('Topper Speed Math & Calculation Shortcuts'));
  assert.ok(shortcutRes.body.reply.includes('Squaring Numbers Ending in 5'));
  assert.ok(shortcutRes.body.reply.includes('Digital Root'));
  assert.ok(shortcutRes.body.reply.includes('EJOTY'));

  // 8. Single word 'shortcuts' query
  const singleWordRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'shortcuts' });
  assert.equal(singleWordRes.status, 200);
  assert.equal(singleWordRes.body.intent, 'shortcuts');

  // 9. Reasoning shortcuts query
  const reasoningRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'Give me reasoning shortcuts and syllogism tricks' });
  assert.equal(reasoningRes.status, 200);
  assert.equal(reasoningRes.body.intent, 'shortcuts');
  assert.ok(reasoningRes.body.reply.includes('EJOTY Alphabet Positions'));

  // 10. Time & Work LCM method query
  const workRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'Time and work shortcut method' });
  assert.equal(workRes.status, 200);
  assert.equal(workRes.body.intent, 'shortcuts');
  assert.ok(workRes.body.reply.includes('LCM Unit Method'));

  // 11. Unimplemented Features Query ("We are working on that")
  const featureRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'Do you have an Android app on Google Play Store?' });
  assert.equal(featureRes.status, 200);
  assert.equal(featureRes.body.intent, 'feature-request');
  assert.ok(featureRes.body.reply.includes('We are working on that!'));
  assert.ok(featureRes.body.reply.includes('Thank you for your feedback'));

  // 12. User Bug / Issue Reporting
  const bugRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'I found a bug, the test timer is not working properly' });
  assert.equal(bugRes.status, 200);
  assert.equal(bugRes.body.intent, 'user-report');
  assert.ok(bugRes.body.reply.includes('Result Darpan Support Desk'));
  assert.ok(bugRes.body.reply.includes('Rajwarish38@gmail.com'));

  // 13. Platform Introduction & Website Ownership
  const introRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'What is Result Darpan and who owns this website?' });
  assert.equal(introRes.status, 200);
  assert.equal(introRes.body.intent, 'platform-intro');
  assert.ok(introRes.body.reply.includes('Warish Raj'));
  assert.ok(introRes.body.reply.includes('Resultdarpan.com'));
  assert.ok(introRes.body.reply.includes('100% free'));

  // 14. Academic Question (Physics: Newton's Laws)
  const physicsRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'Explain Newton laws of motion' });
  assert.equal(physicsRes.status, 200);
  assert.equal(physicsRes.body.intent, 'academic-science');
  assert.ok(physicsRes.body.reply.includes('Newton\'s 1st Law'));
  assert.ok(physicsRes.body.reply.includes('Newton\'s 3rd Law'));

  // 15. Academic Question (Biology: Photosynthesis)
  const bioRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'What is photosynthesis equation?' });
  assert.equal(bioRes.status, 200);
  assert.equal(bioRes.body.intent, 'academic-science');
  assert.ok(bioRes.body.reply.includes('6CO₂ + 6H₂O'));

  // 16. Academic Question (Math: Compound Interest)
  const mathRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'Difference between compound interest and simple interest formulas' });
  assert.equal(mathRes.status, 200);
  assert.equal(mathRes.body.intent, 'academic-math');
  assert.ok(mathRes.body.reply.includes('Difference (CI - SI) = P × (R / 100)²'));

  // 17. Academic Question (Polity: Fundamental Rights)
  const polityRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'What are fundamental rights in Indian Constitution?' });
  assert.equal(polityRes.status, 200);
  assert.equal(polityRes.body.intent, 'academic-polity');
  assert.ok(polityRes.body.reply.includes('Part III, Articles 12–35'));
  assert.ok(polityRes.body.reply.includes('Article 32'));

  // 18. Smart Universal Fallback for any other custom question
  const fallbackRes = await request(app)
    .post('/api/ai/chat')
    .send({ prompt: 'Can you explain quantum physics and wave optics?' });
  assert.equal(fallbackRes.status, 200);
  assert.equal(fallbackRes.body.intent, 'general-study');
  assert.ok(fallbackRes.body.reply.includes('Result Darpan AI Study Assistant'));
  assert.ok(fallbackRes.body.reply.includes('Core Concept Breakdown'));
});

test('Admin Previous Year Questions (PYQ) endpoints allow retrieval, creation, update, and deletion', async () => {
  const adminEmail = `pyqadmin-${Date.now()}@resultdarpan.test`;
  const previousAdminEmail = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = adminEmail;

  try {
    // 1. Sign up admin
    const signup = await request(app).post('/api/auth/signup').send({
      name: 'PYQ Moderator',
      email: adminEmail,
      password: 'adminSecurePassword123'
    });
    assert.equal(signup.status, 201);
    const adminToken = signup.body.token;

    // 2. Public retrieval
    const publicList = await request(app).get('/api/previous-year-questions');
    assert.equal(publicList.status, 200);
    assert.ok(Array.isArray(publicList.body.questions));
    assert.ok(publicList.body.questions.length >= 18);
    // By default without includeAnswers, answers are hidden
    assert.equal('answer' in publicList.body.questions[0], false);

    // With includeAnswers=true
    const publicWithAnswers = await request(app).get('/api/previous-year-questions?includeAnswers=true');
    assert.equal(publicWithAnswers.status, 200);
    assert.equal('answer' in publicWithAnswers.body.questions[0], true);

    // Filter by exam
    const sscList = await request(app).get('/api/previous-year-questions?exam=SSC+CGL');
    assert.equal(sscList.status, 200);
    assert.ok(sscList.body.questions.every((q) => q.exam === 'SSC CGL'));

    // 3. Admin creation
    const createRes = await request(app)
      .post('/api/admin/previous-year-questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        exam: 'SSC CGL',
        year: '2024 Tier-I Practice',
        topic: 'General Awareness',
        text: 'Who was the first woman President of India?',
        options: ['Sarojini Naidu', 'Pratibha Patil', 'Indira Gandhi', 'Droupadi Murmu'],
        answer: 1,
        sourceUrl: 'https://ssc.gov.in'
      });
    assert.equal(createRes.status, 201);
    const createdId = createRes.body.question.id;
    assert.ok(createdId);
    assert.equal(createRes.body.question.text, 'Who was the first woman President of India?');
    assert.equal(createRes.body.question.answer, 1);

    // 4. Admin update
    const updateRes = await request(app)
      .put(`/api/admin/previous-year-questions/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        topic: 'Indian Polity & History',
        year: '2024 Shift-1'
      });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.question.topic, 'Indian Polity & History');
    assert.equal(updateRes.body.question.year, '2024 Shift-1');

    // 5. Admin deletion (cleanup)
    const deleteRes = await request(app)
      .delete(`/api/admin/previous-year-questions/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.ok, true);

    // Verify deletion
    const verifyRes = await request(app)
      .get('/api/admin/previous-year-questions')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(verifyRes.status, 200);
    assert.ok(!verifyRes.body.questions.some((q) => q.id === createdId));
  } finally {
    process.env.ADMIN_EMAIL = previousAdminEmail;
  }
});

test('Google AdSense monetization & ads.txt endpoints work properly', async () => {
  // 1. GET /ads.txt returns 200 with standard IAB direct seller format
  const adsTxtRes = await request(app).get('/ads.txt');
  assert.equal(adsTxtRes.status, 200);
  assert.ok(adsTxtRes.text.includes('google.com'));
  assert.ok(adsTxtRes.text.includes('DIRECT'));
  assert.ok(adsTxtRes.text.includes('f08c47fec0942fa0'));

  // 2. Public GET /api/ad-settings returns current settings
  const getSettingsRes = await request(app).get('/api/ad-settings');
  assert.equal(getSettingsRes.status, 200);
  assert.ok(getSettingsRes.body.adSettings);
  assert.equal(typeof getSettingsRes.body.adSettings.enabled, 'boolean');

  // 3. Unauthorized PUT /api/admin/ad-settings returns 401
  const unauthRes = await request(app).put('/api/admin/ad-settings').send({ enabled: true });
  assert.equal(unauthRes.status, 401);

  // 4. Authorized admin can update settings and sync ads.txt
  const adminEmail = `adstest_${Date.now()}@resultdarpan.com`;
  const previousAdminEmail = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = adminEmail;

  try {
    const signup = await request(app).post('/api/auth/signup').send({
      name: 'AdSense Manager',
      email: adminEmail,
      password: 'adminSecurePassword123'
    });
    assert.equal(signup.status, 201);
    const adminToken = signup.body.token;

    // Update settings with a test publisher ID
    const updateRes = await request(app)
      .put('/api/admin/ad-settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        enabled: true,
        adClient: 'ca-pub-9876543210123456',
        testMode: true,
        autoAds: false,
        showTopBanner: true,
        showInFeed: true,
        showArticleBanner: false
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.success, true);
    assert.equal(updateRes.body.adSettings.enabled, true);
    assert.equal(updateRes.body.adSettings.adClient, 'ca-pub-9876543210123456');
    assert.equal(updateRes.body.adSettings.showArticleBanner, false);

    // Verify /ads.txt was automatically synced with the new pub-ID
    const updatedAdsTxt = await request(app).get('/ads.txt');
    assert.equal(updatedAdsTxt.status, 200);
    assert.ok(updatedAdsTxt.text.includes('pub-9876543210123456'));

    // Reset settings to default disabled state for clean test environment
    await request(app)
      .put('/api/admin/ad-settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        enabled: false,
        adClient: '',
        testMode: false,
        autoAds: false,
        showTopBanner: true,
        showInFeed: true,
        showArticleBanner: true
      });
  } finally {
    if (typeof previousAdminEmail === 'undefined') delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previousAdminEmail;
  }
});

test('GET /api/translate and POST /api/translate/batch return translated text for students', async () => {
  const single = await request(app).get('/api/translate?text=What%20is%20gravity&target=hi');
  assert.equal(single.status, 200);
  assert.ok(single.body.translatedText);
  assert.equal(single.body.target, 'hi');

  const batch = await request(app).post('/api/translate/batch').send({
    texts: ['Physics', 'Chemistry', 'Mathematics'],
    target: 'hi'
  });
  assert.equal(batch.status, 200);
  assert.equal(batch.body.translatedTexts.length, 3);
});

test('GET /api/admin/export-all-data and POST /api/admin/import-all-data work for live sync and backups', async () => {
  const adminEmail = `syncadmin_${Date.now()}@resultdarpan.com`;
  const previousAdminEmail = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = adminEmail;
  try {
    const adminSignup = await request(app).post('/api/auth/signup').send({
      name: 'Sync Admin',
      email: adminEmail,
      password: 'adminSecurePassword123'
    });
    assert.equal(adminSignup.status, 201);
    const adminToken = adminSignup.body.token;

    // Export all data
    const exportRes = await request(app)
      .get('/api/admin/export-all-data')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(exportRes.status, 200);
    assert.ok(Array.isArray(exportRes.body.blogs));
    assert.ok(Array.isArray(exportRes.body.notifications));
    assert.ok(Array.isArray(exportRes.body.studyMaterials));
    assert.ok(Array.isArray(exportRes.body.questionSets));
    assert.ok(Array.isArray(exportRes.body.previousYearQuestions));
    assert.ok(exportRes.body.adSettings);

    // Import all data
    const importRes = await request(app)
      .post('/api/admin/import-all-data')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        blogs: exportRes.body.blogs,
        notifications: exportRes.body.notifications,
        studyMaterials: exportRes.body.studyMaterials,
        questionSets: exportRes.body.questionSets,
        previousYearQuestions: exportRes.body.previousYearQuestions,
        adSettings: exportRes.body.adSettings
      });
    assert.equal(importRes.status, 200);
    assert.equal(importRes.body.success, true);
  } finally {
    if (typeof previousAdminEmail === 'undefined') delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previousAdminEmail;
  }
});
