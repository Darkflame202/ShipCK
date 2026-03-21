const { connectDB, Product, isAdmin, ok, err, CORS } = require('./_db');

async function uploadToCloudinary(base64Data, mimeType) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const preset    = process.env.CLOUDINARY_UPLOAD_PRESET;
  const dataURI   = `data:${mimeType};base64,${base64Data}`;
  const body = new URLSearchParams({ file: dataURI, upload_preset: preset });
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST', body
  });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const json = await res.json();
  return json.secure_url;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  await connectDB();

  const id = event.path.split('/').filter(Boolean).pop();
  const isId = id && id.match(/^[a-f0-9]{24}$/);

  if (event.httpMethod === 'GET') {
    if (isId) {
      const p = await Product.findById(id).catch(() => null);
      return p ? ok(p) : err('Not found', 404);
    }
    const { cat } = event.queryStringParameters || {};
    const filter = cat && cat !== 'All' ? { cat } : {};
    const products = await Product.find(filter).sort({ createdAt: -1 });
    return ok(products);
  }

  if (event.httpMethod === 'POST') {
    if (!isAdmin(event.headers)) return err('Unauthorized', 401);
    let body;
    try { body = JSON.parse(event.body); } catch { return err('Invalid JSON'); }
    const { name, desc, price, compare, cat, emoji, stock, photoBase64, photoMime } = body;
    if (!name || !price) return err('name and price are required');
    let photoUrl = null;
    if (photoBase64 && photoMime) {
      try {
        photoUrl = await uploadToCloudinary(photoBase64, photoMime);
      } catch (e) {
        return err('Photo upload failed: ' + e.message, 500);
      }
    }
    const product = await Product.create({
      name, desc,
      price:   parseFloat(price),
      compare: compare ? parseFloat(compare) : null,
      cat:     cat || 'General',
      emoji:   emoji || '🛍️',
      stock:   parseInt(stock) || 100,
      photoUrl
    });
    return ok(product, 201);
  }

  if (event.httpMethod === 'DELETE') {
    if (!isAdmin(event.headers)) return err('Unauthorized', 401);
    if (!isId) return err('Missing or invalid product id');
    const product = await Product.findByIdAndDelete(id);
    return product ? ok({ deleted: true }) : err('Not found', 404);
  }

  return err('Method not allowed', 405);
};
