import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AgentResponse, AgentResponseSchema } from '../ai-agent-types';

@Injectable()
export class LLMResponseParser {
  private readonly logger = new Logger(LLMResponseParser.name);
  private escapeJsonString(str: string): string {
    return str.replace(/[\u0000-\u001F\u007F-\u009F]/g, function (char) {
      switch (char) {
        case '\b':
          return '\\b';
        case '\f':
          return '\\f';
        case '\n':
          return '\\n';
        case '\r':
          return '\\r';
        case '\t':
          return '\\t';
        default:
          // Handle other control characters by escaping them to \uXXXX
          const hex = char.charCodeAt(0).toString(16).padStart(4, '0');
          return '\\u' + hex;
      }
    });
  }

  parseLLMResponse(llmResponse: string): AgentResponse {
    const jsonStartIndex = llmResponse.indexOf('{');
    const jsonEndIndex = llmResponse.lastIndexOf('}');

    if (
      jsonStartIndex !== -1 &&
      jsonEndIndex !== -1 &&
      jsonEndIndex > jsonStartIndex
    ) {
      let jsonString = llmResponse.substring(jsonStartIndex, jsonEndIndex + 1);
      this.logger.debug(`Extracted JSON string: ${jsonString}`);

      try {
        // Attempt to parse directly, if it fails, try to repair
        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonString);
        } catch (initialError) {
          if (
            initialError instanceof SyntaxError &&
            initialError.message.includes('Bad control character')
          ) {
            this.logger.warn(
              'Initial JSON parse failed due to bad control character. Attempting to repair by escaping string values.',
            );

            // A very basic and potentially unsafe repair: Re-JSON stringify to get proper escaping
            // This assumes the structure is mostly correct but strings are not escaped.
            // A more robust solution might involve a custom parser or stricter LLM output
            // For now, let's try to stringify and re-parse common culprits like finalAnswer
            const tempObj = {};
            const finalAnswerMatch = jsonString.match(
              /"finalAnswer"\s*:\s*"(.*?)(?<!\\)"/s,
            );
            if (finalAnswerMatch && finalAnswerMatch[1]) {
              const rawFinalAnswer = finalAnswerMatch[1];
              const escapedFinalAnswer = this.escapeJsonString(rawFinalAnswer);
              // Simple regex replace, assuming no other "finalAnswer" strings in the JSON
              jsonString = jsonString.replace(
                rawFinalAnswer,
                escapedFinalAnswer,
              );
              this.logger.debug(
                `Repaired JSON string (finalAnswer): ${jsonString}`,
              );
            }

            // Attempt parsing again after a basic repair
            parsed = JSON.parse(jsonString);
          } else {
            throw initialError; // Re-throw other syntax errors
          }
        }

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
