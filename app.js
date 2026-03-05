/* ===== ClosetSwipe v5 — Static AI Try-on + Chat Adjustment ===== */

// ===================== CLOTHING DATA =====================
const CLOTHING = {
  tops: [
    { name: '白色 T-shirt', img: 'images/tops/white_tee.jpg', price: '$890' },
    { name: '條紋襯衫', img: 'images/tops/striped_shirt.jpg', price: '$1,290' },
    { name: '黑色帽T', img: 'images/tops/black_hoodie.jpg', price: '$1,490' },
    { name: '紅色法蘭絨', img: 'images/tops/red_flannel.jpg', price: '$1,690' },
    { name: '海軍藍西裝外套', img: 'images/tops/navy_blazer.jpg', price: '$3,290' },
    { name: '丹寧夾克', img: 'images/tops/denim_jacket.jpg', price: '$2,490' },
  ],
  bottoms: [
    { name: '深藍牛仔褲', img: 'images/bottoms/blue_jeans.jpg', price: '$1,690' },
    { name: '卡其休閒褲', img: 'images/bottoms/khaki_pants.jpg', price: '$1,290' },
    { name: '黑色短裙', img: 'images/bottoms/black_skirt.jpg', price: '$1,890' },
    { name: '慢跑褲', img: 'images/bottoms/joggers.jpg', price: '$990' },
  ],
  shoes: [
    { name: '白色運動鞋', img: 'images/shoes/white_sneakers.jpg', price: '$3,290' },
    { name: '黑色靴子', img: 'images/shoes/black_boots.jpg', price: '$4,290' },
    { name: '棕色牛津鞋', img: 'images/shoes/brown_oxford.jpg', price: '$3,890' },
  ]
};

// ===================== STATE =====================
let currentIndex = { tops: 0, bottoms: 0, shoes: 0 };
let currentMode = 'photo';
let cameraStream = null;
let personImageData = null;
let aiResultImages = [];
let preloadedBase64 = {};
let modelReady = false;

// Auto-play
let autoPlaying = false;
let autoTimer = null;
let autoProgressTimer = null;
let autoProgress = 0;
const AUTO_INTERVAL = 2000;

// AI cache
const aiCache = {};
let bgPregenTimer = null;
let bgPregenRunning = false;

// Chat adjustment history
let adjustHistory = [];

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  renderCarousels();
  setupPhotoUpload();
  setupKeyboard();
  preloadImages();
  setupDragDrop();
  setupCompareSlider();
  useDefaultModel();
});

// ===================== PRELOAD =====================
function preloadImages() {
  const allItems = [...CLOTHING.tops, ...CLOTHING.bottoms, ...CLOTHING.shoes];
  const img = allItems.map(item => item.img);
  img.push('images/model/model1.jpg');
  img.forEach(url => imageUrlToBase64(url));
}

function imageUrlToBase64(url) {
  if (preloadedBase64[url]) return Promise.resolve(preloadedBase64[url]);
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 0) {
        const reader = new FileReader();
        reader.onloadend = () => { preloadedBase64[url] = reader.result; resolve(reader.result); };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(xhr.response);
      } else resolve(null);
    };
    xhr.onerror = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        preloadedBase64[url] = c.toDataURL('image/jpeg', 0.85);
        resolve(preloadedBase64[url]);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    };
    xhr.send();
  });
}

// ===================== MODE =====================
function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(mode === 'photo' ? 'btnModePhoto' : 'btnModeCamera').classList.add('active');

  const photo = document.getElementById('modelPhoto');
  const video = document.getElementById('modelVideo');
  const placeholder = document.getElementById('modelPlaceholder');

  if (mode === 'photo') {
    stopCamera();
    video.style.display = 'none';
    if (modelReady) {
      photo.style.display = 'block';
      placeholder.style.display = 'none';
    } else {
      photo.style.display = 'none';
      placeholder.style.display = 'flex';
    }
  } else if (mode === 'camera') {
    photo.style.display = 'none';
    placeholder.style.display = 'none';
    startCamera();
  }
}

function useDefaultModel() {
  modelReady = true;
  const photo = document.getElementById('modelPhoto');
  photo.src = 'images/model/model1.jpg';
  photo.style.display = 'block';
  document.getElementById('modelPlaceholder').style.display = 'none';
  setMode('photo');
}

