# Vercel Deployment Guide for AttendX Backend

## 📋 Prerequisites

- Vercel account (sign up at vercel.com)
- GitHub repository with your code
- MongoDB Atlas database

---

## 🚀 Deployment Steps

### 1. Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### 2. Push Code to GitHub

```bash
git add .
git commit -m "Add Vercel serverless configuration"
git push origin main
```

### 3. Deploy on Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository: `AttendX-FYP-Project`
4. Configure project settings:
   - **Framework Preset:** Other
   - **Root Directory:** `./` (leave empty if backend is in root)
   - **Build Command:** Leave empty
   - **Output Directory:** Leave empty

#### Option B: Via CLI

```bash
cd "D:\University files\Programming\MERN Projects\NewTry\AttendX"
vercel
```

### 4. Add Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

```env
# Database
MONGODB_URI=your_mongodb_atlas_connection_string

# Frontend URL (Update after frontend deployment)
CLIENT_URL=https://your-frontend-domain.vercel.app

# JWT Secrets (Use strong random strings)
JWT_ACCESS_SECRET=your_super_secret_access_token_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_token_key_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# QR Token Secret
QR_SECRET=your_super_secret_qr_token_key_here

# Admin Bootstrap Secret
ADMIN_SECRET=attendx_super_admin_2025

# Cookie Configuration
COOKIE_SECURE=true
COOKIE_SAME_SITE=none

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Node Environment
NODE_ENV=production
```

**Important:**

- Set `COOKIE_SECURE=true` for HTTPS
- Set `COOKIE_SAME_SITE=none` for cross-origin cookies
- Change all secrets from defaults to strong random strings

### 5. Deploy

Click **"Deploy"** button in Vercel dashboard.

---

## 🔧 Configuration Files Created

### 1. `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

### 2. Modified `server.js`

- Added `export default app` for serverless
- Conditional `app.listen()` for local development
- Works both locally and on Vercel

---

## ✅ Post-Deployment Checklist

### 1. Test API Endpoints

```bash
# Health check
curl https://your-backend.vercel.app/health

# Expected response:
{
  "success": true,
  "message": "AttendX Server is running",
  "timestamp": "2025-11-28T..."
}
```

### 2. Update Frontend

In `frontend/.env`:

```env
VITE_API_BASE_URL=https://your-backend.vercel.app/api/v1
```

### 3. Update Backend CORS

The backend already includes your frontend URL in CORS config. After frontend deployment, update `CLIENT_URL` environment variable in Vercel.

### 4. Test Critical Flows

- ✅ Login/Register
- ✅ Create class
- ✅ Start session
- ✅ Mark attendance
- ✅ Create admin (`/create-admin`)

---

## 🐛 Troubleshooting

### Issue: 500 Internal Server Error

**Cause:** Environment variables not set  
**Fix:** Add all required env vars in Vercel dashboard

### Issue: CORS Error

**Cause:** `CLIENT_URL` mismatch  
**Fix:** Update `CLIENT_URL` to match frontend domain

### Issue: MongoDB Connection Failed

**Cause:** MongoDB Atlas IP whitelist  
**Fix:** In MongoDB Atlas, add `0.0.0.0/0` to allow all IPs (or add Vercel IPs)

### Issue: Session/Cookies Not Working

**Cause:** Cookie settings  
**Fix:** Ensure `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none`

### Issue: File Upload Fails

**Cause:** Serverless has limited temp storage  
**Fix:** Cloudinary uploads should work (already configured)

---

## 📊 Vercel Features You Get

- ✅ **Automatic HTTPS** (free SSL certificate)
- ✅ **Global CDN** (fast worldwide)
- ✅ **Auto-scaling** (handles traffic spikes)
- ✅ **Zero-downtime deployments** (blue-green deployment)
- ✅ **Preview deployments** (for every git push)
- ✅ **Environment variables** (per environment)
- ✅ **Logs & Analytics** (in dashboard)

---

## 🔐 Security Recommendations

### 1. Change All Secrets

Generate strong random secrets:

```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 2. Restrict CORS

Update `CLIENT_URL` to exact frontend domain (not wildcard).

### 3. Enable Rate Limiting

Consider adding `express-rate-limit` for API protection.

### 4. MongoDB Security

- Use strong password
- Enable IP whitelist
- Enable audit logs

---

## 📝 Your Deployment URLs

After deployment, you'll get:

- **Production:** `https://your-backend.vercel.app`
- **API Base:** `https://your-backend.vercel.app/api/v1`
- **Health Check:** `https://your-backend.vercel.app/health`

Save these URLs for frontend configuration!

---

## 🎯 Next Steps

1. ✅ Backend deployed on Vercel
2. ⏭️ Deploy frontend on Vercel (separate project)
3. ⏭️ Update `CLIENT_URL` in backend env vars
4. ⏭️ Update `VITE_API_BASE_URL` in frontend
5. ⏭️ Test complete flow
6. ⏭️ Create first admin at `/create-admin`

---

## 💡 Pro Tips

1. **Environment Branches:** Vercel creates preview deployments for each branch. Use this for testing.

2. **Custom Domain:** Add your own domain in Vercel → Project → Settings → Domains

3. **Logs:** Check Function Logs in Vercel dashboard for debugging

4. **Redeploy:** Push to GitHub or click "Redeploy" in Vercel dashboard

5. **Local Testing:** Test serverless locally with `vercel dev`

---

**Your backend is now serverless and production-ready!** 🎉

For frontend deployment guide, see separate documentation.
