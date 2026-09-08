# alijanati.com

Personal research site. Static HTML, CSS, and JavaScript with no build step.

The homepage contains Recent, Papers, Articles, Open source, and Contact as consecutive scrolling sections. Paper and project titles link directly to their primary sources. Five article pages share the site layout.

- `index.html`: homepage copy, links, and SVG illustrations.
- `site.css`, `content.css`, `article.css`: typography, colors, and page layouts.
- `figures.css`, `figures.js`: animated diagrams and pointer, touch, and keyboard interactions.
- `navigation.css`, `navigation.js`, `site.js`: section navigation, mobile menu, and theme controls.
- `sky.js`, `sky/`: interactive sky background and source attribution.
- `backgrounds.js`, `landscapes/`: photographed landscapes, animation, and photography credits.
- `assets/docs/CV_Ali.pdf`: CV, also available through `/cv/`.

The homepage uses the animated Mount Fuji landscape. Article covers have fixed individual scenes: forest for Qwen3-Next, coast for gpt-oss, hills for Gemma, the original sky for Llama, and tides for speculative decoding. Motion pauses when hidden or offscreen, and reduced-motion preferences receive a still scene.

## Preview

Run `python3 -m http.server 8765 --bind 127.0.0.1` and open http://localhost:8765/.

## Edit content

For a paper, article, or project, copy the corresponding entry in `index.html` and update its text and source links. New articles live at `articles/<slug>/index.html`; add their canonical URL to `sitemap.xml`. Add news items to the Recent list.

Push to `main` and `.github/workflows/deploy.yml` deploys to GitHub Pages.
