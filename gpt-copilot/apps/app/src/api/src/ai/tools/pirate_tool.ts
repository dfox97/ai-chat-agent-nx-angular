/* eslint-disable @typescript-eslint/require-await */
import { z } from 'zod';
import { Tool } from '../ai-agent-types';

const pirateParamsSchema = z.object({
  text: z.string().describe('Text to translate into pirate speak'),
});

const pirateResultSchema = z.object({
  translation: z.string(),
});

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

export const PirateTool: Tool<
  z.infer<typeof pirateParamsSchema>,
  z.infer<typeof pirateResultSchema>
> = {
  name: 'pirate_speak',
  description:
    'Translates normal text into pirate speech. Example: "Hello friend" -> "Ahoy matey"',
  paramsSchema: pirateParamsSchema,
  resultSchema: pirateResultSchema,
  execute: async (params) => {
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
      translation: translation.charAt(0).toUpperCase() + translation.slice(1),
    };
  },
};
