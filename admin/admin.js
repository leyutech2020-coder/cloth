/* ClosetSwipe Admin Dashboard */

const API = '/api/admin';
let currentPage = 'dashboard';

// ---- Navigation ----
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const active = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (active) active.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    merchants: 'Merchants',
    products: 'Products',
    orders: 'Orders',
    agents: 'AI Agents',
    tryon: 'Try-On Sessions',
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;

  const loaders = { dashboard: loadDashboard, merchants: loadMerchants, products: loadProducts, orders: loadOrders, agents: loadAgents, tryon: loadTryOnSessions };
  if (loaders[page]) loaders[page]();
}

// ---- API Helper ----
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return res.json();
}

// ---- Dashboard ----
async function loadDashboard() {
  const content = document.getElementById('pageContent');
  const actions = document.getElementById('headerActions');
  actions.innerHTML = '';

  const [merchants, products, orders, agents, sessions] = await Promise.all([
    api('/api/merchants'),
    api('/api/products'),
    api('/api/orders'),
    api('/api/ai-agents'),
    api('/api/ai-agents/tryon-sessions'),
  ]);

  const mc = merchants.data?.length || 0;
  const pc = products.data?.length || 0;
  const oc = orders.data?.length || 0;
  const ac = agents.data?.length || 0;
  const sc = sessions.data?.length || 0;

  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">&#x1F3EA;</div>
        <div class="stat-value">${mc}</div>
        <div class="stat-label">Merchants</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">&#x1F455;</div>
        <div class="stat-value">${pc}</div>
        <div class="stat-label">Products</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">&#x1F4E6;</div>
        <div class="stat-value">${oc}</div>
        <div class="stat-label">Orders</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">&#x1F916;</div>
        <div class="stat-value">${ac}</div>
        <div class="stat-label">AI Agents</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">&#x2728;</div>
        <div class="stat-value">${sc}</div>
        <div class="stat-label">Try-On Sessions</div>
      </div>
    </div>

    <div class="section-header">
      <h2>Recent Orders</h2>
    </div>
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${(orders.data || []).slice(0, 5).map(o => `
            <tr>
              <td><code>${o.id}</code></td>
              <td>${o.customerId}</td>
              <td>$${(o.totalAmount || 0).toLocaleString()} ${o.currency}</td>
              <td><span class="badge badge-${o.status}">${o.status}</span></td>
              <td>${new Date(o.createdAt).toLocaleDateString('zh-TW')}</td>
            </tr>
          `).join('') || '<tr><td colspan="5" style="text-align:center;color:#999;padding:30px">No orders yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

// ---- Merchants ----
async function loadMerchants() {
  const content = document.getElementById('pageContent');
  const actions = document.getElementById('headerActions');
  actions.innerHTML = '<button class="btn btn-primary" onclick="showMerchantForm()">+ Add Merchant</button>';

  const { data: merchants } = await api('/api/merchants');
  content.innerHTML = `
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Plan</th><th>Status</th><th>AI Agent</th><th>Actions</th></tr></thead>
        <tbody>
          ${(merchants || []).map(m => `
            <tr>
              <td><strong>${m.name}</strong><br><small style="color:#999">${m.slug}</small></td>
              <td>${m.contactEmail}</td>
              <td><span class="badge badge-active">${m.plan}</span></td>
              <td><span class="badge badge-${m.status}">${m.status}</span></td>
              <td>${m.aiAgentEnabled ? 'Enabled' : 'Disabled'}</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="editMerchant('${m.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteMerchant('${m.id}')">Delete</button>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="6" style="text-align:center;color:#999;padding:30px">No merchants yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function showMerchantForm(merchant = null) {
  document.getElementById('modalTitle').textContent = merchant ? 'Edit Merchant' : 'Add Merchant';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label>Name</label>
        <input id="f_name" value="${merchant?.name || ''}" placeholder="Store name">
      </div>
      <div class="form-group">
        <label>Slug</label>
        <input id="f_slug" value="${merchant?.slug || ''}" placeholder="url-friendly-name">
      </div>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="f_desc" rows="2">${merchant?.description || ''}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Email</label>
        <input id="f_email" type="email" value="${merchant?.contactEmail || ''}">
      </div>
      <div class="form-group">
        <label>Plan</label>
        <select id="f_plan">
          <option value="free" ${merchant?.plan === 'free' ? 'selected' : ''}>Free</option>
          <option value="basic" ${merchant?.plan === 'basic' ? 'selected' : ''}>Basic</option>
          <option value="pro" ${merchant?.plan === 'pro' ? 'selected' : ''}>Pro</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Status</label>
      <select id="f_status">
        <option value="active" ${merchant?.status === 'active' ? 'selected' : ''}>Active</option>
        <option value="pending" ${merchant?.status === 'pending' ? 'selected' : ''}>Pending</option>
        <option value="suspended" ${merchant?.status === 'suspended' ? 'selected' : ''}>Suspended</option>
      </select>
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveMerchant(${merchant ? `'${merchant.id}'` : 'null'})">Save</button>
  `;
  openModal();
}

async function saveMerchant(id) {
  const body = {
    name: document.getElementById('f_name').value,
    slug: document.getElementById('f_slug').value,
    description: document.getElementById('f_desc').value,
    contactEmail: document.getElementById('f_email').value,
    plan: document.getElementById('f_plan').value,
    status: document.getElementById('f_status').value,
  };
  if (id) {
    await api(`/api/merchants/${id}`, { method: 'PUT', body });
  } else {
    await api('/api/merchants', { method: 'POST', body });
  }
  closeModal();
  loadMerchants();
}

async function editMerchant(id) {
  const { data } = await api(`/api/merchants/${id}`);
  if (data) showMerchantForm(data);
}

async function deleteMerchant(id) {
  if (!confirm('Delete this merchant?')) return;
  await api(`/api/merchants/${id}`, { method: 'DELETE' });
  loadMerchants();
}

// ---- Products ----
async function loadProducts() {
  const content = document.getElementById('pageContent');
  const actions = document.getElementById('headerActions');
  actions.innerHTML = '<button class="btn btn-primary" onclick="showProductForm()">+ Add Product</button>';

  const { data: products } = await api('/api/products');
  content.innerHTML = `
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead><tr><th>Product</th><th>Price</th><th>Status</th><th>Tags</th><th>Actions</th></tr></thead>
        <tbody>
          ${(products || []).map(p => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  ${p.images?.[0] ? `<img src="/${p.images[0]}" style="width:40px;height:40px;object-fit:cover;border-radius:6px">` : ''}
                  <div><strong>${p.name}</strong><br><small style="color:#999">${p.id}</small></div>
                </div>
              </td>
              <td>$${(p.price || 0).toLocaleString()} ${p.currency}</td>
              <td><span class="badge badge-${p.status}">${p.status}</span></td>
              <td>${(p.tags || []).map(t => `<span class="capability-tag">${t}</span>`).join(' ')}</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="editProduct('${p.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Delete</button>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="5" style="text-align:center;color:#999;padding:30px">No products yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function showProductForm(product = null) {
  document.getElementById('modalTitle').textContent = product ? 'Edit Product' : 'Add Product';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group">
      <label>Name</label>
      <input id="f_pname" value="${product?.name || ''}">
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="f_pdesc" rows="2">${product?.description || ''}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Price (TWD)</label>
        <input id="f_pprice" type="number" value="${product?.price || 0}">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="f_pstatus">
          <option value="active" ${product?.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="draft" ${product?.status === 'draft' ? 'selected' : ''}>Draft</option>
          <option value="archived" ${product?.status === 'archived' ? 'selected' : ''}>Archived</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Tags (comma-separated)</label>
      <input id="f_ptags" value="${(product?.tags || []).join(', ')}">
    </div>
    <div class="form-group">
      <label>Merchant ID</label>
      <input id="f_pmerchant" value="${product?.merchantId || ''}" placeholder="mer_xxxxx">
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveProduct(${product ? `'${product.id}'` : 'null'})">Save</button>
  `;
  openModal();
}

async function saveProduct(id) {
  const body = {
    name: document.getElementById('f_pname').value,
    description: document.getElementById('f_pdesc').value,
    price: parseInt(document.getElementById('f_pprice').value) || 0,
    status: document.getElementById('f_pstatus').value,
    tags: document.getElementById('f_ptags').value.split(',').map(t => t.trim()).filter(Boolean),
    merchantId: document.getElementById('f_pmerchant').value,
  };
  if (id) {
    await api(`/api/products/${id}`, { method: 'PUT', body });
  } else {
    await api('/api/products', { method: 'POST', body });
  }
  closeModal();
  loadProducts();
}

async function editProduct(id) {
  const { data } = await api(`/api/products/${id}`);
  if (data) showProductForm(data);
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  await api(`/api/products/${id}`, { method: 'DELETE' });
  loadProducts();
}

// ---- Orders ----
async function loadOrders() {
  const content = document.getElementById('pageContent');
  const actions = document.getElementById('headerActions');
  actions.innerHTML = '';

  const { data: orders } = await api('/api/orders');
  content.innerHTML = `
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>
          ${(orders || []).map(o => `
            <tr>
              <td><code>${o.id}</code></td>
              <td>${o.customerId}</td>
              <td>${o.items?.length || 0} item(s)</td>
              <td>$${(o.totalAmount || 0).toLocaleString()} ${o.currency}</td>
              <td><span class="badge badge-${o.status}">${o.status}</span></td>
              <td>${new Date(o.createdAt).toLocaleDateString('zh-TW')}</td>
              <td>
                <select onchange="updateOrderStatus('${o.id}', this.value)" style="padding:4px;border-radius:4px;border:1px solid #ddd">
                  ${['pending','confirmed','shipped','delivered','cancelled'].map(s =>
                    `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
                  ).join('')}
                </select>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="7" style="text-align:center;color:#999;padding:30px">No orders yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

async function updateOrderStatus(id, status) {
  await api(`/api/orders/${id}`, { method: 'PUT', body: { status } });
}

// ---- AI Agents ----
async function loadAgents() {
  const content = document.getElementById('pageContent');
  const actions = document.getElementById('headerActions');
  actions.innerHTML = '<button class="btn btn-primary" onclick="showAgentForm()">+ Create Agent</button>';

  const { data: agents } = await api('/api/ai-agents');
  if (!agents || agents.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#x1F916;</div>
        <div class="empty-text">No AI Agents yet</div>
        <button class="btn btn-primary" onclick="showAgentForm()">Create your first AI Agent</button>
      </div>
    `;
    return;
  }

  content.innerHTML = agents.map(a => `
    <div class="agent-card">
      <div class="agent-card-header">
        <div class="agent-avatar">&#x1F916;</div>
        <div>
          <div class="agent-name">${a.name}</div>
          <div class="agent-meta">${a.id} &middot; ${a.styleProfile?.fashionStyle || 'general'} style &middot; <span class="badge badge-${a.status}">${a.status}</span></div>
        </div>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="editAgent('${a.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteAgent('${a.id}')">Delete</button>
        </div>
      </div>
      <p style="color:#636E72;font-size:14px;margin-bottom:12px">${a.persona}</p>
      <div style="font-size:13px;color:#999;margin-bottom:8px">Temperature: ${a.temperature} &middot; Merchant: ${a.merchantId}</div>
      <div class="agent-capabilities">
        ${(a.capabilities || []).map(c => `<span class="capability-tag">${c.replace(/_/g, ' ')}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function showAgentForm(agent = null) {
  document.getElementById('modalTitle').textContent = agent ? 'Edit AI Agent' : 'Create AI Agent';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label>Name</label>
        <input id="f_aname" value="${agent?.name || ''}">
      </div>
      <div class="form-group">
        <label>Merchant ID</label>
        <input id="f_amerchant" value="${agent?.merchantId || ''}" placeholder="mer_xxxxx">
      </div>
    </div>
    <div class="form-group">
      <label>Persona (System Prompt)</label>
      <textarea id="f_apersona" rows="4">${agent?.persona || ''}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Fashion Style</label>
        <select id="f_astyle">
          ${['casual','formal','streetwear','minimalist','bohemian','smart-casual'].map(s =>
            `<option value="${s}" ${agent?.styleProfile?.fashionStyle === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Temperature (0-1)</label>
        <input id="f_atemp" type="number" step="0.1" min="0" max="1" value="${agent?.temperature ?? 0.7}">
      </div>
    </div>
    <div class="form-group">
      <label>Capabilities</label>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        ${['styling_advice','try_on','product_recommend','order_assist'].map(c => `
          <label style="display:flex;align-items:center;gap:4px;font-size:13px;font-weight:400">
            <input type="checkbox" class="f_acap" value="${c}" ${(agent?.capabilities || []).includes(c) ? 'checked' : ''}>
            ${c.replace(/_/g, ' ')}
          </label>
        `).join('')}
      </div>
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveAgent(${agent ? `'${agent.id}'` : 'null'})">Save</button>
  `;
  openModal();
}

async function saveAgent(id) {
  const capabilities = [...document.querySelectorAll('.f_acap:checked')].map(el => el.value);
  const body = {
    name: document.getElementById('f_aname').value,
    merchantId: document.getElementById('f_amerchant').value,
    persona: document.getElementById('f_apersona').value,
    styleProfile: { fashionStyle: document.getElementById('f_astyle').value },
    temperature: parseFloat(document.getElementById('f_atemp').value),
    capabilities,
  };
  if (id) {
    await api(`/api/ai-agents/${id}`, { method: 'PUT', body });
  } else {
    await api('/api/ai-agents', { method: 'POST', body });
  }
  closeModal();
  loadAgents();
}

async function editAgent(id) {
  const { data } = await api(`/api/ai-agents/${id}`);
  if (data) showAgentForm(data);
}

async function deleteAgent(id) {
  if (!confirm('Delete this AI Agent?')) return;
  await api(`/api/ai-agents/${id}`, { method: 'DELETE' });
  loadAgents();
}

// ---- Try-On Sessions ----
async function loadTryOnSessions() {
  const content = document.getElementById('pageContent');
  const actions = document.getElementById('headerActions');
  actions.innerHTML = '';

  const { data: sessions } = await api('/api/ai-agents/tryon-sessions');
  content.innerHTML = `
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead><tr><th>Session ID</th><th>Customer</th><th>Products</th><th>Agent</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${(sessions || []).map(s => `
            <tr>
              <td><code>${s.id}</code></td>
              <td>${s.customerId}</td>
              <td>${s.products?.length || 0} item(s)</td>
              <td>${s.aiAgentId || '-'}</td>
              <td><span class="badge badge-${s.status?.replace('_','-')}">${s.status}</span></td>
              <td>${new Date(s.createdAt).toLocaleDateString('zh-TW')}</td>
            </tr>
          `).join('') || '<tr><td colspan="6" style="text-align:center;color:#999;padding:30px">No try-on sessions yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

// ---- Modal ----
function openModal() { document.getElementById('modal').classList.add('active'); }
function closeModal() { document.getElementById('modal').classList.remove('active'); }

// ---- Init ----
loadDashboard();
