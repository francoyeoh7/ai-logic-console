import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function estimateTokens(text: string): number {
  if (!text) return 0
  let tokens = 0
  for (const char of text) {
    const code = char.charCodeAt(0)
    if (code <= 0x7f) {
      tokens += 0.25
    } else if (code <= 0x7ff) {
      tokens += 0.5
    } else {
      tokens += 0.75
    }
  }
  return Math.ceil(tokens)
}
