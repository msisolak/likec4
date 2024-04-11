import { createLikeC4Logger } from '@/logger'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import consola from 'consola'
import fs from 'node:fs'
import { resolve } from 'node:path'
import k from 'picocolors'
import postcssPresetMantine from 'postcss-preset-mantine'
import type { InlineConfig } from 'vite'
import { shadowStyle } from 'vite-plugin-shadow-style'
import { LanguageServices } from '../language-services'
import { likec4Plugin } from './plugin'

export type LikeC4ViteWebcomponentConfig = {
  languageServices: LanguageServices
  outDir: string
  base: string
}

export async function viteWebcomponentConfig({
  languageServices,
  outDir,
  base
}: LikeC4ViteWebcomponentConfig) {
  const customLogger = createLikeC4Logger('c4:lib')

  const root = resolve('app')
  if (!fs.existsSync(root)) {
    consola.error(`app root does not exist: ${root}`)
    throw new Error(`app root does not exist: ${root}`)
  }

  customLogger.info(k.cyan('outDir') + ' ' + k.dim(outDir))

  return {
    customLogger,
    root,
    configFile: false,
    resolve: {
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
      alias: {
        '@likec4/core': resolve('../core/src/index.ts'),
        '@likec4/diagram': resolve('../diagram/src/index.ts')
      }
    },
    mode: 'production',
    define: {
      'process.env.NODE_ENV': '"production"'
    },
    clearScreen: false,
    base,
    publicDir: false,
    build: {
      outDir,
      emptyOutDir: false,
      cssCodeSplit: false,
      cssMinify: true,
      sourcemap: false,
      minify: true,
      lib: {
        entry: 'src/lib/webcomponent.tsx',
        fileName(_format, _entryName) {
          return 'likec4-views.js'
        },
        formats: ['iife'],
        name: 'LikeC4Views'
      },
      commonjsOptions: {
        esmExternals: true
      },
      rollupOptions: {
        treeshake: true,
        plugins: [
          shadowStyle()
        ]
      }
    },
    plugins: [
      react({}),
      vanillaExtractPlugin({}),
      likec4Plugin({ languageServices })
    ],
    css: {
      postcss: {
        plugins: [
          postcssPresetMantine()
        ]
      }
    }
  } satisfies InlineConfig
}
