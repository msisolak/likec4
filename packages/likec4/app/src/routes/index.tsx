import { createFileRoute, Link } from '@tanstack/react-router'

import type { DiagramView } from '@likec4/core'
import { StaticLikeC4Diagram } from '@likec4/diagram'
import { useDebouncedEffect } from '@react-hookz/web'
import { memo, useState } from 'react'
import { useLikeC4View } from '../data'

import { Box, Card, Grid, Group, SimpleGrid, Text } from '@mantine/core'
import { useStore } from '@nanostores/react'
import { batched } from 'nanostores'
import { ceil, clamp, groupBy, keys, values } from 'remeda'
import { $views } from 'virtual:likec4'
import * as styles from './index.css'
import { cssPreviewCardLink } from './view.css'

export const Route = createFileRoute('/')({
  component: IndexPage
})

export function IndexPage() {
  const views = keys(useStore($views))

  return (
    <SimpleGrid
      p={{ base: 'md', sm: 'xl' }}
      cols={{ base: 1, sm: 2, md: 3, lg: 5 }}
      spacing={{ base: 10, sm: 'xl' }}
      verticalSpacing={{ base: 'md', sm: 'xl' }}
    >
      {views.map(v => <ViewCard key={v} viewId={v} />)}
    </SimpleGrid>
  )
}

const ViewCard = memo<{ viewId: string }>(({ viewId }) => {
  const diagram = useLikeC4View(viewId)
  if (!diagram) {
    return null
  }
  const { id, title, description } = diagram
  return (
    <Card
      component={Link}
      to={'/view/$viewId'}
      params={{ viewId: id }}
      search
      shadow="xs"
      padding="lg"
      radius="sm"
      withBorder>
      <Card.Section>
        <DiagramPreview diagram={diagram} />
      </Card.Section>

      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={500}>{title}</Text>
      </Group>

      <Text size="sm" c="dimmed">
        {description}
      </Text>
    </Card>
  )
}, (prev, next) => prev.viewId === next.viewId)

function DiagramPreview(props: { diagram: DiagramView }) {
  const [diagram, setDiagram] = useState<DiagramView | null>(null)

  // defer rendering to avoid flickering
  useDebouncedEffect(
    () => {
      setDiagram(props.diagram)
    },
    [props.diagram],
    clamp(ceil(Math.random() * 400, -1), {
      min: 50
    })
  )

  return (
    <Box className={styles.previewBg} style={{ height: 175 }}>
      {diagram && (
        <StaticLikeC4Diagram
          background={'transparent'}
          view={diagram}
          keepAspectRatio={false}
          fitView
          fitViewPadding={0.1} />
      )}
    </Box>
  )
}
