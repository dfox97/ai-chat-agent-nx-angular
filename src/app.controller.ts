import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AnthropicChatService } from './ai/anthropic-chat.service';
import { z } from 'zod';
import { AIAgentService } from './ai/ai-agent.service';

@Controller()
export class AppController {
  constructor(
    private readonly anthropicService: AnthropicChatService,
    private readonly aiAgent: AIAgentService,
  ) {
    // Register pirate translator tool
    const pirateParamsSchema = z.object({
      text: z.string().describe('Text to translate into pirate speak'),
    });

    const pirateResultSchema = z.object({
      translation: z.string(),
    });

    this.aiAgent.registerTool({
      name: 'pirate_speak',
      description:
        'Translates normal text into pirate speech. Example: "Hello friend" -> "Ahoy matey"',
      paramsSchema: pirateParamsSchema,
      resultSchema: pirateResultSchema,
      execute: async (params: z.infer<typeof pirateParamsSchema>) => {
        // Simple pirate translation rules
        const pirateTranslations: Record<string, string> = {
          hello: 'ahoy',
          hi: 'yarr',
          yes: 'aye',
          friend: 'matey',
          my: 'me',
          is: 'be',
          are: 'be',
          the: "th'",
          you: 'ye',
          your: 'yer',
          for: 'fer',
          stop: 'avast',
          wow: 'shiver me timbers',
        };

        let translation = params.text.toLowerCase();

        // Replace words with pirate equivalents
        Object.entries(pirateTranslations).forEach(([word, pirateWord]) => {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          translation = translation.replace(regex, pirateWord);
        });

        // Add some pirate flair
        translation = translation.replace(/\?$/g, ', ye scurvy dog?');
        translation = translation.replace(/!$/g, ', arrr!');
        if (!translation.match(/[?!.]$/)) {
          translation += ', arrr!';
        }

        return {
          translation:
            translation.charAt(0).toUpperCase() + translation.slice(1),
        };
      },
    });
  }

  @Post('chat')
  async chat(@Body() body: { message: string }) {
    try {
      const result = await this.aiAgent.process(body.message);

      // Handle the string response from process method
      return {
        response: JSON.stringify(result),
        metadata: {
          timestamp: new Date().toISOString(),
          model: 'claude-2',
          query: body.message,
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to process message: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
