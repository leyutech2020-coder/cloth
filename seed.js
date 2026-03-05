const db = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

const SALT_ROUNDS = 10;

function seed() {
  console.log('Seeding database...');

  // Demo merchant
  const merchantId = uuid();
  const merchantHash = bcrypt.hashSync('demo1234', SALT_ROUNDS);
  db.prepare(`
    INSERT OR IGNORE INTO merchants (id, name, email, password_hash, store_name, phone, address, city, lat, lng, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    merchantId, 'Demo Store Owner', 'merchant@demo.com', merchantHash,
    'StyleHub Demo Store', '06-1234567',
    'No. 1, Zhonghua Rd, West Central Dist', 'Tainan',
    22.9908, 120.2133,
    'A curated fashion boutique in the heart of Tainan.'
  );

  // Products (matching existing image assets)
  const products = [
    { name: '白色 T-shirt', category: 'tops', price: 890, img: 'images/tops/white_tee.jpg', sizes: 'S,M,L,XL', colors: 'White', stock: 50 },
    { name: '條紋襯衫', category: 'tops', price: 1290, img: 'images/tops/striped_shirt.jpg', sizes: 'S,M,L', colors: 'Blue/White', stock: 30 },
    { name: '黑色帽T', category: 'tops', price: 1490, img: 'images/tops/black_hoodie.jpg', sizes: 'M,L,XL', colors: 'Black', stock: 25 },
    { name: '紅色法蘭絨', category: 'tops', price: 1690, img: 'images/tops/red_flannel.jpg', sizes: 'S,M,L', colors: 'Red', stock: 20 },
    { name: '海軍藍西裝外套', category: 'tops', price: 3290, img: 'images/tops/navy_blazer.jpg', sizes: 'M,L,XL', colors: 'Navy', stock: 15 },
    { name: '丹寧夾克', category: 'tops', price: 2490, img: 'images/tops/denim_jacket.jpg', sizes: 'S,M,L,XL', colors: 'Blue', stock: 20 },
    { name: '深藍牛仔褲', category: 'bottoms', price: 1690, img: 'images/bottoms/blue_jeans.jpg', sizes: '28,30,32,34', colors: 'Blue', stock: 40 },
    { name: '卡其休閒褲', category: 'bottoms', price: 1290, img: 'images/bottoms/khaki_pants.jpg', sizes: '28,30,32,34', colors: 'Khaki', stock: 35 },
    { name: '黑色短裙', category: 'bottoms', price: 1890, img: 'images/bottoms/black_skirt.jpg', sizes: 'S,M,L', colors: 'Black', stock: 20 },
    { name: '慢跑褲', category: 'bottoms', price: 990, img: 'images/bottoms/joggers.jpg', sizes: 'S,M,L,XL', colors: 'Gray', stock: 45 },
    { name: '白色運動鞋', category: 'shoes', price: 3290, img: 'images/shoes/white_sneakers.jpg', sizes: '38,39,40,41,42,43', colors: 'White', stock: 30 },
    { name: '黑色靴子', category: 'shoes', price: 4290, img: 'images/shoes/black_boots.jpg', sizes: '38,39,40,41,42', colors: 'Black', stock: 15 },
    { name: '棕色牛津鞋', category: 'shoes', price: 3890, img: 'images/shoes/brown_oxford.jpg', sizes: '39,40,41,42,43', colors: 'Brown', stock: 20 },
  ];

  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (id, merchant_id, name, category, price, image_url, sizes, colors, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of products) {
    insertProduct.run(uuid(), merchantId, p.name, p.category, p.price, p.img, p.sizes, p.colors, p.stock);
  }

  // Demo user
  const userId = uuid();
  const userHash = bcrypt.hashSync('user1234', SALT_ROUNDS);
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, display_name)
    VALUES (?, ?, ?, ?)
  `).run(userId, 'user@demo.com', userHash, 'Demo User');

  const counts = {
    merchants: db.prepare('SELECT COUNT(*) as c FROM merchants').get().c,
    products: db.prepare('SELECT COUNT(*) as c FROM products').get().c,
    users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
  };
  console.log('Seed complete:', counts);
}

seed();
