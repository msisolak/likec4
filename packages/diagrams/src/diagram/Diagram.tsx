import type { DiagramEdge, DiagramNode, DiagramView, ViewID } from '@likec4/core/types'
import { animated, useSpring, useTransition, type AnimatedComponent } from '@react-spring/konva'
import type Konva from 'konva'
import { clamp, partition } from 'rambdax'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Layer, Stage, type KonvaNodeComponent, type StageProps } from 'react-konva'
import invariant from 'tiny-invariant'
import { CompoundShape, EdgeShape, RectangleShape } from './shapes'
import { DefaultDiagramTheme } from './theme'
import type { DiagramPaddings } from './types'
import { useFirstMountState } from '@react-hookz/web/esm'

const AStage: AnimatedComponent<KonvaNodeComponent<Konva.Stage, StageProps>> = animated(Stage)

interface IRect {
  x: number
  y: number
  width: number
  height: number
}

export interface DiagramProps {
  className?: string
  interactive?: boolean
  animate?: boolean
  pannable?: boolean
  zoomable?: boolean
  diagram: DiagramView
  width?: number
  height?: number
  padding?: DiagramPaddings
  onNodeClick?: (node: DiagramNode) => void
  onEdgeClick?: (edge: DiagramEdge) => void
}

const isCompound = (node: DiagramNode) => node.children.length > 0
const isNotCompound = (node: DiagramNode) => node.children.length == 0
const filterCompounds = partition(isCompound)

