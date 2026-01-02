# Railway Deployment Guide

This guide will walk you through deploying your PDF Generator API to Railway.

## Prerequisites

- Railway account (free at [railway.app](https://railway.app))
- Git installed and configured
- GitHub account

## Option 1: Deploy via Railway CLI (Recommended)

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

This will open a browser window to authenticate.

### Step 3: Initialize Railway Project

```bash
cd E:\pdf-gen
railway init
```

Follow the prompts to create a new project or select an existing one.

### Step 4: Deploy

```bash
railway up
```

Railway will:
- Detect your Node.js application
- Install dependencies
- Build and deploy your app
- Provide a live URL

### Step 5: Set Environment Variables

After deployment, set the BASE_URL:

```bash
railway variables set BASE_URL=https://your-app-name.railway.app
```

Replace `your-app-name` with your actual Railway project name.

### Step 6: Verify Deployment

```bash
railway logs
```

Check that the server started successfully. Look for:
```
PDF Generator API running on port 3000
```

Test the health endpoint:
```bash
railway open
```

This opens your Railway project in the browser. Add `/health` to the URL to test.

## Option 2: Deploy via GitHub

### Step 1: Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit: PDF Generator API"
git branch -M main
git remote add origin https://github.com/your-username/pdf-gen.git
git push -u origin main
```

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will automatically detect and configure your Node.js app

### Step 3: Configure Environment Variables

1. Go to your project settings in Railway
2. Click "Variables" tab
3. Add `BASE_URL` with your Railway app URL
   - Example: `https://pdf-generator-api-production.up.railway.app`

### Step 4: Deploy

Railway will automatically deploy when you push to GitHub.

## Configuration Files

Your project includes these Railway-specific files:

### `railway.toml`
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### `Procfile`
```
web: npm start
```

### `.gitignore`
Excludes:
- `node_modules/` (dependencies installed during build)
- `pdfs/` (temporary PDF storage)
- `.env` (secrets managed by Railway)

## Environment Variables

Railway automatically sets:
- `PORT`: Available via process.env.PORT
- `NODE_ENV`: Set to "production"

Manual configuration needed:
- `BASE_URL`: Your Railway app URL (e.g., `https://your-app.railway.app`)

## Scaling

Railway automatically scales your app based on traffic:
- **Free tier**: Starts with 512MB RAM
- **Paid plans**: Scale up as needed

To adjust resources:
1. Go to your project in Railway
2. Select your service
3. Click "Settings" → "Build & Deploy"
4. Adjust RAM/CPU limits

## Monitoring

### View Logs

```bash
railway logs
```

Or via Railway dashboard:
1. Select your project
2. Click "Logs" tab

### Health Check

Your app includes a health endpoint:
```
https://your-app.railway.app/health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2026-01-02T12:00:00.000Z"
}
```

## Testing Your Deployed API

### Using cURL

```bash
curl -X POST https://your-app.railway.app/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<html><body><h1>Hello from Railway!</h1></body></html>",
    "options": {
      "format": "A4",
      "printBackground": true
    }
  }'
```

### Using JavaScript

```javascript
const response = await fetch('https://your-app.railway.app/api/generate-pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    html: '<html><body><h1>Hello from Railway!</h1></body></html>',
    options: { format: 'A4' }
  })
});

const { downloadUrl } = await response.json();
window.open(downloadUrl);
```

## Troubleshooting

### Build Fails

**Issue:** Dependencies installation fails

**Solution:**
- Check Node.js version in `package.json` (>= 18.0.0)
- Review build logs for specific errors
- Ensure `railway.toml` and `Procfile` are present

### App Crashes on Startup

**Issue:** Puppeteer fails to launch

**Solution:**
- Railway includes required Chrome dependencies
- Check that `puppeteer` version is compatible (22.15.0)
- Review logs for specific error messages

### PDF Generation Timeout

**Issue:** PDF generation takes too long

**Solution:**
- Reduce HTML complexity
- Increase Railway service resources (RAM/CPU)
- Increase timeout in `server.js` if needed

### Download URL Not Working

**Issue:** PDF download fails

**Solution:**
- Ensure `BASE_URL` environment variable is set correctly
- Check that PDF exists (hasn't expired - 5 minutes)
- Verify Railway logs for errors

## Cost Optimization

**Free Tier Tips:**
- Use server will sleep when idle
- First request after wake-up may be slower
- Suitable for development/testing

**Production Tips:**
- Enable auto-scaling for production
- Set up monitoring for performance
- Consider dedicated plans for high traffic

## Custom Domain (Optional)

To use your own domain:

1. In Railway project, go to "Settings" → "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `pdf-api.yourdomain.com`)
4. Update DNS records as instructed by Railway
5. Update `BASE_URL` to your custom domain

## Updates and Deployments

### Update Code

```bash
railway up
```

This will rebuild and redeploy with latest changes.

### Rollback

In Railway dashboard:
1. Go to "Deployments" tab
2. Find previous deployment
3. Click "Redeploy"

## Support

- Railway Documentation: https://docs.railway.app
- Railway Community: https://community.railway.app
- This Project: Check README.md for API usage

## Quick Reference

```bash
# Initialize project
railway init

# Deploy
railway up

# View logs
railway logs

# Open in browser
railway open

# Set environment variable
railway variables set KEY=VALUE

# List variables
railway variables list

# Delete variable
railway variables rm KEY
```
