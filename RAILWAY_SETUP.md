# Railway Setup Guide

## Quick Setup Steps

### 1. Deploy from GitHub (Recommended)

1. Push your code to GitHub:
```bash
git add .
git commit -m "Initial commit: PDF Generator API"
git push origin main
```

2. Go to [railway.app](https://railway.app) and login

3. Click "New Project" → "Deploy from GitHub repo"

4. Select your repository: `Zhihong0321/pdf-gen`

5. Railway will auto-detect Node.js and deploy automatically

### 2. Environment Variables (Required)

After deployment, you MUST set this variable in Railway dashboard:

**Go to:** Project → Your Service → Variables → Add New Variable

```
BASE_URL = https://your-project-name.up.railway.app
```

- Replace `your-project-name` with your actual Railway project name
- You can find your project URL in the Railway dashboard (click the domain link)

### 3. No Build Configuration Needed

Railway automatically detects Node.js projects and uses the `Procfile`:
- The `Procfile` tells Railway to run: `web: npm start`
- The `package.json` has the start script: `"start": "node server.js"`
- No build settings required in railway.toml

### 4. Verify Deployment

1. Click "View Logs" in Railway to see server startup
2. Look for: `PDF Generator API running on port 3000`
3. Test health endpoint: `https://your-project.up.railway.app/health`

## Railway Configuration Files

### Current Files (No changes needed):

**Procfile** (tells Railway what to run):
```
web: npm start
```

**railway.toml** (health check configuration):
```toml
[deploy]
healthcheckPath = "/health"
```

**package.json** (Node.js configuration):
```json
{
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "start": "node server.js"
  }
}
```

## Environment Variables Checklist

### Required (You must set manually):
- ✅ **BASE_URL**: Your Railway app URL
  - Example: `https://pdf-gen-production.up.railway.app`
  - Where to set: Project → Service → Variables → Add Variable

### Automatic (Railway sets these):
- ✅ **NODE_ENV**: Automatically set to "production"
- ✅ **PORT**: Automatically assigned by Railway

## Testing After Deployment

### 1. Health Check
```bash
curl https://your-project.up.railway.app/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-01-02T..."}
```

### 2. Generate PDF
```bash
curl -X POST https://your-project.up.railway.app/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<html><body><h1>Test PDF</h1></body></html>",
    "options": {"format": "A4"}
  }'
```

## Common Issues & Solutions

### Issue: "Cannot find module" errors
**Solution:** Railway auto-installs dependencies from package.json. Wait for build to complete.

### Issue: Download URL returns 404
**Solution:** Make sure `BASE_URL` environment variable is set correctly in Railway dashboard.

### Issue: Health check fails
**Solution:** Check Railway logs. Common issue: Puppeteer Chrome download taking time on first deploy.

### Issue: Memory issues during PDF generation
**Solution:**
- Go to Project → Service → Settings
- Increase RAM limit (e.g., from 512MB to 1GB)
- Click "Redeploy"

## Scaling (Optional)

### Auto-scaling
Railway automatically scales based on traffic. No manual configuration needed.

### Manual Scaling
If you need guaranteed resources:
1. Go to Project → Service → Settings
2. Click "Advanced" → "Change Plan"
3. Choose appropriate tier

## Monitoring

### View Logs
- Railway Dashboard → Project → Logs tab
- See real-time server activity

### Metrics
- Railway Dashboard → Project → Metrics tab
- Monitor CPU, RAM, and response times

## Updating Your App

### Method 1: Automatic (Recommended)
1. Make code changes
2. Commit and push to GitHub
3. Railway automatically rebuilds and deploys

### Method 2: Manual Deploy
```bash
npm install -g @railway/cli
railway login
railway up
```

## Cost Management

### Free Tier (Current)
- 512MB RAM included
- $5 free monthly credits
- Sufficient for development and light usage

### Production Tips
- Monitor usage in Railway dashboard
- Consider paid tier for high traffic
- Set up budget alerts in Railway settings

## Quick Reference

**Dashboard:** https://railway.app
**Your Project:** https://railway.app/project/your-project-id
**Health Endpoint:** `https://your-app.up.railway.app/health`
**API Endpoint:** `https://your-app.up.railway.app/api/generate-pdf`

## Support

- Railway Docs: https://docs.railway.app
- Project Docs: See AGENTS.md for API usage
- Troubleshooting: Check Railway logs first

---

**Summary:** Just push to GitHub, deploy from Railway dashboard, and set the `BASE_URL` environment variable. Everything else is automatic!
