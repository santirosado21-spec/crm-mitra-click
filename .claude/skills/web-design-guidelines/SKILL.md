---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0-pinned"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines (versión fijada)

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read the rules in `guidelines.md` (same directory as this file).
2. Read the specified files (or ask the user for files/pattern).
3. Check against all rules in `guidelines.md`.
4. Output findings in the terse `file:line` format described there.

## Por qué está fijada

La skill original de vercel-labs descarga sus reglas desde GitHub en cada uso.
En este proyecto las reglas se copiaron una vez (22-sep-2026, revisadas) a
`guidelines.md` para que su contenido no cambie sin revisión. Para actualizarlas,
descargar de nuevo
`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`,
revisar el diff y reemplazar `guidelines.md`.

No descargar reglas remotas en tiempo de uso.
