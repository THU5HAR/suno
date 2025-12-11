# Railway "Missing script: start" Error - FIX GUIDE

## The Problem
Railway is trying to run `npm start` from the **root directory** instead of `backend` or `playlist-studio-react` directory.

## The Solution - Set Root Directory in Railway Dashboard

### ⚠️ CRITICAL: You MUST set Root Directory in Railway Settings

## Step-by-Step Fix:

### For Backend Service:

1. **Go to Railway Dashboard**
   - https://railway.app/dashboard
   - Click on your **backend service**

2. **Open Settings Tab**
   - Click "Settings" in the left sidebar
   - Scroll down to "Service Settings"

3. **Set Root Directory** ⚠️ THIS IS THE FIX!
   - Find "Root Directory" field
   - **Type exactly:** `backend`
   - **NOT:** empty, NOT: `/`, NOT: `./backend`
   - Just: `backend`

4. **Clear Build/Start Commands**
   - **Build Command:** Leave EMPTY
   - **Start Command:** Leave EMPTY
   - (nixpacks.toml will handle it)

5. **Save and Redeploy**
   - Click "Save" or "Update"
   - Railway will automatically redeploy

### For Frontend Service:

1. **Go to Railway Dashboard**
   - Click on your **frontend service**

2. **Open Settings Tab**
   - Click "Settings" in the left sidebar
   - Scroll down to "Service Settings"

3. **Set Root Directory** ⚠️ THIS IS THE FIX!
   - Find "Root Directory" field
   - **Type exactly:** `playlist-studio-react`
   - **NOT:** empty, NOT: `/`, NOT: `./playlist-studio-react`
   - Just: `playlist-studio-react`

4. **Clear Build/Start Commands**
   - **Build Command:** Leave EMPTY
   - **Start Command:** Leave EMPTY
   - (nixpacks.toml will handle it)

5. **Save and Redeploy**
   - Click "Save" or "Update"
   - Railway will automatically redeploy

## Visual Guide:

```
Railway Dashboard → Your Service → Settings → Service Settings

Root Directory: [backend]          ← Type "backend" here (no quotes)
Build Command:  [empty]            ← Leave empty
Start Command:  [empty]            ← Leave empty
```

## After Setting Root Directory:

Railway will:
1. Look for `backend/package.json` (which HAS a start script)
2. Use `backend/nixpacks.toml` for build configuration
3. Run `npm start` from the backend directory
4. Success! ✅

## Verify It's Working:

After redeploy, check the logs:
- ✅ Should see: "Installing dependencies..."
- ✅ Should see: "Starting service..."
- ❌ Should NOT see: "Missing script: start"

## Still Not Working?

1. **Double-check Root Directory spelling:**
   - Backend: `backend` (lowercase, no spaces)
   - Frontend: `playlist-studio-react` (exact match)

2. **Check if files exist:**
   - `backend/package.json` should exist
   - `backend/nixpacks.toml` should exist
   - `playlist-studio-react/package.json` should exist
   - `playlist-studio-react/nixpacks.toml` should exist

3. **Push latest code to GitHub:**
   ```bash
   git add .
   git commit -m "Fix Railway deployment configuration"
   git push origin main
   ```

4. **Force redeploy in Railway:**
   - Go to "Deployments" tab
   - Click "Redeploy" on latest deployment

## Quick Checklist:

- [ ] Backend Root Directory = `backend`
- [ ] Frontend Root Directory = `playlist-studio-react`
- [ ] Both Build Commands = empty
- [ ] Both Start Commands = empty
- [ ] Code pushed to GitHub
- [ ] Services redeployed
- [ ] Check logs - no "Missing script: start" error

