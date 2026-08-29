# 🚀 100% FREE Deployment Guide for Vortex Play

This guide explains how to launch **Vortex Play** online **100% FOR FREE** using modern cloud free tiers (**Render.com**, **Vercel**, and **MongoDB Atlas**).

---

## 🏗️ Free Infrastructure Stack

| Component | Cloud Host | Cost | Features |
| :--- | :--- | :--- | :--- |
| **Database** | MongoDB Atlas M0 | **$0 / Free Forever** | 512 MB Cloud Database (Pre-seeded with users & consoles) |
| **Backend API & WebSockets** | Render.com Web Service | **$0 / Free Forever** | Node.js, Express, Socket.IO WebSockets, SSL certificate |
| **Frontend Client** | Vercel / Render Static Site | **$0 / Free Forever** | High-speed global CDN, SSL, custom domain support |

---

## ⚡ Option 1: 1-Click Render.com Blueprint (Easiest)

Render will automatically read [`render.yaml`](file:///d:/prsnl/online_gaming/render.yaml) from your GitHub repository and deploy both the WebSockets backend and static frontend.

1. **Push your code to GitHub**:
   - Create a repository on GitHub (e.g. `online-gaming-platform`).
   - Push your code:
     ```bash
     git add .
     git commit -m "Prepare 100% free deployment"
     git push origin main
     ```

2. **Deploy on Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com/) and log in with GitHub.
   - Click **New +** -> **Blueprint**.
   - Connect your GitHub repository.
   - Render will detect [`render.yaml`](file:///d:/prsnl/online_gaming/render.yaml) and launch:
     - `vortex-play-server` (Backend WebSockets API)
     - `vortex-play-client` (Frontend UI)
   - Click **Apply**. Both services will build and launch online automatically!

---

## ⚡ Option 2: Deploy Frontend on Vercel + Backend on Render

If you prefer Vercel for your frontend interface:

### Step 1: Deploy Backend to Render.com (FREE)
1. Go to [Render Dashboard](https://dashboard.render.com/) -> **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name**: `vortex-play-server`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: `Free`
4. Add **Environment Variables**:
   - `PORT`: `5050`
   - `MONGODB_URI`: `mongodb+srv://satviksharma2711_db_user:q8wDQGN1DSdIjbj6@satvikg.vraogkp.mongodb.net/vortex_gaming?retryWrites=true&w=majority`
   - `JWT_SECRET`: `vortex-super-secret-key-10982-x`
5. Click **Create Web Service**. Copy your backend URL once live (e.g., `https://vortex-play-server.onrender.com`).

### Step 2: Deploy Frontend to Vercel (FREE)
1. Go to [vercel.com](https://vercel.com/) and sign in with GitHub.
2. Click **Add New** -> **Project**.
3. Import your repository and select the `client` folder as Root Directory.
4. Under **Environment Variables**, add:
   - `VITE_BACKEND_URL`: `https://vortex-play-server.onrender.com` (Your Render backend URL)
5. Click **Deploy**. Vercel will build and publish your app online!

---

## 🎯 Default Login Credentials

Once your app is live online, test with these accounts:

- **Admin Portal**: `admin` / `admin123`
- **Demo Player**: `demo` / `user123`
- Or click **Register** to create a brand new account!
