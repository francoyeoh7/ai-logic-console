import { useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { useConfigStore } from '../../useConfigStore'

export function TensionChart() {
  const tensionData = useConfigStore((s) => s.tensionData)
  const thresholds = useConfigStore((s) => s.thresholds)
  const updateThreshold = useConfigStore((s) => s.updateThreshold)

  const handleMouseMove = useCallback(
    (e: any) => {
      if (!e || !e.activePayload) return
    },
    []
  )

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-neutral-300">实时心流曲线</h3>
          <p className="text-[10px] text-neutral-500">玩家情绪张力 · 60秒窗口</p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            <span className="text-neutral-400">高压线:</span>
            <input
              type="number"
              min={0}
              max={100}
              value={thresholds.highTension}
              onChange={(e) => updateThreshold('highTension', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-12 rounded border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 font-mono text-neutral-300 text-center"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-neutral-400">无聊线:</span>
            <input
              type="number"
              min={0}
              max={100}
              value={thresholds.lowBoredom}
              onChange={(e) => updateThreshold('lowBoredom', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-12 rounded border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 font-mono text-neutral-300 text-center"
            />
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={tensionData} onMouseMove={handleMouseMove}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="time"
            stroke="#52525b"
            tick={{ fontSize: 10, fill: '#71717a' }}
            label={{ value: '时间 (s)', position: 'insideBottomRight', offset: -5, style: { fontSize: 10, fill: '#71717a' } }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#52525b"
            tick={{ fontSize: 10, fill: '#71717a' }}
            label={{ value: '情绪张力', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#71717a' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#171717',
              border: '1px solid #3b82f6',
              borderRadius: '6px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#e5e5e5',
            }}
            formatter={(value: number) => [`${value.toFixed(1)}`, '张力值']}
            labelFormatter={(label: number) => `时间: ${label}s`}
          />
          <ReferenceLine
            y={thresholds.highTension}
            stroke="#ef4444"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{ value: '高压警戒线', position: 'right', style: { fontSize: 9, fill: '#ef4444' } }}
          />
          <ReferenceLine
            y={thresholds.lowBoredom}
            stroke="#f59e0b"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{ value: '无聊警戒线', position: 'right', style: { fontSize: 9, fill: '#f59e0b' } }}
          />
          <Line
            type="monotone"
            dataKey="tension"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: '#3b82f6', stroke: '#1e3a5f' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
