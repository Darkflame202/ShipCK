exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,username,password'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: '{}' };

  let body;
  try { body = JSON.parse(event.body); } catch { body = {}; }

  const { username, password } = body;

  console.log('Login attempt:', username);
  console.log('Expected user:', process.env.ADMIN_USER);
  console.log('Match:', username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS);

  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  }
  return {
    statusCode: 401,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      error: 'Invalid credentials',
      debug_user_match: username === process.env.ADMIN_USER,
      debug_pass_match: password === process.env.ADMIN_PASS
    })
  };
};
