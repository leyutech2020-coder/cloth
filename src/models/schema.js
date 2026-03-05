/**
 * ClosetSwipe Data Schema
 *
 * Core entities:
 *   Merchant  -> has many Products, has many AIAgents
 *   Product   -> belongs to Merchant, belongs to Category
 *   Category  -> has many Products (tops, bottoms, shoes, accessories...)
 *   Order     -> belongs to Customer, has many OrderItems (each -> Product)
 *   AIAgent   -> belongs to Merchant, has a persona & style preferences
 *   TryOnSession -> links Customer + Products + AI results
 *   Conversation -> AI agent chat history with a customer
 */

// Unique ID generator (no external deps)
function generateId(prefix = '') {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${ts}${rand}` : `${ts}${rand}`;
}

// ---- Schema definitions (used for validation & documentation) ----

const MerchantSchema = {
  id: 'string',           // mer_xxxxx
  name: 'string',
  slug: 'string',         // URL-friendly name
  description: 'string',
  logo: 'string',         // URL or base64
  contactEmail: 'string',
  contactPhone: 'string',
  address: 'string',
  status: 'string',       // active | suspended | pending
  plan: 'string',         // free | basic | pro
  aiAgentEnabled: 'boolean',
  settings: {
    brandColor: 'string',
    welcomeMessage: 'string',
    autoTryOnEnabled: 'boolean',
    maxProductsPerCategory: 'number',
  },
  createdAt: 'string',    // ISO 8601
  updatedAt: 'string',
};

const ProductSchema = {
  id: 'string',           // prod_xxxxx
  merchantId: 'string',
  categoryId: 'string',
  name: 'string',
  description: 'string',
  price: 'number',        // cents
  currency: 'string',     // TWD, USD, etc.
  images: ['string'],     // array of URLs/base64
  tryOnImage: 'string',   // primary image for virtual try-on
  tags: ['string'],
  variants: [{
    id: 'string',
    name: 'string',       // e.g. "M / Black"
    sku: 'string',
    stock: 'number',
    price: 'number',      // override or null
  }],
  status: 'string',       // active | draft | archived
  metadata: 'object',     // flexible extra fields
  createdAt: 'string',
  updatedAt: 'string',
};

const CategorySchema = {
  id: 'string',           // cat_xxxxx
  merchantId: 'string',   // null for global categories
  name: 'string',
  slug: 'string',
  type: 'string',         // tops | bottoms | shoes | accessories | outerwear
  sortOrder: 'number',
  createdAt: 'string',
};

const OrderSchema = {
  id: 'string',           // ord_xxxxx
  merchantId: 'string',
  customerId: 'string',
  items: [{
    productId: 'string',
    variantId: 'string',
    quantity: 'number',
    unitPrice: 'number',
  }],
  totalAmount: 'number',
  currency: 'string',
  status: 'string',       // pending | confirmed | shipped | delivered | cancelled
  shippingAddress: 'object',
  tryOnSessionId: 'string', // link back to the try-on that led to purchase
  createdAt: 'string',
  updatedAt: 'string',
};

const AIAgentSchema = {
  id: 'string',           // agt_xxxxx
  merchantId: 'string',
  name: 'string',
  persona: 'string',      // system prompt / personality description
  styleProfile: {
    preferredCategories: ['string'],
    colorPalette: ['string'],
    fashionStyle: 'string',  // casual | formal | streetwear | minimalist | bohemian
    priceRange: { min: 'number', max: 'number' },
  },
  capabilities: ['string'], // styling_advice | try_on | product_recommend | order_assist
  temperature: 'number',    // AI creativity 0-1
  status: 'string',         // active | inactive
  createdAt: 'string',
  updatedAt: 'string',
};

const TryOnSessionSchema = {
  id: 'string',           // try_xxxxx
  merchantId: 'string',
  customerId: 'string',   // null for anonymous
  personImage: 'string',  // stored reference (not raw base64)
  products: [{
    productId: 'string',
    categoryType: 'string',
  }],
  results: [{
    step: 'number',
    image: 'string',       // stored reference
    mimeType: 'string',
  }],
  aiAgentId: 'string',    // which agent assisted
  status: 'string',       // in_progress | completed | failed
  createdAt: 'string',
};

const ConversationSchema = {
  id: 'string',           // conv_xxxxx
  merchantId: 'string',
  customerId: 'string',
  aiAgentId: 'string',
  messages: [{
    role: 'string',        // user | assistant | system
    content: 'string',
    timestamp: 'string',
    metadata: 'object',    // e.g. { action: 'try_on', productIds: [...] }
  }],
  context: {
    currentOutfit: ['string'],  // product IDs
    tryOnSessionId: 'string',
    mood: 'string',
    occasion: 'string',
  },
  status: 'string',       // active | closed
  createdAt: 'string',
  updatedAt: 'string',
};

// ---- Factory functions ----

function createMerchant(data) {
  const now = new Date().toISOString();
  return {
    id: generateId('mer'),
    name: data.name || '',
    slug: data.slug || slugify(data.name || ''),
    description: data.description || '',
    logo: data.logo || '',
    contactEmail: data.contactEmail || '',
    contactPhone: data.contactPhone || '',
    address: data.address || '',
    status: data.status || 'pending',
    plan: data.plan || 'free',
    aiAgentEnabled: data.aiAgentEnabled ?? true,
    settings: {
      brandColor: '#6C5CE7',
      welcomeMessage: '',
      autoTryOnEnabled: true,
      maxProductsPerCategory: 50,
      ...data.settings,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function createProduct(data) {
  const now = new Date().toISOString();
  return {
    id: generateId('prod'),
    merchantId: data.merchantId,
    categoryId: data.categoryId || '',
    name: data.name || '',
    description: data.description || '',
    price: data.price || 0,
    currency: data.currency || 'TWD',
    images: data.images || [],
    tryOnImage: data.tryOnImage || (data.images ? data.images[0] : ''),
    tags: data.tags || [],
    variants: data.variants || [],
    status: data.status || 'draft',
    metadata: data.metadata || {},
    createdAt: now,
    updatedAt: now,
  };
}

function createCategory(data) {
  return {
    id: generateId('cat'),
    merchantId: data.merchantId || null,
    name: data.name || '',
    slug: data.slug || slugify(data.name || ''),
    type: data.type || 'tops',
    sortOrder: data.sortOrder ?? 0,
    createdAt: new Date().toISOString(),
  };
}

function createOrder(data) {
  const now = new Date().toISOString();
  return {
    id: generateId('ord'),
    merchantId: data.merchantId,
    customerId: data.customerId || 'anonymous',
    items: data.items || [],
    totalAmount: data.totalAmount || 0,
    currency: data.currency || 'TWD',
    status: 'pending',
    shippingAddress: data.shippingAddress || {},
    tryOnSessionId: data.tryOnSessionId || null,
    createdAt: now,
    updatedAt: now,
  };
}

function createAIAgent(data) {
  const now = new Date().toISOString();
  return {
    id: generateId('agt'),
    merchantId: data.merchantId,
    name: data.name || 'Style Assistant',
    persona: data.persona || 'You are a friendly fashion styling assistant.',
    styleProfile: {
      preferredCategories: [],
      colorPalette: [],
      fashionStyle: 'casual',
      priceRange: { min: 0, max: 100000 },
      ...data.styleProfile,
    },
    capabilities: data.capabilities || ['styling_advice', 'try_on', 'product_recommend'],
    temperature: data.temperature ?? 0.7,
    status: data.status || 'active',
    createdAt: now,
    updatedAt: now,
  };
}

function createTryOnSession(data) {
  return {
    id: generateId('try'),
    merchantId: data.merchantId || null,
    customerId: data.customerId || 'anonymous',
    personImage: data.personImage || '',
    products: data.products || [],
    results: [],
    aiAgentId: data.aiAgentId || null,
    status: 'in_progress',
    createdAt: new Date().toISOString(),
  };
}

function createConversation(data) {
  const now = new Date().toISOString();
  return {
    id: generateId('conv'),
    merchantId: data.merchantId,
    customerId: data.customerId || 'anonymous',
    aiAgentId: data.aiAgentId,
    messages: [],
    context: {
      currentOutfit: [],
      tryOnSessionId: null,
      mood: null,
      occasion: null,
      ...data.context,
    },
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

// ---- Helpers ----

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = {
  generateId,
  slugify,
  createMerchant,
  createProduct,
  createCategory,
  createOrder,
  createAIAgent,
  createTryOnSession,
  createConversation,
  // Export schemas for reference
  schemas: {
    MerchantSchema,
    ProductSchema,
    CategorySchema,
    OrderSchema,
    AIAgentSchema,
    TryOnSessionSchema,
    ConversationSchema,
  },
};
