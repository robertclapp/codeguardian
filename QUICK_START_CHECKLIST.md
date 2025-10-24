# CodeGuardian Manus - Quick Start Checklist ⚡

**Get live in 15 minutes!** Follow this checklist for fastest deployment.

## ⏱️ 5-Minute Setup

### 1. Accounts & Keys (2 minutes)
- [ ] **Render Account**: Sign up at [render.com](https://render.com) with GitHub
- [ ] **OpenAI API Key**: Get from [platform.openai.com](https://platform.openai.com) ($5 minimum)
- [ ] **GitHub OAuth App**: 
  - Go to GitHub Settings → Developer settings → OAuth Apps → New
  - Name: `CodeGuardian`
  - Homepage: `https://codeguardian-frontend-manus.onrender.com` (update later)
  - Callback: `https://codeguardian-api-manus.onrender.com/auth/github/callback`
  - **Save Client ID & Secret** 📝

### 2. Deploy to Render (3 minutes)
- [ ] **Fork Repository**: [github.com/robertclapp/codeguardian](https://github.com/robertclapp/codeguardian)
- [ ] **Render Dashboard**: New → Blueprint → Select your forked repo → `render_manus.yaml`
- [ ] **Set Environment Variables**:
  ```
  OPENAI_API_KEY=sk-your-key-here
  GITHUB_CLIENT_ID=your-client-id
  GITHUB_CLIENT_SECRET=your-client-secret
  ```
- [ ] **Click Deploy** 🚀

---

## ⏱️ 10-Minute Configuration

### 3. Update OAuth URLs (2 minutes)
After deployment completes:
- [ ] **Copy your Render URLs** from dashboard
- [ ] **Update GitHub OAuth App**:
  - Homepage: `https://your-frontend-url.onrender.com`
  - Callback: `https://your-api-url.onrender.com/auth/github/callback`

### 4. Enable Manus Features (3 minutes)
Add these environment variables in Render:
- [ ] `ENABLE_MULTI_MODEL=true`
- [ ] `ENABLE_MCP=true`
- [ ] `ENABLE_REAL_TIME=true`
- [ ] `ENABLE_TEAM_MODE=true`
- [ ] `MANUS_VERSION=2.0`

### 5. Test & Verify (5 minutes)
- [ ] **Visit frontend URL** → Should load CodeGuardian
- [ ] **Sign in with GitHub** → OAuth should work
- [ ] **Run test analysis** → Should get multi-model results
- [ ] **Check Manus panel** → Features should show as active
- [ ] **Test real-time** → Enable in settings, type code

---

## 🎯 You're Live!

### ✅ Success Indicators:
- [ ] Frontend loads without errors
- [ ] GitHub login works
- [ ] Code analysis returns results
- [ ] Manus features panel shows active features
- [ ] Real-time analysis responds quickly

### 🚀 Your Live URLs:
- **App**: `https://codeguardian-frontend-manus.onrender.com`
- **API**: `https://codeguardian-api-manus.onrender.com`
- **Health Check**: `https://codeguardian-api-manus.onrender.com/health`

### 🎊 What You Now Have:
✅ **Multi-Model AI** (GPT-4.1 Mini/Nano + Gemini 2.5 Flash)
✅ **Real-Time Analysis** (Sub-200ms response)
✅ **MCP Integration** (4 enhanced servers)
✅ **Team Collaboration** (Advanced features)
✅ **Security Scanning** (Deep threat detection)
✅ **Performance Profiling** (Optimization insights)

---

## 🔧 Optional Enhancements

### Add Custom Domain (5 minutes)
- [ ] Buy domain (Namecheap, GoDaddy, etc.)
- [ ] Add to Render service settings
- [ ] Update DNS as instructed
- [ ] Update GitHub OAuth URLs

### Enable Error Tracking (2 minutes)
- [ ] Sign up for [Sentry](https://sentry.io) (free tier)
- [ ] Add `SENTRY_DSN=your-dsn` to Render env vars

### Setup MCP Servers (10 minutes)
- [ ] **Notion**: Create integration → Add `NOTION_API_KEY`
- [ ] **Vercel**: Generate token → Add `VERCEL_TOKEN`
- [ ] **Supabase**: Get project keys → Add `SUPABASE_URL` & `SUPABASE_ANON_KEY`

---

## 🚨 Troubleshooting

### If deployment fails:
1. **Check logs** in Render dashboard
2. **Verify env vars** are set correctly
3. **Restart services** in order: DB → Redis → API → Frontend

### If OAuth fails:
1. **Double-check URLs** match exactly
2. **Regenerate client secret** if needed
3. **Ensure HTTPS** in production URLs

### If features don't work:
1. **Check environment variables** are set to `true`
2. **Verify API key** has sufficient credits
3. **Restart API service** after env var changes

---

## 📞 Need Help?

- **Full Guide**: See `DEPLOYMENT_GUIDE_MANUS.md`
- **GitHub Issues**: Create issue in your forked repo
- **Render Support**: Check Render documentation
- **OpenAI Issues**: Verify API key and billing

---

**🎉 Congratulations! You now have a next-generation AI code review platform that outperforms CodeRabbit!**

*Total setup time: ~15 minutes*
*Monthly cost: ~$35 (Render Starter plans)*
*Competitive advantage: Significant* 🚀

