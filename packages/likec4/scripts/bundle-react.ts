import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { consola } from 'consola'
import { copyFile, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'path'
import postcssPresetMantine from 'postcss-preset-mantine'
import { build } from 'vite'
import { shadowStyle } from 'vite-plugin-shadow-style'
import { amIExecuted } from './_utils'

export async function buildReact(_isDev = false) {
  const root = resolve('app')
  const outDir = resolve('dist/__app__/react')
  consola.start(`Bundling React components...`)
  consola.info(`root: ${root}`)
  consola.info(`outDir: ${outDir}`)

  const outputFilename = 'components.mjs'

  // Static website
  await build({
    root,
    configFile: false,
    resolve: {
      dedupe: [
        '@mantine/core',
        '@mantine/hooks'
      ],
      alias: {
        '@likec4/core': resolve('../core/src/index.ts'),
        '@likec4/diagram': resolve('../diagram/src/index.ts'),
        'react-dom/server': resolve('app/react/react-dom-server-mock.ts')
      }
    },
    clearScreen: false,
    mode: 'production',
    define: {
      __USE_SHADOW_STYLE__: 'true',
      __USE_HASH_HISTORY__: 'false',
      'process.env.NODE_ENV': '"production"'
    },
    esbuild: {
      treeShaking: true,
      // jsx: 'transform',
      jsxDev: false,
      // jsxImportSource: 'react',
      // jsxFactory: 'React.createElement',
      // banner: '/* eslint-disable */',
      minifyIdentifiers: false,
      minifySyntax: true,
      minifyWhitespace: true
    },
    build: {
      outDir,
      emptyOutDir: true,
      cssCodeSplit: false,
      cssMinify: true,
      sourcemap: false,
      minify: 'esbuild',
      target: 'esnext',
      copyPublicDir: false,
      chunkSizeWarningLimit: 2000,
      lib: {
        entry: 'react/components/index.ts',
        fileName(_format, _entryName) {
          return outputFilename
        },
        formats: ['es']
      },
      commonjsOptions: {
        esmExternals: true,
        ignoreTryCatch: 'remove',
        transformMixedEsModules: true
      },
      rollupOptions: {
        treeshake: true,
        output: {
          esModule: true,
          exports: 'named'
        },
        external: [
          'react',
          'react-dom',
          'react/jsx-runtime',
          'react/jsx-dev-runtime',
          'react-dom/client'
        ],
        plugins: [
          shadowStyle()
        ]
      }
    },
    css: {
      postcss: {
        plugins: [
          postcssPresetMantine()
        ]
      }
    },
    plugins: [
      react({}),
      vanillaExtractPlugin({
        identifiers: 'short'
      })
    ]
  })

  const outputFilepath = resolve(outDir, outputFilename)

  let bundledJs = await readFile(outputFilepath, 'utf-8')
  let updated = bundledJs.replace('loadExternalIsValidProp(require("@emotion/is-prop-valid").default);', '')

  if (updated !== bundledJs) {
    await writeFile(outputFilepath, updated)
  } else if (bundledJs.includes('@emotion/is-prop-valid')) {
    throw new Error(
      `${outputFilename} should contain loadExternalIsValidProp(require("@emotion/is-prop-valid").default)`
    )
  }

  await rm(resolve(outDir, 'style.css'))
  await copyFile('app/react/likec4.tsx', resolve(outDir, 'likec4.tsx'))
}

if (amIExecuted(import.meta.filename)) {
  consola.info('Running as script')
  await buildReact()
}
