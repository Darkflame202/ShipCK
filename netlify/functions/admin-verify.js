const { CORS } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: '{}' };

  let body;
  try { body = JSON.parse(event.body); } catch { body = {}; }

  const { username, password } = body;
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
    body: JSON.stringify({ error: 'Invalid credentials' })
  };
};
```

Commit it — that's all 4 files done! Now you need to:

1. Go to **[netlify.com](https://netlify.com)** → your site
2. **Site configuration → Environment variables** → add these 5:
```
MONGO_URI                  mongodb+srv://cadenandkaisonsell:ck12@shipck.ywyhymx.mongodb.net/shipck?appName=ShipCK
ADMIN_USER                 blank_dev
ADMIN_PASS                 ck12
CLOUDINARY_CLOUD_NAME      your_cloud_name
CLOUDINARY_UPLOAD_PRESET   your_preset