async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 960 } });
    const video = document.getElementById('modelVideo');
    video.srcObject = cameraStream;
    video.style.display = 'block';
  } catch (e) {
    alert('無法啟動鏡頭：' + e.message);
    setMode('photo');
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
}

function captureFrame() {
  const video = document.getElementById('modelVideo');
  if (!video.srcObject) return null;
  const c = document.createElement('canvas');
  c.width = video.videoWidth || 640;
  c.height = video.videoHeight || 960;
  c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}

// ===================== PHOTO UPLOAD =====================
function setupPhotoUpload() {
  document.getElementById('photoInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      personImageData = ev.target.result;
      const photo = document.getElementById('modelPhoto');
      photo.src = personImageData;
      photo.style.display = 'block';
      modelReady = true;
      document.getElementById('modelPlaceholder').style.display = 'none';
      setMode('photo');
    };
    reader.readAsDataURL(file);
  });
}

// ===================== CAROUSEL =====================
function renderCarousels() {
  ['tops', 'bottoms', 'shoes'].forEach(renderCarousel);
}

function renderCarousel(category) {
  const container = document.getElementById(`carousel-${category}`);
  const items = CLOTHING[category];
  container.innerHTML = items.map((item, i) => `
    <div class="carousel-item ${i === currentIndex[category] ? 'active' : ''}"
         draggable="true"
         data-category="${category}" data-index="${i}"
         onclick="selectItem('${category}', ${i})">
      <img src="${item.img}" alt="${item.name}">
      <div class="item-name">${item.name}</div>
    </div>
  `).join('');
  updateOutfitInfo();
}

function selectItem(category, index) {
  currentIndex[category] = index;
  renderCarousel(category);
  triggerBackgroundPregen();
}

function cycleCategory(category, direction) {
  const items = CLOTHING[category];
  currentIndex[category] = (currentIndex[category] + direction + items.length) % items.length;
  renderCarousel(category);
  triggerBackgroundPregen();
}

function updateOutfitInfo() {
  const top = CLOTHING.tops[currentIndex.tops];
  const bottom = CLOTHING.bottoms[currentIndex.bottoms];
  const shoe = CLOTHING.shoes[currentIndex.shoes];
  document.getElementById('outfitItems').textContent = `${top.name} + ${bottom.name} + ${shoe.name}`;
  const total = [top.price, bottom.price, shoe.price]
    .map(p => parseInt(p.replace(/[$,]/g, '')))
    .reduce((a, b) => a + b, 0);
  document.getElementById('outfitTotal').textContent = `$${total.toLocaleString()}`;
}

// ===================== DRAG & DROP =====================
function setupDragDrop() {
  const dropZone = document.getElementById('dropZone');
  const overlay = document.getElementById('dropOverlay');

  // Use event delegation on document for drag events
  document.addEventListener('dragstart', (e) => {
    const item = e.target.closest('[data-category]');
    if (!item) return;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify({
      category: item.dataset.category,
      index: parseInt(item.dataset.index)
    }));
    // Create a drag image from the item
    const dragImg = item.querySelector('img');
    if (dragImg) {
      e.dataTransfer.setDragImage(dragImg, 40, 40);
    }
    console.log('[Drag] Started:', item.dataset.category, item.dataset.index);
  });

  document.addEventListener('dragend', () => {
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    overlay.classList.remove('visible');
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    overlay.classList.add('visible');
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    // Only hide if we actually left the drop zone (not just entering a child)
    if (!dropZone.contains(e.relatedTarget)) {
      overlay.classList.remove('visible');
      dropZone.classList.remove('drag-over');
    }
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    overlay.classList.remove('visible');
    dropZone.classList.remove('drag-over');

    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;

    const data = JSON.parse(raw);
    console.log('[Drop] Received:', data.category, data.index);

    // Update selection
    currentIndex[data.category] = data.index;
    renderCarousel(data.category);

    // Visual feedback — flash the model container
    dropZone.style.boxShadow = '0 0 40px rgba(168,85,247,0.5)';
    setTimeout(() => { dropZone.style.boxShadow = ''; }, 600);

    // Auto-trigger AI try-on
    tryOnWithAI();
  });
}

