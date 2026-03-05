/* ===== StyleHub — Virtual Try-On x AI Styling x Local Stores ===== */

// ===================== CLOTHING DATA =====================
const CLOTHING = {
  tops: [
    { name: 'White T-shirt', img: 'images/tops/white_tee.jpg', price: 890 },
    { name: 'Striped Shirt', img: 'images/tops/striped_shirt.jpg', price: 1290 },
    { name: 'Black Hoodie', img: 'images/tops/black_hoodie.jpg', price: 1490 },
    { name: 'Red Flannel', img: 'images/tops/red_flannel.jpg', price: 1690 },
    { name: 'Navy Blazer', img: 'images/tops/navy_blazer.jpg', price: 3290 },
    { name: 'Denim Jacket', img: 'images/tops/denim_jacket.jpg', price: 2490 },
  ],
  bottoms: [
    { name: 'Blue Jeans', img: 'images/bottoms/blue_jeans.jpg', price: 1690 },
    { name: 'Khaki Pants', img: 'images/bottoms/khaki_pants.jpg', price: 1290 },
    { name: 'Black Skirt', img: 'images/bottoms/black_skirt.jpg', price: 1890 },
    { name: 'Joggers', img: 'images/bottoms/joggers.jpg', price: 990 },
  ],
  shoes: [
    { name: 'White Sneakers', img: 'images/shoes/white_sneakers.jpg', price: 3290 },
    { name: 'Black Boots', img: 'images/shoes/black_boots.jpg', price: 4290 },
    { name: 'Brown Oxford', img: 'images/shoes/brown_oxford.jpg', price: 3890 },
  ]
};

// ===================== MOCK STORE DATA =====================
const STORES = [
  { id: 1, name: 'Urban Style Co.', category: 'streetwear', rating: 4.8, reviews: 342, distance: 0.5, lat: 22.997, lng: 120.213, items: 128, styles: ['Street', 'Casual'], address: 'No. 45, Zhongshan Rd' },
  { id: 2, name: 'Classic Gentleman', category: 'formal', rating: 4.9, reviews: 215, distance: 0.8, lat: 22.994, lng: 120.207, items: 86, styles: ['Formal', 'Business'], address: 'No. 12, Minsheng Rd' },
  { id: 3, name: 'Seoul Fashion', category: 'korean', rating: 4.7, reviews: 567, distance: 1.2, lat: 23.001, lng: 120.220, items: 234, styles: ['Korean', 'Casual'], address: 'No. 78, Ximen Rd' },
  { id: 4, name: 'Tokyo Drift Wear', category: 'japanese', rating: 4.6, reviews: 189, distance: 1.8, lat: 22.990, lng: 120.200, items: 156, styles: ['Japanese', 'Minimalist'], address: 'No. 33, Dongning Rd' },
  { id: 5, name: 'Vintage Vault', category: 'vintage', rating: 4.5, reviews: 98, distance: 2.3, lat: 23.005, lng: 120.195, items: 67, styles: ['Vintage', 'Retro'], address: 'No. 5, Hai\'an Rd' },
  { id: 6, name: 'Daily Basics', category: 'casual', rating: 4.4, reviews: 421, distance: 2.8, lat: 22.985, lng: 120.225, items: 312, styles: ['Casual', 'Basic'], address: 'No. 156, Chenggong Rd' },
  { id: 7, name: 'Street Kings', category: 'streetwear', rating: 4.7, reviews: 278, distance: 3.5, lat: 23.010, lng: 120.230, items: 198, styles: ['Street', 'Hip-Hop'], address: 'No. 88, Beimen Rd' },
  { id: 8, name: 'Minimalist Lab', category: 'casual', rating: 4.8, reviews: 156, distance: 4.2, lat: 22.978, lng: 120.190, items: 89, styles: ['Minimalist', 'Modern'], address: 'No. 22, Anping Rd' },
];

