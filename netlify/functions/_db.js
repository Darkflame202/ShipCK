const mongoose = require('mongoose');

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGO_URI);
}

const productSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  desc:     String,
  price:    { type: Number, required: true },
  compare:  Number,
  cat:      { type: String, default: 'General' },
  emoji:    { type: String, default: '🛍️' },
  stock:    { type: Number, default: 100 },
  photoUrl: String,
  createdAt:{ type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  orderId:  { type: String, unique: true },
  name:     String,
  email:    String,
  phone:    String,
  address:  String,
  items: [{
    productId: String,
    name:      String,
    price:     Number,
    qty:       Number
  }],
  total:    Number,
  status:   { type: String, default: 'pending' },
  createdAt:{ type: Date, default: Date.now }
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const Order   = mongoose.models.Order   || mongoose.model('Order', orderSchema);

function isAdmin(headers) {
  return (
    headers['username'] === process.env.ADMIN_USER &&
    headers['password'] === process.env.ADMIN_PASS
  );
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,username,password'
};

function ok(body, status = 200) {
  return {
    statusCode: status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function err(msg, status = 400) {
  return {
    statusCode: status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: msg })
  };
}

module.exports = { connectDB, Product, Order, isAdmin, ok, err, CORS };
