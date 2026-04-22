# docs/ — Documentación del proyecto

Esta carpeta contiene documentación y assets de diseño del proyecto POS Chile.
No se despliega al VPS (excluida del rsync en `scripts/deploy.sh`).

## Estructura

```
docs/
├── design/
│   ├── preview.html          # Prototipo HTML de diseño UI (referencia histórica)
│   └── screenshots/          # Capturas de pantalla UX — versión actual
│       ├── 01-dashboard.png
│       ├── 02-productos.png
│       ├── 03-ventas.png
│       ├── 04-caja.png
│       ├── 05-alertas.png
│       └── ...
└── setup/
    └── obsidian-claude.md    # Guía de configuración Obsidian + Claude Code
```

## Notas

- `design/screenshots/` — imágenes del audit UX realizado en fase 19.
- `design/preview.html` — prototipo estático que sirvió de referencia visual. Mantener como historial de diseño.
- `setup/obsidian-claude.md` — instrucciones para configurar el vault de Obsidian integrado con Claude Code (segundo cerebro).