// ===================== STATE =====================
let currentIndex = { tops: 0, bottoms: 0, shoes: 0 };
let currentMode = 'photo';
let cameraStream = null;
let personImageData = null;
let aiResultImages = [];
let preloadedBase64 = {};
let modelReady = false;
let currentPage = 'home';
let selectedRadius = 1;
let selectedStyles = [];

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
  initNavigation();
  renderCarousels();
  setupPhotoUpload();
  setupKeyboard();
  preloadImages();
  setupDragDrop();
  setupCompareSlider();
  renderStores();
  useDefaultModel();

  // Handle hash navigation
  const hash = window.location.hash.replace('#', '');
  if (hash && ['home', 'tryon', 'stores', 'stylist'].includes(hash)) {
    navigateTo(hash);
  }
});

// ===================== NAVIGATION =====================
function initNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      navigateTo(page);
    });
  });
}

function navigateTo(page) {
  currentPage = page;
  // Update nav links
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (activeLink) activeLink.classList.add('active');

  // Update pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const activePage = document.getElementById(`page-${page}`);
  if (activePage) activePage.classList.add('active');

  // Update URL hash
  window.location.hash = page;

  // Scroll to top
  window.scrollTo(0, 0);
}

// ===================== AUTH MODAL =====================
let authMode = 'login';

function openAuthModal(mode) {
  authMode = mode;
  const modal = document.getElementById('authModal');
  const title = document.getElementById('authTitle');
  const nameGroup = document.getElementById('authNameGroup');
  const submitBtn = document.getElementById('authSubmitBtn');
  const switchText = document.getElementById('authSwitchText');
  const switchLink = document.getElementById('authSwitchLink');

  if (mode === 'register') {
    title.textContent = 'Sign Up';
    nameGroup.style.display = 'flex';
    submitBtn.textContent = 'Create Account';
    switchText.textContent = 'Already have an account?';
    switchLink.textContent = 'Login';
  } else {
    title.textContent = 'Login';
    nameGroup.style.display = 'none';
    submitBtn.textContent = 'Login';
    switchText.textContent = "Don't have an account?";
    switchLink.textContent = 'Sign Up';
  }

  modal.classList.add('active');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('active');
}

function toggleAuthMode(e) {
  e.preventDefault();
  openAuthModal(authMode === 'login' ? 'register' : 'login');
}

// ===================== PRELOAD =====================
function preloadImages() {
  const allItems = [...CLOTHING.tops, ...CLOTHING.bottoms, ...CLOTHING.shoes];
  const imgs = allItems.map(item => item.img);
  imgs.push('images/model/model1.jpg');
  imgs.forEach(url => imageUrlToBase64(url));
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
    alert('Cannot start camera: ' + e.message);
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
  const total = top.price + bottom.price + shoe.price;
  document.getElementById('outfitTotal').textContent = `$${total.toLocaleString()}`;
}

