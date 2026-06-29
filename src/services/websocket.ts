import type { WebSocketMessage } from '../types'

type MessageHandler = (msg: WebSocketMessage) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string = ''
  private handlers: Map<string, Set<MessageHandler>> = new Map()
  private globalHandlers: Set<MessageHandler> = new Set()
  private seqCounter = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private connected = false
  private onStatusChange?: (connected: boolean) => void

  connect(url: string = 'ws://localhost:9090', onStatus?: (connected: boolean) => void): void {
    this.url = url
    this.onStatusChange = onStatus
    this.doConnect()
  }

  private doConnect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.connected = true
      this.onStatusChange?.(true)
      this.reconnectTimer = null
    }

    this.ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data)
        this.handlers.get(msg.type)?.forEach((h) => h(msg))
        this.globalHandlers.forEach((h) => h(msg))
      } catch {
        // 忽略解析失败的帧
      }
    }

    this.ws.onclose = () => {
      this.connected = false
      this.onStatusChange?.(false)
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      // onclose 紧随 onerror
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.doConnect()
    }, 3000)
  }

  send(type: string, payload: Record<string, unknown> = {}): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const msg: WebSocketMessage = {
      type,
      seq: ++this.seqCounter,
      timestamp: Date.now(),
      payload,
    }
    this.ws.send(JSON.stringify(msg))
  }

  subscribe(type: string | null, handler: MessageHandler): () => void {
    if (type) {
      if (!this.handlers.has(type)) this.handlers.set(type, new Set())
      this.handlers.get(type)!.add(handler)
      return () => this.handlers.get(type)?.delete(handler)
    } else {
      this.globalHandlers.add(handler)
      return () => this.globalHandlers.delete(handler)
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
    this.connected = false
    this.onStatusChange?.(false)
  }

  isConnected(): boolean {
    return this.connected
  }
}

export const wsClient = new WebSocketClient()
