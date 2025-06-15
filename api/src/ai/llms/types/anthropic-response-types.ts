import { LLMCompletion, LLMProvider } from './base-response-types';
import { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources';

/** Normalise an Anthropic message into the canonical shape. */
export const fromAnthropic = (message: AnthropicMessage): LLMCompletion => {
  return {
    provider: LLMProvider.ANTHROPIC,
    id: message.id,
    model: message.model,
    content: flattenAnthropicContent(message.content),
    blocks: message.content,
    stopReason: mapAnthropicStop(message.stop_reason),
    stopSequence: message.stop_sequence,
    usage: {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
      cache_creation_input_tokens: message.usage.cache_creation_input_tokens,
      cache_read_input_tokens: message.usage.cache_read_input_tokens,
    },
    raw: message,
  };
};

const flattenAnthropicContent = (blocks: AnthropicMessage['content']): string =>
  blocks.reduce<string>(
    (out, block) =>
      block.type === 'text' ? out + (block as { text: string }).text : out,
    '',
  );

const mapAnthropicStop = (
  reason: AnthropicMessage['stop_reason'],
): LLMCompletion['stopReason'] => {
  switch (reason) {
    case 'end_turn':
    case 'stop_sequence':
      return 'stop';
    case 'max_tokens':
      return 'length';
    case 'tool_use':
      return 'tool';
    default:
      return 'other';
  }
};
