// Ejecuta un script de datos en TypeScript: lo empaqueta con esbuild (así puede reusar
// el código de src/) y lo corre con Node cargando .env.local si existe.
//
//   node scripts/run.mjs <nombre-del-script> [argumentos…]

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { build } from 'esbuild'

const [name, ...args] = process.argv.slice(2)
const entry = `scripts/${name}.ts`
if (!name || !existsSync(entry)) {
  console.error(`Uso: node scripts/run.mjs <script> [args]. No existe ${entry}.`)
  process.exit(1)
}

const outfile = `node_modules/.cache/mitra-scripts/${name}.mjs`
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', target: 'node22', outfile, logLevel: 'warning' })

const child = spawn(process.execPath, ['--env-file-if-exists=.env.local', outfile, ...args], { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 1))
