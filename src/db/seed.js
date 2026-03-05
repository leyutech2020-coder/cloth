/**
 * Seed script — populates the database with demo data
 * Run: node src/db/seed.js
 */

const store = require('./store');
const {
  createMerchant, createProduct, createCategory, createAIAgent,
} = require('../models/schema');

console.log('Seeding database...');

// ---- Merchant ----
const merchant = createMerchant({
  name: 'ClosetSwipe Demo Store',
  slug: 'closetswipe-demo',
  description: 'AI-powered virtual try-on fashion store',
  contactEmail: 'demo@closetswipe.com',
  status: 'active',
  plan: 'pro',
  aiAgentEnabled: true,
  settings: {
    brandColor: '#6C5CE7',
    welcomeMessage: 'Welcome! Try on any outfit with AI.',
    autoTryOnEnabled: true,
    maxProductsPerCategory: 50,
  },
});
store.insert('merchants', merchant);
console.log(`  Merchant: ${merchant.id} (${merchant.name})`);

// ---- Categories ----
const catTops = createCategory({ merchantId: merchant.id, name: 'Tops', slug: 'tops', type: 'tops', sortOrder: 1 });
const catBottoms = createCategory({ merchantId: merchant.id, name: 'Bottoms', slug: 'bottoms', type: 'bottoms', sortOrder: 2 });
const catShoes = createCategory({ merchantId: merchant.id, name: 'Shoes', slug: 'shoes', type: 'shoes', sortOrder: 3 });
[catTops, catBottoms, catShoes].forEach(c => store.insert('categories', c));
console.log(`  Categories: ${catTops.id}, ${catBottoms.id}, ${catShoes.id}`);

// ---- Products ----
const productsData = [
  { categoryId: catTops.id, name: 'White T-shirt', price: 890, images: ['images/tops/white_tee.jpg'], tags: ['basic', 'casual'] },
  { categoryId: catTops.id, name: 'Striped Shirt', price: 1290, images: ['images/tops/striped_shirt.jpg'], tags: ['smart-casual'] },
  { categoryId: catTops.id, name: 'Black Hoodie', price: 1490, images: ['images/tops/black_hoodie.jpg'], tags: ['streetwear'] },
  { categoryId: catTops.id, name: 'Red Flannel', price: 1690, images: ['images/tops/red_flannel.jpg'], tags: ['casual', 'layering'] },
  { categoryId: catTops.id, name: 'Navy Blazer', price: 3290, images: ['images/tops/navy_blazer.jpg'], tags: ['formal', 'business'] },
  { categoryId: catTops.id, name: 'Denim Jacket', price: 2490, images: ['images/tops/denim_jacket.jpg'], tags: ['casual', 'layering'] },
  { categoryId: catBottoms.id, name: 'Blue Jeans', price: 1690, images: ['images/bottoms/blue_jeans.jpg'], tags: ['casual', 'basic'] },
  { categoryId: catBottoms.id, name: 'Khaki Pants', price: 1290, images: ['images/bottoms/khaki_pants.jpg'], tags: ['smart-casual'] },
  { categoryId: catBottoms.id, name: 'Black Skirt', price: 1890, images: ['images/bottoms/black_skirt.jpg'], tags: ['formal', 'chic'] },
  { categoryId: catBottoms.id, name: 'Joggers', price: 990, images: ['images/bottoms/joggers.jpg'], tags: ['streetwear', 'comfort'] },
  { categoryId: catShoes.id, name: 'White Sneakers', price: 3290, images: ['images/shoes/white_sneakers.jpg'], tags: ['casual', 'versatile'] },
  { categoryId: catShoes.id, name: 'Black Boots', price: 4290, images: ['images/shoes/black_boots.jpg'], tags: ['edgy', 'winter'] },
  { categoryId: catShoes.id, name: 'Brown Oxford', price: 3890, images: ['images/shoes/brown_oxford.jpg'], tags: ['formal', 'classic'] },
];

productsData.forEach(p => {
  const product = createProduct({ ...p, merchantId: merchant.id, status: 'active', currency: 'TWD' });
  store.insert('products', product);
});
console.log(`  Products: ${productsData.length} items`);

// ---- AI Agents ----
const stylist = createAIAgent({
  merchantId: merchant.id,
  name: 'StyleBot',
  persona: 'You are StyleBot, a trendy fashion advisor. You speak in a friendly, enthusiastic tone and love helping customers find their perfect look. You consider body type, occasion, personal style, and budget.',
  styleProfile: {
    preferredCategories: ['tops', 'bottoms', 'shoes'],
    colorPalette: ['navy', 'white', 'black', 'earth-tones'],
    fashionStyle: 'smart-casual',
    priceRange: { min: 500, max: 5000 },
  },
  capabilities: ['styling_advice', 'try_on', 'product_recommend', 'order_assist'],
  temperature: 0.8,
});
store.insert('ai_agents', stylist);

const formalAgent = createAIAgent({
  merchantId: merchant.id,
  name: 'FormalFit',
  persona: 'You are FormalFit, a professional styling consultant specializing in business and formal wear. You help customers look polished and put-together for work and special events.',
  styleProfile: {
    preferredCategories: ['tops', 'bottoms'],
    colorPalette: ['navy', 'charcoal', 'white', 'burgundy'],
    fashionStyle: 'formal',
    priceRange: { min: 1500, max: 10000 },
  },
  capabilities: ['styling_advice', 'product_recommend'],
  temperature: 0.5,
});
store.insert('ai_agents', formalAgent);
console.log(`  AI Agents: ${stylist.id}, ${formalAgent.id}`);

console.log('Seed complete!');
