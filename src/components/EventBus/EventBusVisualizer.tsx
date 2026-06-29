import { useCallback, useMemo, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type Connection,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { EventSourceNode } from './nodes/EventSourceNode'
import { SubsystemNode } from './nodes/SubsystemNode'
import { useConfigStore } from '../../useConfigStore'
import { Edit3, X } from 'lucide-react'

const nodeTypes = {
  eventSource: EventSourceNode,
  subsystem: SubsystemNode,
}

export function EventBusVisualizer() {
  const eventRouting = useConfigStore((s) => s.eventRouting)
  const updateEventRoute = useConfigStore((s) => s.updateEventRoute)

  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [editValue, setEditValue] = useState('')

  // Build unique subsystem names
  const allSubsystems = useMemo(() => {
    const set = new Set<string>()
    Object.values(eventRouting).forEach((routes) => {
      routes.forEach((r) => set.add(r.targetSystem))
    })
    return Array.from(set)
  }, [eventRouting])

  // Build nodes and edges from store data
  const { nodes, edges } = useMemo(() => {
    const eventTypes = Object.keys(eventRouting)
    const n: Node[] = []
    const e: Edge[] = []

    eventTypes.forEach((et, i) => {
      n.push({
        id: `event-${et}`,
        type: 'eventSource',
        position: { x: 50, y: 30 + i * 130 },
        data: { label: et },
      })
    })

    const subPositions: Record<string, number> = {}
    allSubsystems.forEach((sub, i) => {
      subPositions[sub] = i
      n.push({
        id: `sub-${sub}`,
        type: 'subsystem',
        position: { x: 380, y: 30 + i * 130 },
        data: { label: sub.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
      })
    })

    eventTypes.forEach((et) => {
      const routes = eventRouting[et]
      routes.forEach((route, ri) => {
        const subIdx = subPositions[route.targetSystem]
        e.push({
          id: `edge-${et}-${route.targetSystem}`,
          source: `event-${et}`,
          target: `sub-${route.targetSystem}`,
          sourceHandle: null,
          targetHandle: null,
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
          label: route.mutation,
          labelStyle: { fill: '#a3a3a3', fontSize: 9, fontFamily: 'monospace' },
          labelBgStyle: { fill: '#171717', fillOpacity: 0.9 },
          data: { eventType: et, targetSystem: route.targetSystem, mutation: route.mutation, index: ri },
        })
      })
    })

    return { nodes: n, edges: e }
  }, [eventRouting, allSubsystems])

  const onEdgeClick = useCallback((_e: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge)
    setEditValue(edge.data?.mutation ?? '')
  }, [])

  const handleSaveMutation = () => {
    if (!selectedEdge) return
    const { eventType, targetSystem, index } = selectedEdge.data as { eventType: string; targetSystem: string; index: number }
    const routes = eventRouting[eventType] ? [...eventRouting[eventType]] : []
    if (routes[index]) {
      routes[index] = { ...routes[index], mutation: editValue }
      updateEventRoute(eventType, routes)
    }
    setSelectedEdge(null)
  }

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceEvent = (connection.source ?? '').replace('event-', '')
      const targetSub = (connection.target ?? '').replace('sub-', '')
      if (!sourceEvent || !targetSub) return
      const routes = eventRouting[sourceEvent] ? [...eventRouting[sourceEvent]] : []
      routes.push({ targetSystem: targetSub, mutation: '0' })
      updateEventRoute(sourceEvent, routes)
    },
    [eventRouting, updateEventRoute]
  )

  return (
    <div className="relative h-full">
      <div className="absolute top-4 left-4 z-10">
        <h2 className="text-sm font-semibold text-neutral-200">事件总线路由图</h2>
        <p className="mt-1 text-xs text-neutral-500">拖拽连线绑定 · 点击连线编辑权重</p>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onEdgeClick={onEdgeClick}
        onConnect={onConnect}
        fitView
        className="bg-neutral-950"
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
        }}
      >
        <Background color="#262626" gap={20} />
        <Controls className="!bg-neutral-900 !border-neutral-700 !fill-neutral-400" />
        <MiniMap
          className="!bg-neutral-900 !border-neutral-700"
          maskColor="rgba(0,0,0,0.7)"
          nodeColor="#3b82f6"
        />
      </ReactFlow>

      {/* Edge edit popover */}
      {selectedEdge && (
        <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-primary/30 bg-neutral-900 p-4 shadow-2xl shadow-black/50">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-neutral-200">编辑权重因子</h3>
            <button onClick={() => setSelectedEdge(null)} className="text-neutral-500 hover:text-neutral-300">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mb-3 text-[10px] text-neutral-400">
            <span className="font-mono text-cyan-400">{selectedEdge.source?.replace('event-', '')}</span>
            <span className="mx-1">→</span>
            <span className="font-mono text-amber-400">{selectedEdge.target?.replace('sub-', '')}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 rounded border border-neutral-700 bg-neutral-800 px-3 py-2 font-mono text-xs text-neutral-200 focus:ring-1 focus:ring-primary"
              placeholder="e.g. -30 or multiplier:0.5"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveMutation()}
            />
            <button
              onClick={handleSaveMutation}
              className="flex items-center gap-1 rounded bg-primary/20 px-3 py-2 text-xs text-primary hover:bg-primary/30"
            >
              <Edit3 className="h-3 w-3" />
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