// ===================== COMPARISON SLIDER =====================
function setupCompareSlider() {
  const slider = document.getElementById('compareSlider');
  const handle = document.getElementById('compareHandle');
  const line = document.getElementById('compareLine');
  const result = document.getElementById('modelResult');
  let dragging = false;

  function setPosition(x) {
    const rect = slider.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    handle.style.left = (pct * 100) + '%';
    line.style.left = (pct * 100) + '%';
    result.style.clipPath = `inset(0 0 0 ${pct * 100}%)`;
  }

  handle.addEventListener('mousedown', () => { dragging = true; });
  slider.addEventListener('mousedown', (e) => { dragging = true; setPosition(e.clientX); });
  document.addEventListener('mousemove', (e) => { if (dragging) setPosition(e.clientX); });
  document.addEventListener('mouseup', () => { dragging = false; });

  // Touch
  handle.addEventListener('touchstart', () => { dragging = true; });
  slider.addEventListener('touchstart', (e) => { dragging = true; setPosition(e.touches[0].clientX); });
  document.addEventListener('touchmove', (e) => { if (dragging) setPosition(e.touches[0].clientX); });
  document.addEventListener('touchend', () => { dragging = false; });
}

function showCompareSlider(resultSrc) {
  const result = document.getElementById('modelResult');
  const slider = document.getElementById('compareSlider');
  result.src = resultSrc;
  result.style.display = 'block';
  result.style.clipPath = 'inset(0 0 0 50%)';
  slider.style.display = 'block';
  document.getElementById('compareLine').style.left = '50%';
  document.getElementById('compareHandle').style.left = '50%';
}

function hideCompareSlider() {
  document.getElementById('modelResult').style.display = 'none';
  document.getElementById('compareSlider').style.display = 'none';
}

// ===================== SKELETON PREVIEW =====================
function showSkeleton(text, step) {
  const skel = document.getElementById('skeletonOverlay');
  skel.classList.add('visible');
  document.getElementById('skelText').textContent = text || 'AI 正在為您穿搭...';
  document.getElementById('skelStep').textContent = step || '';
}

function hideSkeleton() {
  document.getElementById('skeletonOverlay').classList.remove('visible');
}

// ===================== AUTO PLAY =====================
function toggleAutoPlay() {
  autoPlaying = !autoPlaying;
  const btn = document.getElementById('btnAutoPlay');
  const indicator = document.getElementById('autoIndicator');
  if (autoPlaying) {
    btn.classList.add('active');
    document.getElementById('autoIcon').textContent = '⏸';
    indicator.style.display = 'block';
    runAutoPlay();
  } else {
    btn.classList.remove('active');
    document.getElementById('autoIcon').textContent = '▶';
    indicator.style.display = 'none';
    clearInterval(autoTimer);
    clearInterval(autoProgressTimer);
    document.getElementById('autoProgress').style.width = '0%';
  }
}

function runAutoPlay() {
  autoProgress = 0;
  const bar = document.getElementById('autoProgress');
  bar.style.width = '0%';
  autoProgressTimer = setInterval(() => {
    autoProgress += 100 / (AUTO_INTERVAL / 50);
    bar.style.width = Math.min(autoProgress, 100) + '%';
  }, 50);
  autoTimer = setInterval(() => {
    const cats = ['tops', 'bottoms', 'shoes'];
    const cat = cats[Math.floor(Math.random() * cats.length)];
    cycleCategory(cat, 1);
    autoProgress = 0;
  }, AUTO_INTERVAL);
}

// ===================== KEYBOARD =====================
function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.key) {
      case 'ArrowLeft': cycleCategory('tops', -1); break;
      case 'ArrowRight': cycleCategory('tops', 1); break;
      case 'ArrowUp': e.preventDefault(); cycleCategory('bottoms', -1); break;
      case 'ArrowDown': e.preventDefault(); cycleCategory('bottoms', 1); break;
      case 's': case 'S': cycleCategory('shoes', 1); break;
      case ' ': e.preventDefault(); toggleAutoPlay(); break;
    }
  });
}

// ===================== AI CACHE =====================
function getCacheKey() {
  return `t${currentIndex.tops}-b${currentIndex.bottoms}-s${currentIndex.shoes}`;
}

