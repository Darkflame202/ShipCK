const { connectDB, Review, ok, err, CORS } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  await connectDB();

  const parts = event.path.replace(/^\/api\/reviews\/?/, '').split('/').filter(Boolean);
  const productId = parts[0];

  // GET /api/reviews/:productId — get reviews for a product
  if (event.httpMethod === 'GET') {
    if (!productId) return err('Product ID required');
    const reviews = await Review.find({ productId }).sort({ createdAt: -1 });
    const avg = reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;
    return ok({ reviews, avg, count: reviews.length });
  }

  // POST /api/reviews/:productId — leave a review
  if (event.httpMethod === 'POST') {
    if (!productId) return err('Product ID required');
    let body;
    try { body = JSON.parse(event.body); } catch { return err('Invalid JSON'); }
    const { buyerName, rating, comment } = body;
    if (!buyerName || !rating) return err('buyerName and rating are required');
    if (rating < 1 || rating > 5) return err('Rating must be 1-5');
    const review = await Review.create({ productId, buyerName, rating: parseInt(rating), comment });
    return ok(review, 201);
  }

  return err('Method not allowed', 405);
};
