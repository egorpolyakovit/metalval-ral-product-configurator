# MetalVal RAL Product Configurator

Interactive RAL color configurator for industrial metal products. This public repository is a standalone portfolio version of a production B2B feature developed for **MetalVal.ru**.

## What it demonstrates

- product/category and size selection;
- multiple product views (front / side / top);
- RAL palette search and selection;
- client-side image recoloring with the **Canvas API** while preserving light/shadow detail;
- slideshow between available views;
- export of the configured product image to PNG;
- responsive desktop/mobile interface;
- integration-ready events and configuration structure.

## Product context

The configurator helps a customer preview an industrial hatch in a selected RAL color before requesting a commercial quotation. The production version is integrated into the MetalVal B2B catalog and supports product-specific configurations.

## Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Canvas API
- JSON-like configuration (`window.lyukiRalConfig`)

No framework or build step is required.

## Run locally

Open `index.html` in a modern browser, or serve the folder with a simple local web server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

The repository is static and can be published directly with GitHub Pages:

1. Open **Settings → Pages**.
2. Choose **Deploy from a branch**.
3. Select `main` and `/ (root)`.
4. Save.

## Repository structure

```text
.
├── index.html
├── assets/
│   ├── css/
│   │   └── ral-configurator.css
│   ├── js/
│   │   ├── demo-config.js
│   │   └── ral-configurator.js
│   └── images/
│       └── demo product views
├── README.md
└── .gitignore
```

## Notes

RAL/HEX values in this demo are intended for screen visualization only and are not a substitute for physical RAL samples or coating manufacturer references.

The public repository contains only showcase assets and front-end logic. Internal customer data, commercial calculations, server-side mail routing, CRM logic and private MetalVal data are intentionally excluded.

## Author / product work

**Egor Polyakov** — product development, UX logic, requirements and implementation for MetalVal.ru.

Live product: https://metalval.ru/

---

© 2026 MetalVal / Egor Polyakov. Portfolio showcase.
