/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { z } from 'zod';
import wikipedia from 'wikipedia';
import { ToolDefinition } from '../ai-agent.service';

const wikiParamsSchema = z.object({
  query: z.string().describe('The search term to look up on Wikipedia'),
  maxLength: z
    .number()
    .optional()
    .describe('Maximum length of the summary (default: 250 words)'),
});

const wikiResultSchema = z.object({
  title: z.string(),
  summary: z.string(),
  url: z.string(),
});

export const WikiTool: ToolDefinition<
  z.infer<typeof wikiParamsSchema>,
  z.infer<typeof wikiResultSchema>
> = {
  name: 'wikipedia_search',
  description:
    'Searches Wikipedia and returns a summary of the most relevant article',
  paramsSchema: wikiParamsSchema,
  resultSchema: wikiResultSchema,
  execute: async (params) => {
    try {
      // Search for the page

      const searchResults = await wikipedia.search(params.query);
      if (!searchResults.results?.length) {
        throw new Error(`No Wikipedia results found for: ${params.query}`);
      }

      // Get the first (most relevant) result
      const page = await wikipedia.page(searchResults.results[0].title);
      const summary = await page.summary();

      return {
        title: page.title,
        summary: summary.extract.slice(0, params.maxLength || 250),
        url: page.fullurl,
      };
    } catch (error) {
      throw new Error(`Wikipedia search failed: ${error.message}`);
    }
  },
};
