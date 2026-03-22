const { connectDB, Product, Order, isAdmin, ok, err, CORS } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  await connectDB();

  // GET /api/orders (admin only)
  if (event.httpMethod === 'GET') {
    if (!isAdmin(event.headers)) return err('Unauthorized', 401);
    const orders = await Order.find().sort({ createdAt: -1 });
    return ok(orders);
  }

  // POST /api/orders (public)
  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body); } catch { return err('Invalid JSON'); }

    const { name, email, phone, address, items } = body;
    if (!name || !email || !address || !items?.length) return err('Missing required fields');

    const ids = items.map(i => i.productId);
    const products = await Product.find({ _id: { $in: ids } });
    const map = Object.fromEntries(products.map(p => [p._id.toString(), p]));

    let total = 0;
    const validated = [];
    for (const item of items) {
      const p = map[item.productId];
      if (!p) return err(`Product ${item.productId} not found`, 404);
      if (p.stock < item.qty) return err(`Not enough stock for "${p.name}"`);
      total += p.price * item.qty;
      validated.push({ productId: item.productId, name: p.name, price: p.price, qty: item.qty });
    }

    const orderId = 'SCK-' + Date.now().toString().slice(-6);
    const order = await Order.create({ orderId, name, email, phone, address, items: validated, total });

    for (const item of validated) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty } });
    }

    return ok({ orderId: order.orderId, total: order.total }, 201);
  }

  return err('Method not allowed', 405);
};
