const { connectDB, Product, isAdmin, ok, err, CORS } = require('./_db');

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

  const parts = event.path.replace(/^\/api\/products\/?/, '').split('/').filter(Boolean);
  const id = parts[0] && parts[0].match(/^[a-f0-9]{24}$/) ? parts[0] : null;

  // GET /api/products or /api/products/:id
  if (event.httpMethod === 'GET') {
    if (id) {
      const p = await Product.findById(id).catch(() => null);
      return p ? ok(p) : err('Not found', 404);
    }
    const { cat, sellerId } = event.queryStringParameters || {};
    const filter = {};
    if (cat && cat !== 'All') filter.cat = cat;
    if (sellerId) filter.sellerId = sellerId;
    const products = await Product.find(filter).sort({ createdAt: -1 });
    return ok(products);
  }

  // POST /api/products — admin or seller
  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body); } catch { return err('Invalid JSON'); }

    const { name, desc, price, compare, cat, emoji, stock,
            photoBase64, photoMime, sellerId, sellerName } = body;

    if (!name || !price) return err('name and price are required');

    // must be admin OR a logged-in seller posting their own product
    const adminOk = isAdmin(event.headers);
    const sellerOk = sellerId && event.headers['seller-id'] === sellerId &&
                     event.headers['seller-token'] === process.env.SELLER_SECRET;

    if (!adminOk && !sellerOk) return err('Unauthorized', 401);

    let photoUrl = null;
    if (photoBase64 && photoMime) {
      try { photoUrl = await uploadToCloudinary(photoBase64, photoMime); }
      catch (e) { return err('Photo upload failed: ' + e.message, 500); }
    }

    const product = await Product.create({
      name, desc,
      price:    parseFloat(price),
      compare:  compare ? parseFloat(compare) : null,
      cat:      cat || 'General',
      emoji:    emoji || '🛍️',
      stock:    parseInt(stock) || 100,
      photoUrl,
      sellerId: sellerId || null
    });
    return ok(product, 201);
  }

  // DELETE /api/products/:id — admin only
  if (event.httpMethod === 'DELETE') {
    if (!isAdmin(event.headers)) return err('Unauthorized', 401);
    if (!id) return err('Missing product id');
    const product = await Product.findByIdAndDelete(id);
    return product ? ok({ deleted: true }) : err('Not found', 404);
  }

  return err('Method not allowed', 405);
};
