import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'

// Keep the Figma toolchain, but avoid POSIX-only environment variable syntax.
const root = fileURLToPath(new URL('../', import.meta.url))
const [command = 'dev', ...extra] = process.argv.slice(2)
const localBuild = command === 'build' && process.env.FIGMA !== '1' && !process.env.FIGMA_EID
const isPayload = (command === 'build' && !localBuild) || command === 'payload'
const cli = isPayload ? 'node_modules/payload/bin.js' : 'node_modules/next/dist/bin/next'
const args = command === 'payload' ? [] : [command]
// Build the local portal and its API without loading Figma's hosted CMS.
if (localBuild) args.push('--webpack')

// Turbopack externalizes pg through junctions that may be unavailable on Windows.
// Webpack is supported by the same Next.js version and avoids that local requirement.
if (command === 'dev' && process.platform === 'win32' && process.env.FIGMA !== '1') {
  args.push('--webpack')
}
// A second launch should reuse the portal, or choose a free loopback port.
async function portAvailable(port) {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', error => error.code === 'EADDRINUSE' ? resolve(false) : reject(error))
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)))
  })
}

if (command === 'dev' || command === 'start') {
  const hosted = process.env.FIGMA === '1'
  let port = Number(process.env.PORT || 3000)
  if (command === 'dev' && !hosted && !process.env.PORT) {
    const lastCandidate = port + 9
    while (port <= lastCandidate && !(await portAvailable(port))) {
      try {
        const response = await fetch('http://127.0.0.1:' + port + '/api/portal/session',
          {signal: AbortSignal.timeout(2000), redirect: 'error'})
        if (response.status === 401 && (await response.json()).error === 'Silakan masuk terlebih dahulu.') {
          console.log('SIM-BEZAKAT sudah berjalan. Buka http://127.0.0.1:' + port)
          process.exit(0)
        }
      } catch { /* Another local service may already use this port. */ }
      port++
    }
    if (port > lastCandidate) {
      console.error('Port 3000 sampai 3009 sedang dipakai. Tentukan PORT lain di PowerShell.')
      process.exit(1)
    }
  }
  args.push('--port', String(port), '--hostname', hosted ? '0.0.0.0' : '127.0.0.1')
}
const child = spawn(process.execPath, ['--no-deprecation', cli, ...args, ...extra], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})
child.on('error', (error) => {
  console.error(error.message)
  process.exitCode = 1
})
child.on('exit', (code) => { process.exitCode = code ?? 1 })
