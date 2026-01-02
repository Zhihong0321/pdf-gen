# PDF Generator API Server

A RESTful API service that converts HTML to PDF using Puppeteer and Express, deployed on Railway.

## Features

- Convert HTML to PDF with customizable options
- Automatic PDF cleanup (expires after 5 minutes)
- Downloadable PDF links
- CORS enabled
- Health check endpoint
- Railway deployment ready

## API Endpoints

### Generate PDF
```http
POST /api/generate-pdf
Content-Type: application/json

{
  "html": "<html><body><h1>Hello World</h1></body></html>",
  "options": {
    "format": "A4",
    "printBackground": true,
    "margin": {
      "top": "1cm",
      "right": "1cm",
      "bottom": "1cm",
      "left": "1cm"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "pdfId": "550e8400-e29b-41d4-a716-446655440000",
  "downloadUrl": "http://your-app.railway.app/api/download/550e8400-e29b-41d4-a716-446655440000",
  "expiresAt": "2026-01-02T12:05:00.000Z"
}
```

### Download PDF
```http
GET /api/download/:pdfId
```

### Health Check
```http
GET /health
```

## PDF Options

- `format`: Paper format (default: "A4")
  - Available: A4, Letter, Legal, Tabloid, etc.
- `printBackground`: Print background graphics (default: true)
- `margin`: Page margins (default: 1cm on all sides)
- `preferCSSPageSize`: Prefer CSS page size (default: false)

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

The server will be available at `http://localhost:3000`

## Railway Deployment

### Deploy via Railway CLI

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Initialize project:
```bash
railway init
```

4. Deploy:
```bash
railway up
```

### Deploy via GitHub

1. Push your code to a GitHub repository
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect Node.js and deploy

### Environment Variables on Railway

Set these in Railway dashboard:

- `NODE_ENV`: production (auto-set)
- `PORT`: (Railway auto-sets this)
- `BASE_URL`: Your Railway app URL (e.g., `https://your-app.railway.app`)

## Usage Example

### Using cURL
```bash
curl -X POST http://localhost:3000/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<html><body><h1>Hello World</h1><p>This is a test PDF.</p></body></html>",
    "options": {
      "format": "A4",
      "printBackground": true
    }
  }'
```

### Using JavaScript (fetch)
```javascript
const response = await fetch('http://localhost:3000/api/generate-pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    html: '<html><body><h1>Hello World</h1></body></html>',
    options: { format: 'A4' }
  })
});

const { downloadUrl } = await response.json();
window.open(downloadUrl);
```

### Using Python (requests)
```python
import requests

response = requests.post('http://localhost:3000/api/generate-pdf', json={
    'html': '<html><body><h1>Hello World</h1></body></html>',
    'options': {'format': 'A4'}
})

data = response.json()
print(f"Download URL: {data['downloadUrl']}")
```

## Documentation for AI Teams

If you're an AI coding team or need to provide API documentation to AI agents, read **[AGENTS.md](AGENTS.md)**. This file contains comprehensive API documentation specifically designed for AI to understand and integrate with this service.

## Notes

- PDFs are automatically deleted after 5 minutes
- Maximum HTML size: 10MB
- Default timeout: 30 seconds
- Puppeteer runs in headless mode
- PDFs support CSS styling and JavaScript rendering

## Troubleshooting

### Railway Deployment Issues
- Ensure Node.js version >= 18.0.0
- Check build logs for dependency installation
- Verify environment variables are set correctly

### PDF Generation Fails
- Check HTML is valid
- Reduce HTML complexity if timeout occurs
- Verify memory limits in Railway settings
