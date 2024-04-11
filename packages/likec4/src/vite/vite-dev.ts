import type { LikeC4ViteConfig } from '@/vite/config'
import { viteConfig } from '@/vite/config'
import { viteWebcomponentConfig } from '@/vite/webcomponent'
import getPort, { portNumbers } from 'get-port'
import type { ViteDevServer } from 'vite'
import { build, createServer } from 'vite'
import { printServerUrls } from './printServerUrls'
import { mkTempPublicDir } from './vite-build'

export async function viteDev(cfg: LikeC4ViteConfig): Promise<ViteDevServer> {
  const { isDev, languageServices, ...config } = await viteConfig(cfg)
  const port = await getPort({
    port: [5173, 61000, 61001, ...portNumbers(62002, 62010)]
  })
  const hmrPort = await getPort({
    port: portNumbers(24678, 24690)
  })

  const publicDir = await mkTempPublicDir()

  const webcomponentConfig = await viteWebcomponentConfig({
    languageServices: languageServices,
    outDir: publicDir,
    base: config.base
  })
  // don't wait, we want to start the server asap
  const webcomponentPromise = build({
    ...webcomponentConfig,
    logLevel: 'warn'
  })

  // languageServices.onModelUpdate(() => {
  //   consola.info('watcher onModelUpdate')
  //   watcher.emit('event', {code: 'START'})
  //   watcher.emit('change', 'virtual:likec4/views', {event: 'update'})
  // })

  const server = await createServer({
    ...config,
    mode: 'development',
    optimizeDeps: isDev
      ? {
        force: true
      }
      : {
        noDiscovery: true
      },
    publicDir,
    server: {
      host: '0.0.0.0',
      port,
      hmr: {
        overlay: true,
        // needed for hmr to work over network aka WSL2
        // host: 'localhost',
        port: hmrPort
      },
      fs: {
        strict: false,
        allow: [
          config.root,
          publicDir,
          languageServices.workspace
        ]
      },
      open: !isDev
    }
  })

  await server.listen()

  server.config.logger.clearScreen('info')
  printServerUrls(server)

  await webcomponentPromise

  return server
}
