import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const failures = []

function requireFile(relativePath) {
  const path = join(root, relativePath)
  if (!existsSync(path)) {
    failures.push(`Missing file: ${relativePath}`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

function requireContains(relativePath, pattern, description) {
  const text = requireFile(relativePath)
  if (!text) return
  const regex = new RegExp(pattern)
  if (!regex.test(text)) {
    failures.push(`${description} missing in ${relativePath}`)
  }
}

requireContains('src/types/index.ts', 'RuntimeMemoryRecord', 'runtime memory type')
requireContains('src/types/index.ts', 'RuntimeSocialBeat', 'runtime social beat type')
requireContains('src/types/index.ts', "runtime_monitor", 'runtime monitor module id')

requireContains('src/useConfigStore.ts', 'runtimeMemories', 'runtime memories store state')
requireContains('src/useConfigStore.ts', 'socialBeats', 'social beats store state')
requireContains('src/useConfigStore.ts', 'ingestRuntimeMessage', 'runtime websocket message ingestion')
requireContains('src/useConfigStore.ts', 'memory_snapshot', 'memory snapshot websocket handling')
requireContains('src/useConfigStore.ts', 'memory_added', 'memory added websocket handling')
requireContains('src/useConfigStore.ts', 'social_beat', 'social beat websocket handling')
requireContains('src/useConfigStore.ts', 'director_metrics', 'director metrics websocket handling')

requireContains('src/App.tsx', 'RuntimeMonitor', 'runtime monitor app import')
requireContains('src/App.tsx', 'runtime_monitor', 'runtime monitor app route')
requireContains('src/components/Layout/Sidebar.tsx', 'runtimeMonitor', 'runtime monitor sidebar label key')

requireContains('src/components/RuntimeMonitor/RuntimeMonitor.tsx', 'export function RuntimeMonitor', 'runtime monitor component export')
requireContains('src/components/RuntimeMonitor/RuntimeMonitor.tsx', 'runtimeMemories', 'runtime monitor memory rendering')
requireContains('src/components/RuntimeMonitor/RuntimeMonitor.tsx', 'socialBeats', 'runtime monitor social beat rendering')
requireContains('src/components/RuntimeMonitor/RuntimeMonitor.tsx', 'connectWebSocket', 'runtime monitor connection control')

if (failures.length > 0) {
  console.error('Runtime monitor verification failed:')
  for (const failure of failures) console.error(` - ${failure}`)
  process.exit(1)
}

console.log('Runtime monitor verification passed.')
