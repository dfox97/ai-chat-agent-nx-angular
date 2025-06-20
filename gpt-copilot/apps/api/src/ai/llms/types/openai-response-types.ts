import { ChatCompletion } from 'openai/resources';
import { LLMCompletion, LLMProvider } from './base-response-types';

/** Normalise an OpenAI chat completion into the canonical shape. */
export const fromOpenAI = (response: ChatCompletion): LLMCompletion => {
  const { id, model, created, choices, usage } = response;
  const primary = choices[0];

  return {
    provider: LLMProvider.OPENAI,
    id,
    model,
    created,
    content: primary.message.content,
    blocks: undefined,
    stopReason: mapOpenAIStop(primary.finish_reason),
    stopSequence: null,
    usage: {
      input: usage?.prompt_tokens ?? 0,
      output: usage?.completion_tokens,
      total: usage?.total_tokens,
    },
    raw: response,
  };
};

const mapOpenAIStop = (
  reason: ChatCompletion['choices'][number]['finish_reason'],
): LLMCompletion['stopReason'] => {
  switch (reason) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case 'tool_calls':
      return 'tool';
    default:
      return 'other';
  }
};
