const { connectDB, Seller, Product, ok, err, CORS } = require('./_db');

async function uploadToCloudinary(base64Data, mimeType) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const preset    = process.env.CLOUDINARY_UPLOAD_PRESET;
  const dataURI   = `data:${mimeType};base64,${base64Data}`;
  const body = new URLSearchParams({ file: dataURI, upload_preset: preset });
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  return (await res.json()).secure_url;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  await connectDB();

  const parts = event.path.replace(/^\/api\/sellers\/?/, '').split('/').filter(Boolean);
  const action = parts[0];

  // POST /api/sellers/signup
  if (event.httpMethod === 'POST' && action === 'signup') {
    let body;
    try { body = JSON.parse(event.body); } catch { return err('Invalid JSON'); }
    const { username, email, password, shopName, shopDesc, avatarEmoji } = body;
    if (!username || !email || !password || !shopName) return err('username, email, password and shopName are required');
    const exists = await Seller.findOne({ $or: [{ username }, { email }] });
    if (exists) return err('Username or email already taken');
    const seller = await Seller.create({ username, email, password, shopName, shopDesc, avatarEmoji: avatarEmoji || '🏪' });
    return ok({ 
      _id: seller._id, 
      username: seller.username, 
      shopName: seller.shopName,
      avatarEmoji: seller.avatarEmoji,
      token: process.env.SELLER_SECRET
    }, 201);
  }

  // POST /api/sellers/login
  if (event.httpMethod === 'POST' && action === 'login') {
    let body;
    try { body = JSON.parse(event.body); } catch { return err('Invalid JSON'); }
    const { email, password } = body;
    const seller = await Seller.findOne({ email, password });
    if (!seller) return err('Invalid email or password', 401);
    return ok({ 
      _id: seller._id, 
      username: seller.username, 
      shopName: seller.shopName,
      shopDesc: seller.shopDesc,
      avatarEmoji: seller.avatarEmoji,
      token: process.env.SELLER_SECRET
    });
  }

  // GET /api/sellers — list all shops
  if (event.httpMethod === 'GET' && !action) {
    const sellers = await Seller.find({}, '-password').sort({ createdAt: -1 });
    return ok(sellers);
  }

  // GET /api/sellers/:id — single shop + their products
  if (event.httpMethod === 'GET' && action) {
    const seller = await Seller.findById(action, '-password').catch(() => null);
    if (!seller) return err('Shop not found', 404);
    const products = await Product.find({ sellerId: action }).sort({ createdAt: -1 });
    return ok({ seller, products });
  }

  return err('Method not allowed', 405);
};
