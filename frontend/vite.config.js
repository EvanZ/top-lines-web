import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'

// Plugin to serve dagster data files
function serveDataPlugin() {
  const dataPath = path.resolve(__dirname, '../../dagster-jobs/data/web')
  
  return {
    name: 'serve-data',
    configureServer(server) {
      // Use 'use' without path to handle all requests, check path manually
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/data/')) {
          const relativePath = req.url.replace('/data/', '')
          const filePath = path.join(dataPath, relativePath)
          
          console.log('[serve-data] Request:', req.url)
          console.log('[serve-data] Looking for file:', filePath)
          
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            console.log('[serve-data] Serving file:', filePath)
            const content = fs.readFileSync(filePath, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(content)
            return
          } else {
            console.log('[serve-data] File not found:', filePath)
          }
        }
        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    serveDataPlugin(), // Put data plugin BEFORE vue
    vue(),
  ],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  server: {
    port: 5174,
    host: '0.0.0.0',
    fs: {
      allow: ['..'],
    },
  },
})
