---
description: Cierra la sesión actualizando el segundo cerebro del proyecto
---

Al ejecutar este comando:

1. Leer `memory/.pending-notes` si existe — son los commits
   auto-capturados desde el último session-end.
   Incorporarlos al contexto antes de escribir las notas.

2. Resumir decisiones técnicas nuevas de la sesión (máx 10 bullets)
   usando los commits de `.pending-notes` como base.

3. Identificar gotchas nuevos.

4. Actualizar los archivos `memory/` relevantes (enriquecer, no sobreescribir).

5. Ejecutar:
   ```
   git add memory/
   git commit -m "chore(memory): session notes $(date +%Y-%m-%d)"
   ```

6. Eliminar `memory/.pending-notes`:
   ```
   rm -f memory/.pending-notes
   ```

7. Confirmar archivos actualizados y secciones cambiadas.
