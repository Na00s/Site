# alijanati.com on GitHub Pages

This repo hosts a Jekyll site with the Minimal Mistakes theme and a custom domain.

## Quick start

1. Create a new GitHub repo named `alijanati.github.io` or any repo name.
2. Push these files to the `main` branch.
3. In Settings → Pages, choose `GitHub Actions` for the build source.
4. Add a Custom domain: `alijanati.com`. This creates a `CNAME` file automatically. The repo contains one already.

## DNS setup for `alijanati.com`

At your DNS provider set:

A records
- @ → 185.199.108.153
- @ → 185.199.109.153
- @ → 185.199.110.153
- @ → 185.199.111.153

AAAA records
- @ → 2606:50c0:8000::153
- @ → 2606:50c0:8001::153
- @ → 2606:50c0:8002::153
- @ → 2606:50c0:8003::153

Optional
- CNAME `www` → `na00s.github.io`

Then in the repo Settings → Pages, enforce HTTPS.

## Local preview

```bash
bundle install
bundle exec jekyll serve
```

## Structure

- `_config.yml` site configuration
- `_data/navigation.yml` menu
- `_pages/*` static pages
- `_posts/*` blog posts
- `assets/images` images
- `.github/workflows/pages.yml` CI for Pages