function getPersonImage() {
  let personImg = personImageData;
  if (currentMode === 'camera') personImg = captureFrame();
  if (!personImg) {
    if (preloadedBase64['images/model/model1.jpg']) {
      personImg = preloadedBase64['images/model/model1.jpg'];
    } else {
      const photo = document.getElementById('modelPhoto');
      if (photo.src && photo.src !== window.location.href) {
        try {
          const c = document.createElement('canvas');
          c.width = photo.naturalWidth || 400;
          c.height = photo.naturalHeight || 600;
          c.getContext('2d').drawImage(photo, 0, 0, c.width, c.height);
          personImg = c.toDataURL('image/jpeg', 0.85);
        } catch (e) {}
      }
    }
  }
  return personImg;
}

// ===================== PROGRESSIVE AI TRY-ON =====================
async function tryOnWithAI() {
  const personImg = getPersonImage();
  if (!personImg) { alert('請先上傳照片或開啟鏡頭'); return; }

  const topImg = preloadedBase64[CLOTHING.tops[currentIndex.tops].img];
  const bottomImg = preloadedBase64[CLOTHING.bottoms[currentIndex.bottoms].img];
  const shoeImg = preloadedBase64[CLOTHING.shoes[currentIndex.shoes].img];
  if (!topImg) { alert('衣物圖片尚未載入完成，請稍等幾秒後再試一次。'); return; }

  const cacheKey = getCacheKey();

  // Check cache — instant display
  if (aiCache[cacheKey] && aiCache[cacheKey].full) {
    const cached = aiCache[cacheKey];
    const best = cached.full;
    const src = `data:${best.mimeType};base64,${best.image}`;
    showCompareSlider(src);
    aiResultImages = [cached.full, cached.bottom, cached.top].filter(Boolean);
    return;
  }

  // Show skeleton loading on model area
  showSkeleton('AI 正在為您穿搭...', '步驟 1/3 — 上衣合成');

  // Also open modal for detailed progress
  openAiModal();
  ['step1','step2','step3'].forEach(id => document.getElementById(id).className = 'step');
  document.getElementById('aiResults').style.display = 'block';
  document.getElementById('aiResultsGrid').innerHTML = '';
  document.getElementById('btnDownloadResult').style.display = 'none';
  document.getElementById('btnApplyResult').style.display = 'none';
  aiResultImages = [];

  if (!aiCache[cacheKey]) aiCache[cacheKey] = {};

  try {
    // STEP 1: Top
    let result1 = aiCache[cacheKey].top;
    if (!result1) {
      setStepActive(1, '正在合成上衣...');
      result1 = await stepApiCall(personImg, topImg);
      aiCache[cacheKey].top = result1;
    }
    setStepDone(1);
    aiResultImages.push(result1);
    appendResultCard(result1, '👕 上衣完成', 0);
    // Update compare slider with first result
    showCompareSlider(`data:${result1.mimeType};base64,${result1.image}`);
    showSkeleton('AI 正在為您穿搭...', '步驟 2/3 — 下著合成');

    // STEP 2: Bottom
    const step1Person = `data:${result1.mimeType};base64,${result1.image}`;
    let result2 = aiCache[cacheKey].bottom;
    if (!result2 && bottomImg) {
      setStepActive(2, '正在合成下著...');
      try {
        result2 = await stepApiCall(step1Person, bottomImg);
        aiCache[cacheKey].bottom = result2;
      } catch (e) { result2 = null; }
    }
    if (result2) {
      setStepDone(2);
      aiResultImages.push(result2);
      appendResultCard(result2, '👖 上衣 + 下著', 1);
      showCompareSlider(`data:${result2.mimeType};base64,${result2.image}`);
    } else setStepDone(2, true);
    showSkeleton('AI 正在為您穿搭...', '步驟 3/3 — 鞋款合成');

    // STEP 3: Shoes
    const step2Person = result2 ? `data:${result2.mimeType};base64,${result2.image}` : step1Person;
    let result3 = aiCache[cacheKey].full;
    if (!result3 && shoeImg) {
      setStepActive(3, '正在合成鞋款...');
      try {
        result3 = await stepApiCall(step2Person, shoeImg);
        aiCache[cacheKey].full = result3;
      } catch (e) { result3 = null; }
    }
    if (result3) {
      setStepDone(3);
      aiResultImages.push(result3);
      appendResultCard(result3, '✨ 全身搭配完成！', 2);
      showCompareSlider(`data:${result3.mimeType};base64,${result3.image}`);
    } else {
      setStepDone(3, true);
      if (result2) aiCache[cacheKey].full = result2;
    }

    hideSkeleton();
    document.getElementById('aiLoading').style.display = 'none';
    document.getElementById('btnDownloadResult').style.display = 'flex';
    document.getElementById('btnApplyResult').style.display = 'flex';
    selectAiResult(aiResultImages.length - 1);

  } catch (err) {
    hideSkeleton();
    if (aiResultImages.length > 0) {
      document.getElementById('aiLoading').style.display = 'none';
      document.getElementById('btnDownloadResult').style.display = 'flex';
      selectAiResult(aiResultImages.length - 1);
    } else {
      showAiError(err.message);
    }
  }
}

