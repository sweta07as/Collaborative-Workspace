# Vercel Deployment Guide

## Prerequisites

1. GitHub account
2. Vercel account (free at [vercel.com](https://vercel.com))
3. PlanetScale account (free MySQL at [planetscale.com](https://planetscale.com))
4. Upstash account (free Redis at [upstash.com](https://upstash.com))

---

## Step 1: Setup PlanetScale Database (Free MySQL)

1. Go to [planetscale.com](https://planetscale.com) and sign up
2. Create a new database named `collaborative-workspace`
3. Click **"Connect"** → Select **"Prisma"**
4. Copy the connection string (looks like):
   ```
   mysql://username:password@aws.connect.psdb.cloud/collaborative-workspace?sslaccept=strict
   ```

---

## Step 2: Setup Upstash Redis (Free)

1. Go to [upstash.com](https://upstash.com) and sign up
2. Create a new Redis database
3. Copy these values from the dashboard:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

## Step 3: Push Code to GitHub

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Collaborative Workspace Backend"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/collaborative-workspace-backend.git
git branch -M main
git push -u origin main
```

---

## Step 4: Deploy to Vercel

### Option A: Vercel Dashboard (Easiest)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your GitHub repo
4. Configure Environment Variables:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | Your PlanetScale connection string |
   | `REDIS_HOST` | Your Upstash REST URL |
   | `REDIS_PASSWORD` | Your Upstash REST Token |
   | `JWT_SECRET` | A strong random string (32+ chars) |
   | `JWT_ACCESS_EXPIRY` | `15m` |
   | `JWT_REFRESH_EXPIRY` | `7d` |
   | `CORS_ORIGIN` | `*` or your frontend URL |
   | `NODE_ENV` | `production` |

5. Click **"Deploy"**

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add REDIS_HOST
vercel env add REDIS_PASSWORD
vercel env add JWT_SECRET

# Deploy to production
vercel --prod
```

---

## Step 5: Run Database Migrations

After deployment, run migrations:

```bash
# Set DATABASE_URL locally to PlanetScale URL
export DATABASE_URL="mysql://..."

# Run migrations
npx prisma migrate deploy
```

Or use Vercel's build command which runs migrations automatically.

---

## Step 6: Verify Deployment

Test your endpoints:

```bash
# Health check
curl https://your-app.vercel.app/api/health

# Register
curl -X POST https://your-app.vercel.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123","name":"Test User"}'
```

---

## Live URLs

After deployment, your API will be available at:

- **Base URL**: `https://your-app.vercel.app`
- **Health**: `https://your-app.vercel.app/api/health`
- **API**: `https://your-app.vercel.app/api/v1/...`

---

## Limitations on Vercel

| Feature | Status | Alternative |
|---------|--------|-------------|
| REST API | ✅ Works | - |
| WebSocket | ❌ Not supported | Use Pusher/Ably |
| Background Jobs | ❌ Not supported | Use Vercel Cron or QStash |
| Long-running tasks | ⚠️ 30s max | Split into smaller tasks |

---

## Environment Variables Reference

```env
# Database (PlanetScale)
DATABASE_URL="mysql://user:pass@host/db?sslaccept=strict"

# Redis (Upstash)
REDIS_HOST="https://xxx.upstash.io"
REDIS_PASSWORD="your-upstash-token"

# JWT
JWT_SECRET="your-super-secret-key-at-least-32-characters"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# App
NODE_ENV="production"
CORS_ORIGIN="*"
```

---

## Troubleshooting

### Error: Cannot connect to database
- Verify PlanetScale connection string is correct
- Ensure SSL is enabled (`?sslaccept=strict`)

### Error: Function timeout
- Vercel has 30s limit on serverless functions
- Optimize database queries

### Error: Module not found
- Run `npm run build` before deploying
- Check `vercel.json` configuration
