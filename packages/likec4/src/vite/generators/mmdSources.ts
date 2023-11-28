import type { ComputedView } from '@likec4/core'
import { generateMermaid } from '@likec4/generators'
import { CompositeGeneratorNode, NL, expandToNode, joinToNode, toString } from 'langium'

export function generateMmdSources(views: ComputedView[]) {
  const out = new CompositeGeneratorNode()
  out.appendTemplate`
    /******************************************************************************
     * This file was generated
     * DO NOT EDIT MANUALLY!
     ******************************************************************************/
    /* eslint-disable */
    import { memo } from 'react'

    type Opts = {
      viewId: string
    }
    export function mmdSource(viewId: string): string {
      switch (viewId) {
  `
    .appendNewLine()
    .indent({
      indentation: 4,
      indentedChildren(indented) {
        indented.append(
          joinToNode(
            views,
            view => expandToNode`
              case ${JSON.stringify(view.id)}: {
                return ${JSON.stringify(generateMermaid(view))}
              }
            `,
            {
              appendNewLineIfNotEmpty: true
            }
          ).appendTemplate`
          default: {
            throw new Error('Unknown viewId: ' + viewId)
          }
        `
        )
      }
    })
    .append(NL, '  }', NL).appendTemplate`
    }

    export const MmdSource = memo(({viewId}: Opts) => {
      return <>{mmdSource(viewId)}</>
    })
    MmdSource.displayName = 'MmdSource'
    `.append(NL, NL)
  return toString(out)
}