// ===================== API CALL =====================
async function stepApiCall(personBase64, productBase64) {
  const response = await fetch('/api/try-on', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personImage: personBase64, productImage: productBase64, sampleCount: 1 })
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || data.detail || `API 錯誤 (${response.status})`);
  if (!data.results || data.results.length === 0) throw new Error('API 沒有回傳結果');
  return data.results[0];
}

// ===================== RESULT CARDS =====================
function appendResultCard(result, label, index) {
  const grid = document.getElementById('aiResultsGrid');
  const card = document.createElement('div');
  card.className = 'ai-result-card';
  card.onclick = () => selectAiResult(index);
  card.style.animation = 'slideUp 0.4s ease';
  card.innerHTML = `
    <img src="data:${result.mimeType};base64,${result.image}" alt="${label}">
    <div class="result-label">${label}</div>
  `;
  grid.appendChild(card);
}

let selectedAiIndex = 0;
function selectAiResult(idx) {
  selectedAiIndex = idx;
  document.querySelectorAll('.ai-result-card').forEach((card, i) => {
    card.classList.toggle('selected', i === idx);
  });
  // Update compare slider
  if (aiResultImages[idx]) {
    const src = `data:${aiResultImages[idx].mimeType};base64,${aiResultImages[idx].image}`;
    showCompareSlider(src);
  }
}

// ===================== MODAL HELPERS =====================
function setStepActive(num, text) {
  document.getElementById(`step${num}`).className = 'step active';
  document.getElementById('aiLoadingText').textContent = text;
  document.getElementById('aiLoadingSubtext').textContent = `步驟 ${num}/3 — 大約 10-20 秒`;
}

function setStepDone(num, skipped) {
  document.getElementById(`step${num}`).className = skipped ? 'step' : 'step done';
}

function openAiModal() {
  document.getElementById('aiModal').classList.add('active');
  document.getElementById('aiLoading').style.display = 'flex';
  document.getElementById('aiResults').style.display = 'none';
  document.getElementById('aiError').style.display = 'none';
  document.getElementById('btnDownloadResult').style.display = 'none';
  document.getElementById('btnApplyResult').style.display = 'none';
}

function closeAiModal() {
  document.getElementById('aiModal').classList.remove('active');
}

function showAiResults(results) {
  document.getElementById('aiLoading').style.display = 'none';
  document.getElementById('aiResults').style.display = 'block';
  document.getElementById('btnDownloadResult').style.display = 'flex';
  document.getElementById('btnApplyResult').style.display = 'flex';
  const labels = ['✨ 全身搭配', '👖 上衣+下著', '👕 僅上衣'];
  document.getElementById('aiResultsGrid').innerHTML = results.map((r, i) => `
    <div class="ai-result-card ${i === 0 ? 'selected' : ''}" onclick="selectAiResult(${i})">
      <img src="data:${r.mimeType};base64,${r.image}" alt="結果 ${i+1}">
      <div class="result-label">${labels[i] || `方案 ${i+1}`}</div>
    </div>
  `).join('');
  selectAiResult(0);
}

function showAiError(message) {
  document.getElementById('aiLoading').style.display = 'none';
  document.getElementById('aiError').style.display = 'flex';
  let help = message;
  if (message.includes('fetch') || message.includes('Failed')) {
    help = '無法連線到代理伺服器。\n\n請確認已啟動：\nnode server.js\n\n然後透過 http://localhost:8080 開啟';
  }
  document.getElementById('aiErrorText').textContent = help;
}

function applyResultToModel() {
  if (!aiResultImages.length) return;
  const result = aiResultImages[selectedAiIndex || 0];
  const src = `data:${result.mimeType};base64,${result.image}`;
  showCompareSlider(src);
  closeAiModal();
}

