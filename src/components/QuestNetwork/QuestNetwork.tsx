import { useMemo, useCallback, useState } from 'react'
import ReactFlow, { Background, Controls, MiniMap, type Node, type Edge, MarkerType } from 'reactflow'
import 'reactflow/dist/style.css'
import { PlayerCenterNode } from './nodes/PlayerCenterNode'
import { MainQuestNode } from './nodes/MainQuestNode'
import { SideQuestNode } from './nodes/SideQuestNode'
import { AiQuestNode } from './nodes/AiQuestNode'
import { NpcNode } from './nodes/NpcNode'
import { useConfigStore } from '../../useConfigStore'
import { ArrowRight } from 'lucide-react'

const nodeTypes = {
  player: PlayerCenterNode,
  mainQuest: MainQuestNode,
  sideQuest: SideQuestNode,
  aiQuest: AiQuestNode,
  npc: NpcNode,
}

export function QuestNetwork() {
  const quests = useConfigStore((s) => s.questDefinitions)
  const npcs = useConfigStore((s) => s.npcs)
  const selectQuest = useConfigStore((s) => s.selectQuest)
  const setActiveModule = useConfigStore((s) => s.setActiveModule)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  const { nodes, edges } = useMemo(() => {
    const n: Node[] = []
    const e: Edge[] = []

    n.push({ id: 'player', type: 'player', position: { x: 30, y: 250 }, data: {} })

    // 主线 - 左上区域，垂直排列
    const mainQuests = quests.filter((q) => q.category === 'main').sort((a, b) => a.id.localeCompare(b.id))
    mainQuests.forEach((q, i) => {
      const y = 30 + i * 140
      n.push({
        id: `quest-${q.id}`,
        type: 'mainQuest',
        position: { x: 200, y },
        data: { label: q.name, status: q.status, summary: `Lv.${q.minLevel}-${q.maxLevel}` },
      })
      if (i > 0 && mainQuests[i - 1].prerequisiteQuestId === q.id) {
        e.push({ id: `e-main-${i}`, source: `quest-${q.id}`, target: `quest-${mainQuests[i - 1].id}`, animated: true, style: { stroke: '#ef4444' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } })
      } else if (q.prerequisiteQuestId) {
        e.push({ id: `e-main-${i}`, source: `quest-${q.prerequisiteQuestId}`, target: `quest-${q.id}`, animated: true, style: { stroke: '#ef4444' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } })
      }
    })

    // 支线 - 左下区域
    const sideQuests = quests.filter((q) => q.category === 'side')
    sideQuests.forEach((q, i) => {
      n.push({
        id: `quest-${q.id}`,
        type: 'sideQuest',
        position: { x: 200, y: 440 + i * 130 },
        data: { label: q.name, summary: `Lv.${q.minLevel}-${q.maxLevel}` },
      })
    })

    // AI 动态 - 右上区域
    const aiQuests = quests.filter((q) => q.category === 'ai_dynamic')
    aiQuests.forEach((q, i) => {
      n.push({
        id: `quest-${q.id}`,
        type: 'aiQuest',
        position: { x: 500, y: 30 + i * 120 },
        data: { label: q.name, triggerChance: q.aiSettings?.triggerChance },
      })
    })

    // NPC 节点 - 四周散布
    const involvedNpcIds = new Set<string>()
    quests.forEach((q) => q.involvedNpcs.forEach((npc) => involvedNpcIds.add(npc.npcId)))
    Array.from(involvedNpcIds).forEach((npcId, i) => {
      const npcObj = npcs.find((n) => n.id === npcId)
      if (!npcObj) return
      const col = i % 2
      n.push({
        id: `npc-${npcId}`,
        type: 'npc',
        position: { x: 500 + col * 200, y: 420 + Math.floor(i / 2) * 100 },
        data: { label: npcObj.name, roleTags: npcObj.roleTags },
      })
    })

    return { nodes: n, edges: e }
  }, [quests, npcs])

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const handleEditQuest = () => {
    if (selectedNode && selectedNode.id.startsWith('quest-')) {
      const questId = selectedNode.id.replace('quest-', '')
      selectQuest(questId)
      setActiveModule('quest_editor')
    }
  }

  return (
    <div className="relative h-full">
      <div className="absolute top-4 left-4 z-10">
        <h2 className="text-sm font-semibold text-neutral-200">任务网络图</h2>
        <p className="mt-1 text-xs text-neutral-500">玩家中心辐射 · 点击节点查看详情</p>
        <div className="mt-2 flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500/40" />主线</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500/40" />支线</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-neutral-600/50" />AI</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-500/30" />NPC</span>
        </div>
      </div>

      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeClick={onNodeClick} fitView>
        <Background color="#262626" gap={20} />
        <Controls className="!bg-neutral-900 !border-neutral-700 !fill-neutral-400" />
        <MiniMap className="!bg-neutral-900 !border-neutral-700" maskColor="rgba(0,0,0,0.7)" nodeColor="#3b82f6" />
      </ReactFlow>

      {selectedNode && selectedNode.id !== 'player' && (
        <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-neutral-700 bg-neutral-900 p-4 shadow-2xl shadow-black/50 min-w-[280px]">
          <p className="text-xs font-semibold text-neutral-200 mb-1">{selectedNode.data?.label as string}</p>
          {selectedNode.data?.status && (
            <p className="text-[10px] text-neutral-400">状态: {selectedNode.data.status as string}</p>
          )}
          {selectedNode.id.startsWith('quest-') && (
            <button onClick={handleEditQuest} className="mt-2 flex items-center gap-1 rounded bg-primary/20 px-3 py-1.5 text-[10px] text-primary hover:bg-primary/30">
              进入编排 <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
