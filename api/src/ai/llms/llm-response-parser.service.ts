import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AgentResponse, AgentResponseSchema } from '../ai-agent-types';

@Injectable()
export class LLMResponseParser {
  private readonly logger = new Logger(LLMResponseParser.name);

  parseLLMResponse(llmResponse: string): AgentResponse {
    const jsonStartIndex = llmResponse.indexOf('{');
    const jsonEndIndex = llmResponse.lastIndexOf('}');

    if (
      jsonStartIndex !== -1 &&
      jsonEndIndex !== -1 &&
      jsonEndIndex > jsonStartIndex
    ) {
      const jsonString = llmResponse.substring(
        jsonStartIndex,
        jsonEndIndex + 1,
      );
      this.logger.debug(`Extracted JSON string: ${jsonString}`);

      try {
        const parsed: unknown = JSON.parse(jsonString);
        this.logger.debug(
          `Attempting to validate parsed response: ${JSON.stringify(parsed)}`,
        );

        const validatedResponse = AgentResponseSchema.parse(parsed);
        this.logger.debug(
          `Successfully parsed and validated response: ${JSON.stringify(validatedResponse)}`,
        );
        return validatedResponse;
      } catch (error) {
        if (error instanceof z.ZodError) {
          this.logger.error(
            `Validation error for extracted JSON: ${error.errors.map((e) => e.message).join(', ')}`,
            error,
          );
        } else if (error instanceof SyntaxError) {
          this.logger.error(
            `JSON parsing syntax error: ${error.message}`,
            error,
          );
        } else {
          this.logger.error(
            `Unknown error during JSON parsing or validation: ${error}`,
            error,
          );
        }
        // Fallback if parsing/validation fails for extracted JSON
        return {
          thought: 'Direct response (JSON extraction or validation failed)',
          action: null,
          finalAnswer: llmResponse.trim(),
        };
      }
    } else {
      this.logger.debug(
        'No valid JSON object found in the response. Treating as direct response.',
      );
      // If no JSON object is found, treat the entire response as a direct response
      return {
        thought: 'Direct response',
        action: null,
        finalAnswer: llmResponse.trim(),
      };
    }
  }
}
