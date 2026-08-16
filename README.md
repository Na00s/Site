# alijanati.com

Personal research site. Static HTML and CSS, no frameworks, no build step.

- `index.html` : the whole site. Edit copy directly here.
- `assets/css/main.css` : design tokens (colors, type) live at the top.
- `assets/js/main.js` : theme toggle and nav highlighting; the only JS.
- `assets/docs/CV_Ali.pdf` : the CV served at `/assets/docs/CV_Ali.pdf`.

Push to `main` and GitHub Actions deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Adding things

- **A paper**: copy a `<li class="pub">` block in `index.html`, update title/authors/links, and draw a new 92×92 SVG thumbnail in the same inline style.
- **An open-source entry**: copy a `<li class="project">` block.
- **An article**: create `articles/<slug>/index.html` from an existing article page, add a row to the Articles list in `index.html`, and add the URL to `sitemap.xml`.
- **A news item**: add a `<li>` at the top of the Recent list.
