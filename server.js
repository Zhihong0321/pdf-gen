const express = require('express');
const puppeteer = require('puppeteer-core');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all subdomains of atap.solar
    if (origin.endsWith('.atap.solar')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create PDFs directory if it doesn't exist
const PDF_DIR = path.join(__dirname, 'pdfs');
if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

// Launch browser once and reuse
let browser;

// Debug: Store last request for troubleshooting
let lastRequest = {
  timestamp: null,
  html: null,
  baseUrl: null,
  htmlLength: 0,
  hasImages: false,
  imageTags: [],
  headers: {},
  body: null,
  imageLoadStatus: null,
  curlCommand: null,
  userAgent: null
};

async function initBrowser() {
  const isProduction = process.env.RAILWAY_ENVIRONMENT !== undefined;
  
  if (isProduction) {
    // Use system Chromium in Railway Docker container
    const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
    browser = await puppeteer.launch({
      executablePath: chromiumPath,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
  } else {
    // Use local Chrome in development
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint to view last request
app.get('/api/debug/last-request', (req, res) => {
  if (!lastRequest.timestamp) {
    return res.json({
      message: 'No PDF requests received yet',
      hint: 'Make a POST request to /api/generate-pdf first'
    });
  }

  res.json({
    lastRequest: {
      timestamp: lastRequest.timestamp,
      htmlLength: lastRequest.htmlLength,
      html: lastRequest.html, // FULL HTML - no truncation
      baseUrl: lastRequest.baseUrl,
      hasImages: lastRequest.hasImages,
      imageTags: lastRequest.imageTags,
      headers: lastRequest.headers,
      body: lastRequest.body,
      imageLoadStatus: lastRequest.imageLoadStatus, // Full image load details
      curlCommand: lastRequest.curlCommand, // Reproducible test command
      userAgent: lastRequest.userAgent
    },
    diagnosis: {
      imagesFound: lastRequest.hasImages,
      imageCount: lastRequest.imageTags.length,
      baseUrlProvided: !!lastRequest.baseUrl,
      imagesLoaded: lastRequest.imageLoadStatus ? lastRequest.imageLoadStatus.filter(img => img.loaded).length : 0,
      imagesFailed: lastRequest.imageLoadStatus ? lastRequest.imageLoadStatus.filter(img => !img.loaded).length : 0,
      likelyIssue: diagnoseIssue(lastRequest)
    },
    note: 'FULL HTML and request details are now available for complete investigation'
  });
});

// Helper function to diagnose common issues
function diagnoseIssue(req) {
  if (!req.hasImages) return 'No images in HTML';
  if (!req.baseUrl) return 'baseUrl NOT PROVIDED - relative image paths will fail';
  if (!req.imageLoadStatus) return 'Image load status not available';
  
  const failedImages = req.imageLoadStatus.filter(img => !img.loaded);
  if (failedImages.length === 0) return 'All images loaded successfully';
  
  // Check for common issues
  for (let img of failedImages) {
    if (!img.src.startsWith('http') && !img.src.startsWith('https')) {
      return 'Relative image path without baseUrl or baseUrl not working';
    }
    if (img.naturalWidth === 0 && img.naturalHeight === 0) {
      return 'Image failed to load (CORS, 404, or network error)';
    }
  }
  
  return 'Unknown issue - check image URLs and CORS settings';
}

// PDF generation endpoint
app.post('/api/generate-pdf', async (req, res) => {
  const { html, options = {}, baseUrl } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML content is required' });
  }

  // Debug: Store last request details - FULL CONTENT
  const requestTimestamp = new Date().toISOString();
  const imageTags = html.match(/<img[^>]+>/g) || [];
  
  // Generate equivalent curl command
  const curlCommand = `curl -X POST ${req.protocol}://${req.get('host')}/api/generate-pdf \\
  -H "Content-Type: application/json" \\
  -H "User-Agent: ${req.get('user-agent') || 'unknown'}" \\
  -d '{
    "html": "${html.substring(0, 200)}...",
    "baseUrl": "${baseUrl || 'NOT PROVIDED'}",
    "options": ${JSON.stringify(options)}
  }'`;

  lastRequest = {
    timestamp: requestTimestamp,
    html: html, // FULL HTML stored
    baseUrl: baseUrl,
    htmlLength: html.length,
    hasImages: html.includes('<img'),
    imageTags: imageTags,
    headers: {
      'content-type': req.get('content-type'),
      'user-agent': req.get('user-agent'),
      'host': req.get('host'),
      'content-length': req.get('content-length')
    },
    body: { html, options, baseUrl }, // Full request body
    imageLoadStatus: null, // Will be populated after loading
    curlCommand: curlCommand,
    userAgent: req.get('user-agent')
  };

  console.log('\n=== PDF Generation Request ===');
  console.log('Time:', requestTimestamp);
  console.log('HTML Length:', html.length, 'characters');
  console.log('Base URL:', baseUrl || 'NOT PROVIDED');
  console.log('Has Images:', lastRequest.hasImages);
  console.log('Image Tags Found:', imageTags.length);
  if (imageTags.length > 0) {
    imageTags.forEach((tag, i) => {
      console.log(`  Image ${i + 1}:`, tag);
    });
  }
  console.log('Request Headers:', JSON.stringify(lastRequest.headers, null, 2));
  console.log('\n=== Equivalent CURL Command ===');
  console.log(curlCommand);

  const pdfId = uuidv4();
  const pdfPath = path.join(PDF_DIR, `${pdfId}.pdf`);

  try {
    const page = await browser.newPage();
    
    // Enable console/error logging from the page
    page.on('console', msg => console.log('Browser Console:', msg.text()));
    page.on('pageerror', error => console.error('Browser Error:', error.message));
    
    // Set content with base URL for relative image paths
    await page.setContent(html, {
      url: baseUrl || 'about:blank',
      waitUntil: ['networkidle0', 'load', 'domcontentloaded'],
      timeout: 30000
    });

    // Debug: Check if images loaded
    const imagesLoaded = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.map(img => ({
        src: img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete,
        error: img.error ? 'FAILED' : 'OK',
        loaded: img.complete && img.naturalWidth > 0 && img.naturalHeight > 0
      }));
    });
    
    // Store image load status
    lastRequest.imageLoadStatus = imagesLoaded;
    
    console.log('\n=== Image Load Status ===');
    console.log('Total Images:', imagesLoaded.length);
    imagesLoaded.forEach((img, i) => {
      console.log(`  Image ${i + 1}:`);
      console.log(`    src: ${img.src}`);
      console.log(`    Dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
      console.log(`    Complete: ${img.complete}`);
      console.log(`    Loaded: ${img.loaded}`);
      console.log(`    Status: ${img.error}`);
    });

    // PDF generation options
    const pdfOptions = {
      path: pdfPath,
      format: options.format || 'A4',
      margin: options.margin || {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      },
      printBackground: options.printBackground !== false,
      preferCSSPageSize: options.preferCSSPageSize || false
    };

    // Generate PDF
    await page.pdf(pdfOptions);
    await page.close();

    // Generate download URL
    const apiBaseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const downloadUrl = `${apiBaseUrl}/api/download/${pdfId}`;

    // Schedule cleanup (delete PDF after 5 minutes)
    setTimeout(() => {
      try {
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
          console.log(`Cleaned up PDF: ${pdfId}`);
        }
      } catch (err) {
        console.error(`Error cleaning up PDF ${pdfId}:`, err);
      }
    }, 5 * 60 * 1000); // 5 minutes

    res.json({
      success: true,
      pdfId,
      downloadUrl,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    
    // Clean up if error occurred
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
    
    res.status(500).json({
      error: 'Failed to generate PDF',
      message: error.message
    });
  }
});

// Download endpoint
app.get('/api/download/:pdfId', (req, res) => {
  const { pdfId } = req.params;
  const pdfPath = path.join(PDF_DIR, `${pdfId}.pdf`);

  if (!fs.existsSync(pdfPath)) {
    return res.status(404).json({ error: 'PDF not found or has expired' });
  }

  res.download(pdfPath, `document-${pdfId}.pdf`, (err) => {
    if (err) {
      console.error('Download error:', err);
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'PDF Generator API',
    endpoints: {
      health: 'GET /health',
      debug: 'GET /api/debug/last-request',
      generate: 'POST /api/generate-pdf',
      download: 'GET /api/download/:pdfId'
    },
    usage: {
      generate: {
        method: 'POST',
        url: '/api/generate-pdf',
        body: {
          html: '<html><body><h1>Hello World</h1></body></html>',
          baseUrl: 'https://your-domain.com',
          options: {
            format: 'A4',
            printBackground: true,
            margin: {
              top: '1cm',
              right: '1cm',
              bottom: '1cm',
              left: '1cm'
            }
          }
        }
      }
    }
  });
});

// Initialize server
async function startServer() {
  await initBrowser();
  
  app.listen(PORT, () => {
    console.log(`PDF Generator API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

startServer().catch(console.error);
