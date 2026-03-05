/**
 * ClosetSwipe — Vertex AI Virtual Try-On Proxy Server
 * 
 * Usage:
 *   1. npm install
 *   2. gcloud auth login
 *   3. GCP_PROJECT_ID=your-project GCP_REGION=us-central1 node server.js
 *   4. Open http://localhost:3000
 */

const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuration ---
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'tryon-488608';
const GCP_REGION = process.env.GCP_REGION || 'us-central1';
const MODEL_ID = 'virtual-try-on-001';

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// --- Admin Panel ---
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// --- API Routes: Merchant, Product, Order, AI Agent ---
app.use('/api/merchants', require('./src/routes/merchants'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/categories', require('./src/routes/categories'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/ai-agents', require('./src/routes/ai-agent'));

// --- Helper: Get GCloud Access Token ---
function getAccessToken() {
  // Try multiple possible gcloud paths
  const gcloudPaths = [
    'gcloud',
    '/tmp/google-cloud-sdk/bin/gcloud',
    '/opt/homebrew/bin/gcloud',
    '/usr/local/bin/gcloud',
    process.env.HOME + '/google-cloud-sdk/bin/gcloud',
  ];

  for (const gcloudPath of gcloudPaths) {
    try {
      const token = execSync(`CLOUDSDK_PYTHON=/opt/homebrew/bin/python3.12 "${gcloudPath}" auth print-access-token 2>/dev/null`, {
        encoding: 'utf-8',
        timeout: 10000
      }).trim();
      if (token && token.startsWith('ya29.')) return token;
    } catch (_) {}
  }

  throw new Error(
    'Failed to get gcloud access token. Run: gcloud auth login && gcloud config set project tryon-488608'
  );
}

// --- API: Virtual Try-On (supports multiple product images) ---
app.post('/api/try-on', async (req, res) => {
  try {
    const { personImage, productImage, productImages, sampleCount = 1 } = req.body;

    // Support both single productImage and array productImages
    let products = [];
    if (productImages && Array.isArray(productImages)) {
      products = productImages;
    } else if (productImage) {
      products = [productImage];
    }

    if (!personImage || products.length === 0) {
      return res.status(400).json({
        error: '需要提供 personImage 和至少一張 productImage（base64 編碼）'
      });
    }

    const personBase64 = personImage.replace(/^data:image\/\w+;base64,/, '');
    const accessToken = getAccessToken();
    const url = `https://${GCP_REGION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_REGION}/publishers/google/models/${MODEL_ID}:predict`;

    // Build product images array
    const productImagesPayload = products.map(p => ({
      image: { bytesBase64Encoded: p.replace(/^data:image\/\w+;base64,/, '') }
    }));

    const requestBody = {
      instances: [
        {
          personImage: {
            image: { bytesBase64Encoded: personBase64 }
          },
          productImages: productImagesPayload
        }
      ],
      parameters: {
        sampleCount: Math.min(Math.max(sampleCount, 1), 4),
        baseSteps: 32,
        personGeneration: 'allow_all',
        outputOptions: { mimeType: 'image/png' }
      }
    };

    const totalProductKB = products.reduce((s, p) => s + p.replace(/^data:image\/\w+;base64,/, '').length / 1024, 0);
    console.log(`[Try-On] Calling Vertex AI (${GCP_REGION})...`);
    console.log(`[Try-On] Person: ${(personBase64.length / 1024).toFixed(0)}KB, Products: ${products.length} items (${totalProductKB.toFixed(0)}KB total)`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Try-On] API Error ${response.status}:`, errorText);
      return res.status(response.status).json({
        error: `Vertex AI API error: ${response.status}`,
        detail: errorText
      });
    }

    const data = await response.json();
    console.log(`[Try-On] Success! ${data.predictions?.length || 0} result(s)`);

    const results = (data.predictions || []).map(p => ({
      mimeType: p.mimeType || 'image/png',
      image: p.bytesBase64Encoded
    }));

    res.json({ success: true, results });

  } catch (err) {
    console.error('[Try-On] Error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// --- POST /api/adjust — Text-guided image adjustment via Gemini ---
app.post('/api/adjust', async (req, res) => {
  try {
    const { resultImage, prompt } = req.body;
    if (!resultImage || !prompt) {
      return res.status(400).json({ success: false, error: '需要 resultImage 和 prompt' });
    }

    console.log(`[Adjust] Prompt: "${prompt}"`);
    const token = getAccessToken();

    // Extract base64 from data URL
    const base64Data = resultImage.replace(/^data:image\/\w+;base64,/, '');

    // Use Imagen 3.0 Capability for image editing
    const endpoint = `https://${GCP_REGION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_REGION}/publishers/google/models/imagen-3.0-capability-001:predict`;

    const requestBody = {
      instances: [{
        prompt: `A person wearing the outfit shown in reference [1], but with this modification: ${prompt}. Keep the same person and pose.`,
        referenceImages: [{
          referenceType: 'REFERENCE_TYPE_RAW',
          referenceId: 1,
          referenceImage: {
            bytesBase64Encoded: base64Data,
            mimeType: 'image/png'
          }
        }]
      }],
      parameters: {
        sampleCount: 1,
        personGeneration: 'allow_all',
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    // Extract image from Imagen response
    if (data.predictions && data.predictions.length > 0) {
      const results = data.predictions.map(p => ({
        image: p.bytesBase64Encoded,
        mimeType: p.mimeType || 'image/png'
      }));
      console.log(`[Adjust] Success! ${results.length} result(s)`);
      return res.json({ success: true, results });
    } else if (data.error) {
      console.error('[Adjust] API Error:', JSON.stringify(data.error));
      return res.status(500).json({ success: false, error: data.error.message || 'Imagen API Error' });
    } else {
      console.error('[Adjust] No predictions:', JSON.stringify(data).substring(0, 300));
      return res.status(500).json({ success: false, error: '沒有回傳結果' });
    }
  } catch (err) {
    console.error('[Adjust] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Health check ---
app.get('/api/health', (req, res) => {
  let gcpOk = false;
  try { getAccessToken(); gcpOk = true; } catch (_) {}

  res.json({
    status: 'ok',
    gcp: { authenticated: gcpOk, project: GCP_PROJECT_ID, region: GCP_REGION, model: MODEL_ID }
  });
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`\n🎨 ClosetSwipe server at http://localhost:${PORT}\n`);
  console.log(`   Project: ${GCP_PROJECT_ID} | Region: ${GCP_REGION} | Model: ${MODEL_ID}\n`);
  if (GCP_PROJECT_ID === 'YOUR_PROJECT_ID') {
    console.log('   ⚠️  Set GCP_PROJECT_ID: GCP_PROJECT_ID=my-project node server.js\n');
  }
});
