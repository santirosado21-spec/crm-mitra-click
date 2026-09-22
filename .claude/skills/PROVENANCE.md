# Procedencia de las skills del proyecto

Instaladas el 22-sep-2026. Cada skill se revisó antes de copiarla: se leyó su
SKILL.md y se buscaron comandos de red, ejecución o instrucciones sospechosas en
sus scripts. Para actualizar una skill, clonar de nuevo el repo, revisar el diff
y reemplazar la carpeta.

| Skill | Repositorio | Commit | Notas |
|---|---|---|---|
| `frontend-design` | anthropics/skills | `34040c9` | Oficial de Anthropic. |
| `webapp-testing` | anthropics/skills | `34040c9` | Scripts Python con Playwright local. |
| `mcp-builder` | anthropics/skills | `34040c9` | Para el futuro servidor MCP de MitraClick. |
| `react-best-practices` | vercel-labs/agent-skills | `063bee9` | Solo markdown. |
| `composition-patterns` | vercel-labs/agent-skills | `063bee9` | Solo markdown. |
| `web-design-guidelines` | vercel-labs/agent-skills + vercel-labs/web-interface-guidelines | `063bee9` | **Fijada**: la original descarga reglas remotas en cada uso; aquí se copiaron a `guidelines.md`. |
| `ui-ux-pro-max` | nextlevelbuilder/ui-ux-pro-max-skill | `dcc40ff` | Búsqueda local en CSV (Python 3, sin red). Se excluyeron `scripts/tests`. Invocar con `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<consulta>" --domain <dominio>` desde la raíz. |
| `redesign-skill` | Leonxlnx/taste-skill | `a6153b3` | Rediseño con auditoría previa. `taste-skill` principal **no** se instaló: su autor lo excluye para dashboards y tablas. |

No instaladas porque ya están disponibles como plugin global:
`supabase` y `supabase-postgres-best-practices`, además de `dataviz`.
