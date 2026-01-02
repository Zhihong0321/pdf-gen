const express = require('express');
const puppeteer = require('puppeteer');
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

async function initBrowser() {
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// PDF generation endpoint
app.post('/api/generate-pdf', async (req, res) => {
  const { html, options = {} } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML content is required' });
  }

  const pdfId = uuidv4();
  const pdfPath = path.join(PDF_DIR, `${pdfId}.pdf`);

  try {
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
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
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const downloadUrl = `${baseUrl}/api/download/${pdfId}`;

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
      generate: 'POST /api/generate-pdf',
      download: 'GET /api/download/:pdfId'
    },
    usage: {
      generate: {
        method: 'POST',
        url: '/api/generate-pdf',
        body: {
          html: '<html><body><h1>Hello World</h1></body></html>',
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
