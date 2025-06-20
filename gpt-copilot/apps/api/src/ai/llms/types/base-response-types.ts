import { ChatCompletion } from 'openai/resources';
import { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources';

export enum LLMProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  LOCAL = 'local',
}

/**
 * Canonical completion shape that abstracts provider‑specific details so you
 * can treat OpenAI and Anthropic responses uniformly in application code.
 */
export interface LLMCompletion {
  /** The upstream provider. */
  provider: LLMProvider;

  /** Unique identifier for the completion. */
  id: string;

  /** Model that produced the completion. */
  model: string;

  /** Optional creation timestamp (missing for streaming Anthropic). */
  created?: number;

  /** Assistant response flattened to plain text. */
  content: string | null;

  /**
   * Structured content blocks (attachments, tool calls, images, etc.) kept
   * intact for advanced use‑cases.
   */
  blocks?: unknown[];

  /** Normalised finishing reason. */
  stopReason?: 'stop' | 'length' | 'tool' | 'other' | null;

  /** Custom stop sequence, if any. */
  stopSequence?: string | null;

  /**
   * Provider‑agnostic usage stats.
   * Extra provider‑specific counters are preserved via index signature.
   */
  usage: {
    input: number;
    output?: number;
    [k: string]: number | null | undefined;
  };

  /** Raw provider response for debugging / power‑user access. */
  raw: ChatCompletion | AnthropicMessage;
}
