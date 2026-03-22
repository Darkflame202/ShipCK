const { connectDB, PokemonCard, ok, err, CORS } = require('./_db');

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

  const parts = event.path.replace(/^\/api\/pokemon\/?/, '').split('/').filter(Boolean);
  const id = parts[0] && parts[0].match(/^[a-f0-9]{24}$/) ? parts[0] : null;

  // GET /api/pokemon — list all cards
  if (event.httpMethod === 'GET' && !id) {
    const { condition, minPrice, maxPrice, search } = event.queryStringParameters || {};
    const filter = { sold: false };
    if (condition) filter.condition = condition;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (search) filter.name = { $regex: search, $options: 'i' };
    const cards = await PokemonCard.find(filter).sort({ createdAt: -1 });
    return ok(cards);
  }

  // GET /api/pokemon/:id — single card
  if (event.httpMethod === 'GET' && id) {
    const card = await PokemonCard.findById(id).catch(() => null);
    return card ? ok(card) : err('Not found', 404);
  }

  // POST /api/pokemon — list a card for sale (seller only)
  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body); } catch { return err('Invalid JSON'); }
    const { name, set, condition, price, desc, photoBase64, photoMime, sellerId, sellerName } = body;
    if (!name || !price || !sellerId) return err('name, price and sellerId are required');

    let photoUrl = null;
    if (photoBase64 && photoMime) {
      try { photoUrl = await uploadToCloudinary(photoBase64, photoMime); }
      catch (e) { return err('Photo upload failed: ' + e.message, 500); }
    }

    const card = await PokemonCard.create({
      name, set,
      condition: condition || 'Near Mint',
      price: parseFloat(price),
      desc, photoUrl, sellerId, sellerName
    });
    return ok(card, 201);
  }

  // PATCH /api/pokemon/:id/sold — mark card as sold
  if (event.httpMethod === 'PATCH' && id) {
    const card = await PokemonCard.findByIdAndUpdate(id, { sold: true }, { new: true });
    return card ? ok(card) : err('Not found', 404);
  }

  // DELETE /api/pokemon/:id — remove listing
  if (event.httpMethod === 'DELETE' && id) {
    const card = await PokemonCard.findByIdAndDelete(id);
    return card ? ok({ deleted: true }) : err('Not found', 404);
  }

  return err('Method not allowed', 405);
};
