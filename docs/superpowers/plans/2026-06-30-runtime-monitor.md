# Runtime Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an editor-side runtime monitor for live UE5 NPC memory, social interactions, and runtime logs.

**Architecture:** Extend shared types and Zustand runtime state with memory/social beat records. Subscribe to runtime WebSocket messages in the store. Add a dedicated `runtime_monitor` module and sidebar entry. Provide mock data so the panel is useful without a live UE WebSocket bridge.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, Tailwind CSS, lucide-react.

## Global Constraints

- Keep the panel inside the existing React/Vite editor.
- Do not require Ollama for this panel.
- Use existing `wsClient` and `useConfigStore`.
- Preserve existing modules and navigation behavior.
- Build must pass with `npm run build`.
- Commit to `master` and push to `origin/master`.

---

### Task 1: Static Verification Contract

**Files:**
- Create: `scripts/verify-runtime-monitor.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run verify:runtime-monitor`.

- [ ] Create a Node script that checks for `RuntimeMonitor.tsx`, `runtime_monitor`, `memory_snapshot`, `memory_added`, `social_beat`, `RuntimeMemoryRecord`, and `RuntimeSocialBeat`.
- [ ] Add `"verify:runtime-monitor": "node scripts/verify-runtime-monitor.mjs"` to `package.json`.
- [ ] Run `npm run verify:runtime-monitor`.
- [ ] Expected: FAIL before implementation.

### Task 2: Runtime Data Model And Store

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/useConfigStore.ts`

**Interfaces:**
- Produces: `RuntimeMemoryRecord`, `RuntimeSocialBeat`, `RuntimeDirectorMetrics`, `runtimeMemories`, `socialBeats`, `directorMetrics`, `runtimeLastUpdated`, `ingestRuntimeMessage`.

- [ ] Add runtime types.
- [ ] Add mock runtime memory/social beat records.
- [ ] Subscribe store websocket handler to `memory_snapshot`, `memory_added`, `social_beat`, `npc_status_snapshot`, `llm_call_log`, `guardrail_fire`, and `director_metrics`.
- [ ] Keep existing websocket connect/disconnect API.

### Task 3: Runtime Monitor UI

**Files:**
- Create: `src/components/RuntimeMonitor/RuntimeMonitor.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Layout/Sidebar.tsx`
- Modify: `src/types/index.ts`

**Interfaces:**
- Consumes: store runtime state and websocket API.
- Produces: `runtime_monitor` route.

- [ ] Add a dense dashboard with connection controls, KPI strip, NPC status wall, memory viewer, social beat timeline, and runtime log columns.
- [ ] Add sidebar navigation entry.
- [ ] Add module mapping in `App.tsx`.

### Task 4: Verification And Publish

**Commands:**
- `npm run verify:runtime-monitor`
- `npm run build`
- `git status --short`
- `git add ...`
- `git commit -m "feat: add runtime monitor panel"`
- `git push origin master`

**Expected:**
- Verification passes.
- Build passes.
- Commit lands on `master`.
- Push succeeds to `origin/master`.
