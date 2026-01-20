# Portfolio

Hiya~! This is the source code for my portfolio website. Feel free to visit the live site at [ruelalarcon.dev](https://ruelalarcon.dev).

---

## Overview

A minimal, terminal-aesthetic portfolio website featuring ASCII art visualizations (both DOM and WebGL-based), interactive effects, and performance-optimized rendering. The site is a single-page scrollable experience showcasing my projects and interests through unique visual elements.

> Mobile-friendly too~!

## Technologies

Built with vanilla JavaScript (ES6 modules) and WebGL. The site's simple enough a web framework would just make things more complicated than they need to be. Please feel free to check out my other projects for examples of my experience with frameworks such as Svelte, React, and Vue.

## Development

Serve locally with any HTTP server:
```bash
python -m http.server 8000
# or
npx http-server -p 8000
```

> I'd recommend that you use the `npx` server, or at least an alternative to python, since python's http server does not support `RANGE` requests, meaning the ASCII video *might* not allow you to seek unless you've already cached the video from a previous load on some browsers.

Then visit `http://localhost:8000`

## License

All rights reserved.
