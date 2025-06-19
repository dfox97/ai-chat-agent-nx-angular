


import { z } from 'zod';
import axios from 'axios';
import { Tool } from '../ai-agent-types';
// Define the params schema with proper typing
export const SearchParams = z
  .object({
    query: z.string().min(1),
    num_results: z.number().default(5),
  })
  .strict();

// Define the result schema
export const SearchResult = z
  .object({
    title: z.string(),
    link: z.string(),
    snippet: z.string(),
  })
  .strict();

const SearchResults = z.array(SearchResult);

// Use proper type inference for the ToolDefinition
export const SearchTool: Tool<
  z.input<typeof SearchParams>, // Use input type for params
  z.infer<typeof SearchResults>
> = {
  name: 'search tool',
  description: 'Search the internet for information about a topic',
  paramsSchema: SearchParams,
  resultSchema: SearchResults,
  execute: async (params) => {
    try {
      const baseUrl = process.env['SEARX_API'] || 'https://searx.be';
      const response = await axios.get(`${baseUrl}/search`, {
        params: {
          q: params.query,
          format: 'json',
          categories: 'general',
          language: 'en',
          num_results: params.num_results,
        },
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; AssistantBot/1.0)',
        },
      });

      console.log('Search response:', response.data);

      if (!response?.data || !response.data?.results) {
        throw new Error('Invalid response from search engine');
      }

      const results = response.data.results
        .slice(0, params.num_results)
        .map((result: any) => ({
          title: result.title || '',
          link: result.url || '',
          snippet: result.content || '',
        }));

      return SearchResults.parse(results);
    } catch (error) {
      console.error('Search error:', error);
      throw new Error(
        `Failed to perform search: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },
};
