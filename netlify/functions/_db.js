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
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', default: null },
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

const sellerSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true },
  email:       { type: String, required: true, unique: true },
  password:    { type: String, required: true },
  shopName:    { type: String, required: true },
  shopDesc:    String,
  avatarEmoji: { type: String, default: '🏪' },
  createdAt:   { type: Date, default: Date.now }
});

const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  buyerName: { type: String, required: true },
  rating:    { type: Number, required: true, min: 1, max: 5 },
  comment:   String,
  createdAt: { type: Date, default: Date.now }
});

const pokemonCardSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  set:         String,
  condition:   { type: String, default: 'Near Mint' },
  price:       { type: Number, required: true },
  desc:        String,
  photoUrl:    String,
  sellerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
  sellerName:  String,
  sold:        { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now }
});

const Product     = mongoose.models.Product     || mongoose.model('Product',     productSchema);
const Order       = mongoose.models.Order       || mongoose.model('Order',       orderSchema);
const Seller      = mongoose.models.Seller      || mongoose.model('Seller',      sellerSchema);
const Review      = mongoose.models.Review      || mongoose.model('Review',      reviewSchema);
const PokemonCard = mongoose.models.PokemonCard || mongoose.model('PokemonCard', pokemonCardSchema);

function isAdmin(headers) {
  return (
    headers['username'] === process.env.ADMIN_USER &&
    headers['password'] === process.env.ADMIN_PASS
  );
}

function isSeller(headers, sellerId) {
  return (
    headers['seller-id'] === sellerId.toString() &&
    headers['seller-token'] === process.env.SELLER_SECRET
  );
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,username,password,seller-id,seller-token'
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

module.exports = { connectDB, Product, Order, Seller, Review, PokemonCard, isAdmin, isSeller, ok, err, CORS };
