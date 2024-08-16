import { viteConfig } from '@/vite/config-app'
import { viteWebcomponentConfig } from '@/vite/config-webcomponent'
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import k from 'picocolors'
import { build } from 'vite'
import type { LikeC4ViteConfig } from './config-app.prod'
import { mkTempPublicDir } from './utils'

type Config = LikeC4ViteConfig & {
  buildWebcomponent?: boolean
}

export const Assets = ['favicon.ico', 'robots.txt']

export const viteBuild = async ({
  buildWebcomponent = true,
  webcomponentPrefix = 'likec4',
  ...cfg
}: Config) => {
  const { isDev, ...config } = await viteConfig({
    ...cfg,
    webcomponentPrefix
  })

  const publicDir = await mkTempPublicDir()

  for (const asset of Assets) {
    const origin = resolve(config.root, asset)
    if (existsSync(origin)) {
      copyFileSync(origin, resolve(publicDir, asset))
    }
  }

  const diagrams = await config.languageServices.views.diagrams()
  if (diagrams.length === 0) {
    process.exitCode = 1
    throw new Error('no views found')
  }

  diagrams.forEach(view => {
    if (view.hasLayoutDrift) {
      config.customLogger.warn(
        k.dim('layout issues') + ' ' + k.cyan(view.id) + ' ' + k.dim('manual layout can not be applied')
      )
    }
  })

  if (buildWebcomponent) {
    const webcomponentConfig = await viteWebcomponentConfig({
      webcomponentPrefix,
      languageServices: config.languageServices,
      outDir: publicDir,
      base: config.base
    })
    await build(webcomponentConfig)
  }

  // Static website
  await build({
    ...config,
    publicDir,
    mode: 'production'
  })

  // Copy index.html to 404.html
  const indexHtml = resolve(config.build.outDir, 'index.html')
  if (existsSync(indexHtml)) {
    copyFileSync(
      indexHtml,
      resolve(config.build.outDir, '404.html')
    )
  }
}