export function Diagram({
  diagram,
  className,
  interactive = true,
  padding = 0,
  width = diagram.width,
  height = diagram.height,
  onNodeClick,
  onEdgeClick,
  ...props
}: DiagramProps): JSX.Element {
  const {
    pannable = interactive,
    zoomable = interactive,
  } = props

  const id = diagram.id
  const theme = DefaultDiagramTheme

  const isFirstRender = useFirstMountState()

  const animate = !isFirstRender && (props.animate ?? interactive)

  const stageRef = useRef<Konva.Stage>(null)

  const handleWheelZoom = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!stage || !pointer) {
      return
    }

    if (Math.abs(e.evt.deltaY) < 10) {
      return
    }

    let zoomStep = Math.abs(e.evt.deltaY) < 50 ? 1.1 : 1.7

    let direction = e.evt.deltaY > 0 ? 1 : -1

    // // stop default scrolling
    // e.evt.preventDefault()
    // e.cancelBubble = true

    const oldScale = stage.scaleX()

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }

    // when we zoom on trackpad, e.evt.ctrlKey is true
    // in that case lets revert direction
    if (e.evt.ctrlKey) {
      direction = -direction
    }

    let newScale = direction > 0 ? oldScale * zoomStep : oldScale / zoomStep

    newScale = clamp(0.1, 1.6, newScale)
    if (newScale !== oldScale) {
      stageSpringApi.start({
        scaleX: newScale,
        scaleY: newScale,
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      })
    }
  }, [])

  const centerOnRect = (rect: IRect) => {
    const [paddingTop, paddingRight, paddingBottom, paddingLeft] = Array.isArray(padding) ? padding : [padding, padding, padding, padding] as const
    // const stage = stageRef.current
    // const container = stage?.container()

    // Get the space we can see in the web page = size of div containing stage
    // or stage size, whichever is the smaller
    const viewRect = {
      width,
      height
    }
    // if (stage && container) {
    //   viewRect.width = Math.min(container.clientWidth, stage.width())
    //   viewRect.height = Math.min(container.clientHeight, stage.height())
    // }

    const
      // Add padding to make a larger rect - this is what we want to fill
      centerTo = {
        x: rect.x - paddingLeft,
        y: rect.y - paddingTop,
        width: rect.width + paddingLeft + paddingRight,
        height: rect.height + paddingTop + paddingBottom
      },
      // Get the ratios of target shape v's view space widths and heights
      // decide on best scale to fit longest side of shape into view
      viewScale = Math.min(
        viewRect.width / centerTo.width,
        viewRect.height / centerTo.height,
      ),
      scale = clamp(
        0.2,
        1.05,
        viewScale
      ),
      // calculate the final adjustments needed to make
      // the shape centered in the view
      centeringAjustment = {
        x: (viewRect.width - centerTo.width * scale) / 2,
        y: (viewRect.height - centerTo.height * scale) / 2
      },
      // and the final position is...
      finalPosition = {
        x: Math.ceil(centeringAjustment.x + (-centerTo.x * scale)),
        y: Math.ceil(centeringAjustment.y + (-centerTo.y * scale))
      }
    return {
      ...finalPosition,
      scaleX: scale,
      scaleY: scale,
    }
  }

  const [stageProps, stageSpringApi] = useSpring({
    from: {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
    },
    immediate: !animate,
  }, [animate])

  const panning = useMemo(() => {
    if (!pannable) {
      return {
        draggable: false,
      }
    }
    return {
      draggable: true,
      onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => {
        stageSpringApi.stop()
      },
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        const stage = stageRef.current
        if (stage) {
          stageSpringApi.set({
            x: stage.x(),
            y: stage.y(),
          })
        }
      }
    }
  }, [pannable, stageSpringApi])

  useEffect(() => {
    stageSpringApi.start({
      to: {
        ...centerOnRect({
          x: 0,
          y: 0,
          width: diagram.width,
          height: diagram.height,
        })
      },
      immediate: !animate,
    })
  }, [id, width, height, diagram.width, diagram.height])

  // const _animate = animate && lastRenderViewIdRef.current !== null
  // const _animate = animate

  // const onNavigateImpl = useMemo(() => {
  //   if (!onNavigate) return null

  //   return (node: DiagramNode) => {
  //     if (node.navigateTo) {
  //       onNavigate(node.navigateTo)
  //     }
  //   }
  // }, [onNavigate ?? null])

  // const pickOnNodeClick = (node: DiagramNode) => {
  //   if (onNavigateImpl) {
  //     if (node.navigateTo) {
  //       return onNavigateImpl
  //     }
  //     return undefined
  //   } else {
  //     return onNodeClick
  //   }
  // }

  const compoundTransitions = useTransition(diagram.nodes.filter(isCompound), {
    from: {
      opacity: 0.1,
      scaleX: 0.8,
      scaleY: 0.8,
    },
    enter: {
      opacity: 1,
      scaleX: 1,
      scaleY: 1,
    },
    leave: {
      opacity: 0,
      scaleX: 0.7,
      scaleY: 0.7,
    },
    immediate: !animate,
    config(item, index, state) {
      return {
        duration: state === 'leave' ? 120 : 200,
      }
    },
    keys: node => node.id,
  })

  const edgeTransitions = useTransition(diagram.edges, {
    from: {
      opacity: 0,
    },
    enter: {
      opacity: 0.8,
    },
    leave: {
      opacity: 0,
    },
    immediate: !animate,
    delay: 50,
    config: {
      duration: 120,
    },
    keys: edge => edge.id,
  })

  const nodeTransitions = useTransition(diagram.nodes.filter(isNotCompound), {
    from: {
      opacity: 0.1,
      scaleX: 0.7,
      scaleY: 0.7,
    },
    enter: {
      opacity: 1,
      scaleX: 1,
      scaleY: 1,
    },
    leave: {
      opacity: 0,
      scaleX: 0.4,
      scaleY: 0.4,
    },
    immediate: !animate,
    config(item, index, state) {
      return {
        duration: state === 'leave' ? 120 : 250,
      }
    },
    keys: node => (node.parent ?? '') + '-' + node.id,
  })

  // const bind = useWheel(({ event, offset: [, y], direction: [, dy] }) => {
  //   event.preventDefault()
  //   if (dy) {
  //     wheelOffset.current = y
  //     runSprings(dragOffset.current + y, dy)
  //   }
  // }, {

  // })

  // @ts-ignore
  return <AStage
    ref={stageRef}
    className={className}
    onWheel={zoomable && handleWheelZoom}
    width={width}
    height={height}
    {...panning}
    {...stageProps}
  >
    <Layer>
      {compoundTransitions((springs, node) =>
        <CompoundShape
          key={node.id}
          animate={animate}
          node={node}
          theme={theme}
          springs={springs}
          onNodeClick={onNodeClick}
        />)}
    </Layer>
    <Layer>
      {edgeTransitions((springs, edge) => (
        <EdgeShape
          key={edge.id}
          edge={edge}
          theme={theme}
          springs={springs}
          onEdgeClick={onEdgeClick}
        />
      ))}
    </Layer>
    <Layer>
      {nodeTransitions((springs, node) =>
        <RectangleShape
          key={(node.parent ?? '') + '-' + node.id}
          animate={animate}
          node={node}
          theme={theme}
          onNodeClick={onNodeClick}
          springs={springs}
        />
      )}
    </Layer>
  </AStage>
}
