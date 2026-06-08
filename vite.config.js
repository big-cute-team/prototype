import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const require = createRequire(import.meta.url)
const rootDir = path.dirname(fileURLToPath(import.meta.url))
const apiDir = path.join(rootDir, 'api')

function localApiPlugin() {
  return {
    name: 'local-api',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          next()
          return
        }

        const url = new URL(req.url, 'http://localhost')
        const route = decodeURIComponent(url.pathname).replace(/^\/api\/?/, '')
        const segments = route.split('/').filter(Boolean)
        const handlerPath = path.join(apiDir, ...segments) + '.js'

        if (!handlerPath.startsWith(apiDir + path.sep) || !fs.existsSync(handlerPath)) {
          next()
          return
        }

        try {
          delete require.cache[require.resolve(handlerPath)]
          req.query = Object.fromEntries(url.searchParams.entries())
          await require(handlerPath)(req, res)
        } catch (error) {
          if (!res.headersSent) {
            res.statusCode = error.statusCode || error.status || 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
          }
          res.end(JSON.stringify({ error: error.message || 'Unexpected server error' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, rootDir, ''))

  return {
    plugins: [localApiPlugin(), react()],
    server: {
      port: process.env.PORT ? parseInt(process.env.PORT) : 5174,
      strictPort: false,
    },
  }
})