// ===================== DOWNLOAD =====================
function downloadAiResult() {
  if (!aiResultImages.length) return;
  const r = aiResultImages[selectedAiIndex || 0];
  const link = document.createElement('a');
  link.href = `data:${r.mimeType};base64,${r.image}`;
  link.download = `closetswipe-${Date.now()}.png`;
  link.click();
}

// ===================== CHAT ADJUSTMENT =====================
async function adjustWithPrompt() {
  const input = document.getElementById('chatInput');
  const prompt = input.value.trim();
  if (!prompt) return;

  // Need a result to adjust
  if (!aiResultImages.length) {
    alert('請先執行 AI 試穿後再輸入調整指令');
    return;
  }

  // Add user bubble
  addChatBubble(prompt, 'user');
  input.value = '';

  // Get the current best result
  const currentResult = aiResultImages[selectedAiIndex || aiResultImages.length - 1];
  const resultBase64 = `data:${currentResult.mimeType};base64,${currentResult.image}`;

  // Show skeleton
  showSkeleton('正在調整...', `「${prompt}」`);

  try {
    const response = await fetch('/api/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resultImage: resultBase64,
        prompt: prompt
      })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || '調整失敗');
    }

    hideSkeleton();

    if (data.results && data.results.length > 0) {
      const newResult = data.results[0];
      aiResultImages.push(newResult);
      const src = `data:${newResult.mimeType};base64,${newResult.image}`;
      showCompareSlider(src);
      addChatBubble('✓ 已調整', 'ai');
      adjustHistory.push({ prompt, result: newResult });
    }
  } catch (err) {
    hideSkeleton();
    addChatBubble(`⚠ ${err.message}`, 'ai');
  }
}

function addChatBubble(text, type) {
  const history = document.getElementById('chatHistory');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${type}`;
  bubble.textContent = text;
  history.appendChild(bubble);
  history.scrollLeft = history.scrollWidth;
}

// ===================== BACKGROUND PRE-GENERATION =====================
function triggerBackgroundPregen() {
  clearTimeout(bgPregenTimer);
  bgPregenTimer = setTimeout(runBackgroundPregen, 3000);
}

async function runBackgroundPregen() {
  const cacheKey = getCacheKey();
  if (aiCache[cacheKey]?.full || bgPregenRunning) return;

  const personImg = getPersonImage();
  if (!personImg) return;

  const topImg = preloadedBase64[CLOTHING.tops[currentIndex.tops].img];
  if (!topImg) return;

  bgPregenRunning = true;
  console.log('[Pre-gen] Starting for', cacheKey);
  if (!aiCache[cacheKey]) aiCache[cacheKey] = {};

  try {
    if (!aiCache[cacheKey].top) {
      const r1 = await stepApiCall(personImg, topImg);
      if (getCacheKey() !== cacheKey) { bgPregenRunning = false; return; }
      aiCache[cacheKey].top = r1;
      console.log('[Pre-gen] Step 1 done');
    }

    const bottomImg = preloadedBase64[CLOTHING.bottoms[currentIndex.bottoms].img];
    if (bottomImg && !aiCache[cacheKey].bottom) {
      const p2 = `data:${aiCache[cacheKey].top.mimeType};base64,${aiCache[cacheKey].top.image}`;
      const r2 = await stepApiCall(p2, bottomImg);
      if (getCacheKey() !== cacheKey) { bgPregenRunning = false; return; }
      aiCache[cacheKey].bottom = r2;
      console.log('[Pre-gen] Step 2 done');
    }

    const shoeImg = preloadedBase64[CLOTHING.shoes[currentIndex.shoes].img];
    const base = aiCache[cacheKey].bottom || aiCache[cacheKey].top;
    if (shoeImg && !aiCache[cacheKey].full && base) {
      const p3 = `data:${base.mimeType};base64,${base.image}`;
      const r3 = await stepApiCall(p3, shoeImg);
      if (getCacheKey() !== cacheKey) { bgPregenRunning = false; return; }
      aiCache[cacheKey].full = r3;
      console.log('[Pre-gen] Full outfit cached!');
    }
  } catch (e) {
    console.warn('[Pre-gen] Error:', e.message);
  }
  bgPregenRunning = false;
}
