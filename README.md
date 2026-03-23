# GeoPlatform Website

Static landing page for GeoPlatform.

## Deploy

This repository is configured with GitHub Pages workflow:
- Push to `main` branch
- GitHub Actions automatically deploys the static site

### Quick Publish Steps

```bash
# 1) Commit your changes
git add .
git commit -m "Update website content"

# 2) Push to main (triggers Pages workflow)
git push origin main
```

### Check Deployment Status

1. Open GitHub repository `Actions` tab
2. Verify workflow `Deploy static site to Pages` is green
3. Open repository `Settings -> Pages` to confirm latest deploy

### If Page Does Not Refresh

1. Force refresh browser: `Cmd + Shift + R`
2. Open site with cache-busting query, e.g. `https://<your-pages-url>/?v=20260323`
3. Check if new media files are committed and pushed (especially `assets/media/*.mp4`)

## Assets to add later

- 3D printing case demo: 15-30s video or 2 screenshots

Last deploy trigger: 2026-03-09 21:48:54 +0800
