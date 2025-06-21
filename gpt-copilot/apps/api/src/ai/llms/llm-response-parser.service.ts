import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AgentResponse, AgentResponseSchema } from '../ai-agent-types';

@Injectable()
export class LLMResponseParser {
  private readonly logger = new Logger(LLMResponseParser.name);
  private escapeJsonString(str: string): string {
    // eslint-disable-next-line no-control-regex
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
          // eslint-disable-next-line no-case-declarations
          const hex = char.charCodeAt(0).toString(16).padStart(4, '0');
          return '\\u' + hex;
      }
    });
  }

  /**
    * Parses and validates the LLM's raw string response into a structured AgentResponse.
    * It attempts to extract JSON, parse it, and recover from certain common parsing errors.
    */
  parseLLMResponse(llmResponse: string): AgentResponse {
    const extractedJsonString = this.extractJsonString(llmResponse);

    if (extractedJsonString) {
      this.logger.debug(`Extracted JSON string: ${extractedJsonString}`);
      try {
        const parsed = this.parseJsonWithRepair(extractedJsonString);
        this.logger.debug(
          `Attempting to validate parsed response: ${JSON.stringify(parsed)}`,
        );

        const validatedResponse = AgentResponseSchema.parse(parsed);
        this.logger.debug(
          `Successfully parsed and validated response: ${JSON.stringify(validatedResponse)}`,
        );
        return validatedResponse;
      } catch (error) {
        return this.handleParsingError(error, llmResponse);
      }
    }


    this.logger.debug(
      'No valid JSON object found in the response. Treating as direct response.',
    );
    return this.defaultResponse(llmResponse);

  }


  /**
   * Extracts a potential JSON string from a larger LLM response string.
   * @returns The extracted JSON string or null if not found.
   */
  private extractJsonString(llmResponse: string): string | null {
    const jsonStartIndex = llmResponse.indexOf('{');
    const jsonEndIndex = llmResponse.lastIndexOf('}');

    if (
      jsonStartIndex !== -1 &&
      jsonEndIndex !== -1 &&
      jsonEndIndex > jsonStartIndex
    ) {
      return llmResponse.substring(jsonStartIndex, jsonEndIndex + 1);
    }
    return null;
  }

  /**
   * Attempts to parse a JSON string, with a basic repair mechanism for bad control characters.
   */
  private parseJsonWithRepair(jsonString: string): unknown {
    try {
      return JSON.parse(jsonString);
    } catch (initialError) {
      if (
        initialError instanceof SyntaxError &&
        initialError.message.includes('Bad control character')
      ) {
        this.logger.warn(
          'Initial JSON parse failed due to bad control character. Attempting to repair.',
        );

        // A very basic and potentially unsafe repair: Re-JSON stringify to get proper escaping
        const finalAnswerMatch = jsonString.match(
          /"finalAnswer"\s*:\s*"(.*?)(?<!\\)"/s,
        );
        if (finalAnswerMatch && finalAnswerMatch[1]) {
          const rawFinalAnswer = finalAnswerMatch[1];
          const escapedFinalAnswer = this.escapeJsonString(rawFinalAnswer);
          jsonString = jsonString.replace(rawFinalAnswer, escapedFinalAnswer);
          this.logger.debug(
            `Repaired JSON string (finalAnswer): ${jsonString}`,
          );
        }

        return JSON.parse(jsonString); // Attempt parsing again after repair
      } else {
        throw initialError; // Re-throw other syntax errors
      }
    }
  }

  /**
   * Centralized error logging and fallback response creation for parsing failures.
   */
  private handleParsingError(error: unknown, response: string): AgentResponse {
    if (error instanceof z.ZodError) {
      this.logger.error(
        `Validation error for extracted JSON: ${error.errors
          .map((e) => e.message)
          .join(', ')}`,
        error,
      );
    } else if (error instanceof SyntaxError) {
      this.logger.error(
        `JSON parsing syntax error after repair attempt: ${error.message}`,
        error,
      );
    } else {
      this.logger.error(
        `Unknown error during JSON parsing or validation: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }
    // Fallback if parsing/validation fails for extracted JSON
    return this.defaultResponse(response)
  }

  private defaultResponse(finalAnswer: string): AgentResponse {
    return {
      thought: 'Direct response',
      action: null,
      finalAnswer: finalAnswer.trim(),
    };
  }
}
