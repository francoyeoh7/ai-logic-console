const LLM_BASE = 'http://localhost:8080/v1'

interface ChatCompletionRequest {
  systemPrompt: string
  grammar?: string
  temperature?: number
  maxTokens?: number
}

interface ChatCompletionResponse {
  json: Record<string, unknown>
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
}

interface EmbeddingResponse {
  embedding: number[]
  tokens: number
}

export const llmService = {
  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const body: Record<string, unknown> = {
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: 'Respond to the current situation. Output a JSON action command.' },
      ],
      temperature: req.temperature ?? 0.7,
      top_p: 0.9,
      max_tokens: req.maxTokens ?? 256,
      stream: false,
    }

    if (req.grammar) {
      body.grammar = req.grammar
    }

    const res = await fetch(`${LLM_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`LLM API error ${res.status}: ${text}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content ?? '{}'
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = { raw: content }
    }

    return {
      json: parsed,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    }
  },

  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    const res = await fetch(`${LLM_BASE}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: text }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Embedding API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    return {
      embedding: data.data?.[0]?.embedding ?? [],
      tokens: data.usage?.prompt_tokens ?? 0,
    }
  },

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${LLM_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      })
      return res.ok
    } catch {
      return false
    }
  },
}