// ===================== DRAG & DROP =====================
function setupDragDrop() {
  const dropZone = document.getElementById('dropZone');
  const overlay = document.getElementById('dropOverlay');

  document.addEventListener('dragstart', (e) => {
    const item = e.target.closest('[data-category]');
    if (!item) return;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify({
      category: item.dataset.category,
      index: parseInt(item.dataset.index)
    }));
    const dragImg = item.querySelector('img');
    if (dragImg) {
      e.dataTransfer.setDragImage(dragImg, 40, 40);
    }
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
    currentIndex[data.category] = data.index;
    renderCarousel(data.category);

    dropZone.style.boxShadow = '0 0 40px rgba(168,85,247,0.5)';
    setTimeout(() => { dropZone.style.boxShadow = ''; }, 600);

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
  document.getElementById('skelText').textContent = text || 'AI is styling you...';
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
    document.getElementById('autoIcon').textContent = '\u23F8';
    indicator.style.display = 'block';
    runAutoPlay();
  } else {
    btn.classList.remove('active');
    document.getElementById('autoIcon').textContent = '\u25B6';
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
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (currentPage !== 'tryon') return;
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
  if (!personImg) { alert('Please upload a photo or enable camera first'); return; }

  const topImg = preloadedBase64[CLOTHING.tops[currentIndex.tops].img];
  const bottomImg = preloadedBase64[CLOTHING.bottoms[currentIndex.bottoms].img];
  const shoeImg = preloadedBase64[CLOTHING.shoes[currentIndex.shoes].img];
  if (!topImg) { alert('Clothing images are still loading. Please try again in a few seconds.'); return; }

  const cacheKey = getCacheKey();

  if (aiCache[cacheKey] && aiCache[cacheKey].full) {
    const cached = aiCache[cacheKey];
    const best = cached.full;
    const src = `data:${best.mimeType};base64,${best.image}`;
    showCompareSlider(src);
    aiResultImages = [cached.full, cached.bottom, cached.top].filter(Boolean);
    return;
  }

  showSkeleton('AI is styling you...', 'Step 1/3 - Top');
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
      setStepActive(1, 'Synthesizing top...');
      result1 = await stepApiCall(personImg, topImg);
      aiCache[cacheKey].top = result1;
    }
    setStepDone(1);
    aiResultImages.push(result1);
    appendResultCard(result1, 'Top Complete', 0);
    showCompareSlider(`data:${result1.mimeType};base64,${result1.image}`);
    showSkeleton('AI is styling you...', 'Step 2/3 - Bottom');

    // STEP 2: Bottom
    const step1Person = `data:${result1.mimeType};base64,${result1.image}`;
    let result2 = aiCache[cacheKey].bottom;
    if (!result2 && bottomImg) {
      setStepActive(2, 'Synthesizing bottom...');
      try {
        result2 = await stepApiCall(step1Person, bottomImg);
        aiCache[cacheKey].bottom = result2;
      } catch (e) { result2 = null; }
    }
    if (result2) {
      setStepDone(2);
      aiResultImages.push(result2);
      appendResultCard(result2, 'Top + Bottom', 1);
      showCompareSlider(`data:${result2.mimeType};base64,${result2.image}`);
    } else setStepDone(2, true);
    showSkeleton('AI is styling you...', 'Step 3/3 - Shoes');

    // STEP 3: Shoes
    const step2Person = result2 ? `data:${result2.mimeType};base64,${result2.image}` : step1Person;
    let result3 = aiCache[cacheKey].full;
    if (!result3 && shoeImg) {
      setStepActive(3, 'Synthesizing shoes...');
      try {
        result3 = await stepApiCall(step2Person, shoeImg);
        aiCache[cacheKey].full = result3;
      } catch (e) { result3 = null; }
    }
    if (result3) {
      setStepDone(3);
      aiResultImages.push(result3);
      appendResultCard(result3, 'Full Outfit Complete!', 2);
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
  if (!response.ok || !data.success) throw new Error(data.error || data.detail || `API error (${response.status})`);
  if (!data.results || data.results.length === 0) throw new Error('API returned no results');
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
  if (aiResultImages[idx]) {
    const src = `data:${aiResultImages[idx].mimeType};base64,${aiResultImages[idx].image}`;
    showCompareSlider(src);
  }
}

// ===================== MODAL HELPERS =====================
function setStepActive(num, text) {
  document.getElementById(`step${num}`).className = 'step active';
  document.getElementById('aiLoadingText').textContent = text;
  document.getElementById('aiLoadingSubtext').textContent = `Step ${num}/3 - approximately 10-20 seconds`;
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

function showAiError(message) {
  document.getElementById('aiLoading').style.display = 'none';
  document.getElementById('aiError').style.display = 'flex';
  let help = message;
  if (message.includes('fetch') || message.includes('Failed')) {
    help = 'Cannot connect to the proxy server.\n\nPlease start it:\nnode server.js\n\nThen open http://localhost:8080';
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
  link.download = `stylehub-tryon-${Date.now()}.png`;
  link.click();
}

// ===================== CHAT ADJUSTMENT =====================
async function adjustWithPrompt() {
  const input = document.getElementById('chatInput');
  const prompt = input.value.trim();
  if (!prompt) return;

  if (!aiResultImages.length) {
    alert('Please run AI try-on first before entering adjustment commands');
    return;
  }

  addChatBubble(prompt, 'user');
  input.value = '';

  const currentResult = aiResultImages[selectedAiIndex || aiResultImages.length - 1];
  const resultBase64 = `data:${currentResult.mimeType};base64,${currentResult.image}`;

  showSkeleton('Adjusting...', `"${prompt}"`);

  try {
    const response = await fetch('/api/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultImage: resultBase64, prompt })
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Adjustment failed');

    hideSkeleton();

    if (data.results && data.results.length > 0) {
      const newResult = data.results[0];
      aiResultImages.push(newResult);
      const src = `data:${newResult.mimeType};base64,${newResult.image}`;
      showCompareSlider(src);
      addChatBubble('Done!', 'ai');
      adjustHistory.push({ prompt, result: newResult });
    }
  } catch (err) {
    hideSkeleton();
    addChatBubble(`Error: ${err.message}`, 'ai');
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
  if (!aiCache[cacheKey]) aiCache[cacheKey] = {};

  try {
    if (!aiCache[cacheKey].top) {
      const r1 = await stepApiCall(personImg, topImg);
      if (getCacheKey() !== cacheKey) { bgPregenRunning = false; return; }
      aiCache[cacheKey].top = r1;
    }

    const bottomImg = preloadedBase64[CLOTHING.bottoms[currentIndex.bottoms].img];
    if (bottomImg && !aiCache[cacheKey].bottom) {
      const p2 = `data:${aiCache[cacheKey].top.mimeType};base64,${aiCache[cacheKey].top.image}`;
      const r2 = await stepApiCall(p2, bottomImg);
      if (getCacheKey() !== cacheKey) { bgPregenRunning = false; return; }
      aiCache[cacheKey].bottom = r2;
    }

    const shoeImg = preloadedBase64[CLOTHING.shoes[currentIndex.shoes].img];
    const base = aiCache[cacheKey].bottom || aiCache[cacheKey].top;
    if (shoeImg && !aiCache[cacheKey].full && base) {
      const p3 = `data:${base.mimeType};base64,${base.image}`;
      const r3 = await stepApiCall(p3, shoeImg);
      if (getCacheKey() !== cacheKey) { bgPregenRunning = false; return; }
      aiCache[cacheKey].full = r3;
    }
  } catch (e) {
    console.warn('[Pre-gen] Error:', e.message);
  }
  bgPregenRunning = false;
}

// ===================== STORES PAGE =====================
function setRadius(radius) {
  selectedRadius = radius;
  document.querySelectorAll('.radius-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.radius) === radius);
  });
  filterStores();
}

function filterStores() {
  const category = document.getElementById('storeCategoryFilter').value;
  const sortBy = document.getElementById('storeSortBy').value;

  let filtered = STORES.filter(s => s.distance <= selectedRadius);
  if (category !== 'all') {
    filtered = filtered.filter(s => s.category === category);
  }

  if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);
  else if (sortBy === 'distance') filtered.sort((a, b) => a.distance - b.distance);
  else if (sortBy === 'popular') filtered.sort((a, b) => b.reviews - a.reviews);

  renderStoreList(filtered);
  renderMapDots(filtered);
}

function renderStores() {
  filterStores();
}

function renderStoreList(stores) {
  const list = document.getElementById('storeList');
  if (stores.length === 0) {
    list.innerHTML = `
      <div style="text-align:center;padding:40px 0;color:var(--text-dim)">
        <div style="font-size:32px;margin-bottom:12px">&#x1F50D;</div>
        <p>No stores found within ${selectedRadius}km.</p>
        <p style="font-size:12px;margin-top:8px">Try expanding your search radius.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = stores.map(s => `
    <div class="store-card" onclick="viewStore(${s.id})">
      <div class="store-card-header">
        <div class="store-name">${s.name}</div>
        <div class="store-distance">${s.distance}km</div>
      </div>
      <div class="store-rating">
        ${'&#x2605;'.repeat(Math.floor(s.rating))}${s.rating % 1 >= 0.5 ? '&#x2606;' : ''}
        <span style="color:var(--text-dim)">${s.rating} (${s.reviews} reviews)</span>
      </div>
      <div class="store-tags">
        ${s.styles.map(st => `<span class="store-tag">${st}</span>`).join('')}
      </div>
      <div class="store-meta">
        <span>${s.items} items</span>
        <span>${s.address}</span>
      </div>
      <div class="store-actions">
        <button class="store-btn" onclick="event.stopPropagation();navigateTo('tryon')">Try-On</button>
        <button class="store-btn store-btn-primary" onclick="event.stopPropagation()">View Store</button>
      </div>
    </div>
  `).join('');
}

function renderMapDots(stores) {
  const container = document.getElementById('mapDots');
  const radiusSize = Math.min(selectedRadius * 40, 200);

  let html = `
    <div class="map-center-dot"></div>
    <div class="map-radius-circle" style="width:${radiusSize * 2}px;height:${radiusSize * 2}px"></div>
  `;

  stores.forEach(s => {
    // Position dots based on relative distance from center
    const angle = Math.random() * Math.PI * 2;
    const dist = (s.distance / selectedRadius) * radiusSize * 0.8;
    const x = 50 + (Math.cos(angle) * dist / 5);
    const y = 50 + (Math.sin(angle) * dist / 5);

    html += `
      <div class="map-dot" style="top:${y}%;left:${x}%" onclick="viewStore(${s.id})">
        <div class="map-dot-label">${s.name}</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function viewStore(storeId) {
  const store = STORES.find(s => s.id === storeId);
  if (!store) return;
  alert(`Store: ${store.name}\nRating: ${store.rating}\nAddress: ${store.address}\nItems: ${store.items}\n\nFull store page coming soon!`);
}

// ===================== AI STYLIST PAGE =====================
function toggleStyleChip(el) {
  el.classList.toggle('active');
  const style = el.dataset.style;
  if (selectedStyles.includes(style)) {
    selectedStyles = selectedStyles.filter(s => s !== style);
  } else {
    selectedStyles.push(style);
  }
}

function getAiRecommendation() {
  const occasion = document.getElementById('stylistOccasion').value;
  const budgetMin = parseInt(document.getElementById('budgetMin').value) || 0;
  const budgetMax = parseInt(document.getElementById('budgetMax').value) || 10000;

  const query = `Recommend an outfit for ${occasion} occasion` +
    (selectedStyles.length > 0 ? `, style: ${selectedStyles.join(', ')}` : '') +
    `, budget: $${budgetMin}-$${budgetMax}`;

  addStylistMessage(query, 'user');
  generateRecommendation(occasion, selectedStyles, budgetMin, budgetMax);
}

function sendStylistMessage() {
  const input = document.getElementById('stylistInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addStylistMessage(text, 'user');

  // Simple keyword-based response
  setTimeout(() => {
    generateChatRecommendation(text);
  }, 500);
}

function addStylistMessage(text, type) {
  const chat = document.getElementById('stylistChat');
  const msg = document.createElement('div');
  msg.className = `chat-message ${type}`;
  msg.innerHTML = `
    <div class="chat-avatar">${type === 'ai' ? 'AI' : 'You'}</div>
    <div class="chat-content"><p>${text}</p></div>
  `;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function addStylistMessageHTML(html) {
  const chat = document.getElementById('stylistChat');
  const msg = document.createElement('div');
  msg.className = 'chat-message ai';
  msg.innerHTML = `
    <div class="chat-avatar">AI</div>
    <div class="chat-content">${html}</div>
  `;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function generateRecommendation(occasion, styles, budgetMin, budgetMax) {
  // Filter items by budget
  const allItems = [];
  const categories = ['tops', 'bottoms', 'shoes'];
  categories.forEach(cat => {
    CLOTHING[cat].forEach(item => {
      if (item.price >= budgetMin / 3 && item.price <= budgetMax / 2) {
        allItems.push({ ...item, category: cat });
      }
    });
  });

  // Pick one from each category
  const picks = {};
  categories.forEach(cat => {
    const catItems = CLOTHING[cat].filter(i => i.price <= budgetMax * 0.5);
    if (catItems.length > 0) {
      picks[cat] = catItems[Math.floor(Math.random() * catItems.length)];
    }
  });

  const total = Object.values(picks).reduce((s, p) => s + (p ? p.price : 0), 0);

  // Find matching store
  const matchingStores = STORES.filter(s => {
    if (styles.length === 0) return true;
    return s.styles.some(st => styles.some(sel => st.toLowerCase().includes(sel.toLowerCase())));
  }).sort((a, b) => b.rating - a.rating);

  const store = matchingStores[0] || STORES[0];

  let html = `<p>Based on your preferences, here's my recommendation for <strong>${occasion}</strong>:</p>`;
  html += '<div class="rec-cards">';

  Object.entries(picks).forEach(([cat, item]) => {
    if (!item) return;
    html += `
      <div class="rec-card" onclick="navigateToTryOn('${cat}', ${CLOTHING[cat].indexOf(item)})">
        <div class="rec-card-img"><img src="${item.img}" alt="${item.name}"></div>
        <div class="rec-card-name">${item.name}</div>
        <div class="rec-card-price">$${item.price.toLocaleString()}</div>
        <div class="rec-card-store">${store.name}</div>
      </div>
    `;
  });

  html += '</div>';
  html += `<p style="margin-top:12px">Total: <strong>$${total.toLocaleString()}</strong> | Available at <strong>${store.name}</strong> (${store.distance}km away, ${store.rating} rating)</p>`;
  html += `<p style="font-size:12px;color:var(--text-dim)">Click any item to try it on virtually!</p>`;

  addStylistMessageHTML(html);
}

function generateChatRecommendation(text) {
  const lower = text.toLowerCase();

  if (lower.includes('casual') || lower.includes('daily') || lower.includes('weekend') || lower.includes('brunch')) {
    generateRecommendation('daily', ['casual'], 0, 5000);
  } else if (lower.includes('formal') || lower.includes('work') || lower.includes('office') || lower.includes('business') || lower.includes('meeting')) {
    generateRecommendation('work', ['formal'], 0, 8000);
  } else if (lower.includes('date') || lower.includes('dinner') || lower.includes('romantic')) {
    generateRecommendation('date', [], 0, 6000);
  } else if (lower.includes('street') || lower.includes('hip') || lower.includes('urban')) {
    generateRecommendation('daily', ['street'], 0, 5000);
  } else if (lower.includes('party') || lower.includes('event') || lower.includes('club')) {
    generateRecommendation('party', [], 0, 7000);
  } else {
    addStylistMessage(
      "I'd be happy to help! Could you tell me more about the occasion? For example: casual daily wear, work/office, date night, street style, or a party? You can also set your preferences using the form on the left.",
      'ai'
    );
  }
}

function navigateToTryOn(category, index) {
  currentIndex[category] = index;
  navigateTo('tryon');
  renderCarousel(category);
}

// ===================== STORE API =====================
// API endpoint for stores (used when backend is available)
async function fetchStores() {
  try {
    const response = await fetch(`/api/stores?radius=${selectedRadius}`);
    if (response.ok) {
      const data = await response.json();
      if (data.stores) return data.stores;
    }
  } catch (e) {
    // Fall back to mock data
  }
  return null;
}
