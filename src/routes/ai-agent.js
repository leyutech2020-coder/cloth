const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { createAIAgent, createConversation, createTryOnSession } = require('../models/schema');

// ---- AI Agent CRUD ----

router.get('/', (req, res) => {
  const { merchantId } = req.query;
  const filter = merchantId ? { merchantId } : {};
  res.json({ success: true, data: store.findAll('ai_agents', filter) });
});

router.get('/:id', (req, res) => {
  const agent = store.findById('ai_agents', req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
});

router.post('/', (req, res) => {
  if (!req.body.merchantId) {
    return res.status(400).json({ success: false, error: 'merchantId is required' });
  }
  const agent = createAIAgent(req.body);
  store.insert('ai_agents', agent);
  res.status(201).json({ success: true, data: agent });
});

router.put('/:id', (req, res) => {
  const updated = store.update('ai_agents', req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: updated });
});

router.delete('/:id', (req, res) => {
  const deleted = store.delete('ai_agents', req.params.id);
  if (!deleted) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true });
});

// ---- Conversations ----

router.post('/:agentId/conversations', (req, res) => {
  const agent = store.findById('ai_agents', req.params.agentId);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  const conversation = createConversation({
    merchantId: agent.merchantId,
    aiAgentId: agent.id,
    customerId: req.body.customerId,
    context: req.body.context,
  });

  // Add system message with agent persona
  conversation.messages.push({
    role: 'system',
    content: agent.persona,
    timestamp: new Date().toISOString(),
    metadata: { agentName: agent.name },
  });

  store.insert('conversations', conversation);
  res.status(201).json({ success: true, data: conversation });
});

router.get('/:agentId/conversations', (req, res) => {
  const conversations = store.findAll('conversations', { aiAgentId: req.params.agentId });
  res.json({ success: true, data: conversations });
});

// Send message in a conversation
router.post('/conversations/:convId/messages', (req, res) => {
  const conv = store.findById('conversations', req.params.convId);
  if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });

  const { content, role = 'user', metadata = {} } = req.body;
  if (!content) return res.status(400).json({ success: false, error: 'content is required' });

  conv.messages.push({
    role,
    content,
    timestamp: new Date().toISOString(),
    metadata,
  });

  // Generate AI response based on agent persona and context
  const agent = store.findById('ai_agents', conv.aiAgentId);
  const aiResponse = generateAgentResponse(agent, conv, content);
  conv.messages.push(aiResponse);

  store.update('conversations', conv.id, { messages: conv.messages });
  res.json({ success: true, data: { userMessage: conv.messages.at(-2), aiResponse } });
});

// ---- Try-On Sessions ----

router.post('/tryon-sessions', (req, res) => {
  const session = createTryOnSession(req.body);
  store.insert('tryon_sessions', session);
  res.status(201).json({ success: true, data: session });
});

router.get('/tryon-sessions', (req, res) => {
  const { merchantId, customerId } = req.query;
  const filter = {};
  if (merchantId) filter.merchantId = merchantId;
  if (customerId) filter.customerId = customerId;
  res.json({ success: true, data: store.findAll('tryon_sessions', filter) });
});

router.put('/tryon-sessions/:id', (req, res) => {
  const updated = store.update('tryon_sessions', req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'Session not found' });
  res.json({ success: true, data: updated });
});

// ---- AI Response Generation (rule-based for now, pluggable for LLM) ----

function generateAgentResponse(agent, conversation, userMessage) {
  const msg = userMessage.toLowerCase();
  const products = store.findAll('products', { merchantId: agent.merchantId, status: 'active' });
  let content = '';
  const metadata = {};

  if (msg.includes('recommend') || msg.includes('suggest') || msg.includes('what')) {
    const style = agent.styleProfile.fashionStyle;
    const relevant = products.slice(0, 3);
    content = `Based on your style, I'd recommend: ${relevant.map(p => p.name).join(', ')}. ` +
      `These fit a ${style} aesthetic perfectly!`;
    metadata.action = 'product_recommend';
    metadata.productIds = relevant.map(p => p.id);
  } else if (msg.includes('try') || msg.includes('tryon') || msg.includes('wear')) {
    content = 'I can help you try that on! Select the items and I\'ll generate a virtual try-on preview.';
    metadata.action = 'try_on_suggest';
  } else if (msg.includes('order') || msg.includes('buy') || msg.includes('purchase')) {
    content = 'Great choice! I can help you place an order. Would you like to proceed with the current outfit?';
    metadata.action = 'order_assist';
  } else {
    content = `Thanks for your message! I'm your ${agent.name} assistant. ` +
      'I can help with styling recommendations, virtual try-ons, and placing orders.';
    metadata.action = 'general';
  }

  return {
    role: 'assistant',
    content,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

module.exports = router;
