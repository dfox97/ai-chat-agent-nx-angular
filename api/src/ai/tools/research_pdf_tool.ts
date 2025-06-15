/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';
import { Tool } from '../ai-agent-types';

const researchPaperParamsSchema = z.object({
  filename: z
    .string()
    .describe(
      'Name of the PDF research paper file in the files folder to read',
    ),
});

const researchPaperResultSchema = z.object({
  title: z.string(),
  authors: z.string(),
  abstract: z.string(),
  fullText: z.string(),
  pageCount: z.number(),
  wordCount: z.number(),
  sections: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
    }),
  ),
});

export const ResearchPdfTool: Tool<
  z.infer<typeof researchPaperParamsSchema>,
  z.infer<typeof researchPaperResultSchema>
> = {
  name: 'research_pdf_reader',
  description:
    'Reads a CS research paper PDF and extracts structured information including full text, abstract, and sections',
  paramsSchema: researchPaperParamsSchema,
  resultSchema: researchPaperResultSchema,
  execute: async (params) => {
    try {
      const filePath = path.join(
        process.cwd(),
        'src',
        'ai',
        'tools',
        'files',
        params.filename,
      );
      const dataBuffer = await fs.readFile(filePath);

      // Parse the PDF
      const pdfData = await pdfParse(dataBuffer);
      const fullText = pdfData.text;

      // Split text into lines for processing
      const lines = fullText.split('\n').map((line) => line.trim());

      // Extract abstract (usually appears after "Abstract" keyword until the next section)
      const abstractStartIndex = lines.findIndex((line) =>
        /^abstract$/i.test(line.trim()),
      );
      let abstract = '';
      if (abstractStartIndex !== -1) {
        const abstractLines: string[] = [];
        let i = abstractStartIndex + 1;
        while (i < lines.length && !lines[i].match(/^[0-9]+\.|^[I|V]+\./)) {
          if (lines[i]) abstractLines.push(lines[i]);
          i++;
        }
        abstract = abstractLines.join(' ');
      }

      // Try to extract authors (usually appear near the top, before abstract)
      const potentialAuthorsLines = lines.slice(
        0,
        abstractStartIndex !== -1 ? abstractStartIndex : 10,
      );
      const authors = potentialAuthorsLines
        .filter(
          (line) =>
            line.includes('@') ||
            /^[A-Z][a-z]+ [A-Z][a-z]+/.test(line) ||
            line.includes('University') ||
            line.includes('Institute'),
        )
        .join(', ');

      // Attempt to identify sections
      const sections: Array<{ title: string; content: string }> = [];
      let currentSection: { title: string; content: string[] } = {
        title: '',
        content: [],
      };

      for (const line of lines) {
        // Identify potential section headers (numbered or in all caps)
        if (/^[0-9]+\.|^[I|V]+\./.test(line) || /^[A-Z\s]{4,}$/.test(line)) {
          if (currentSection.title) {
            sections.push({
              title: currentSection.title,
              content: currentSection.content.join(' '),
            });
          }
          currentSection = { title: line, content: [] };
        } else if (currentSection.title && line.trim()) {
          currentSection.content.push(line);
        }
      }

      // Add the last section
      if (currentSection.title) {
        sections.push({
          title: currentSection.title,
          content: currentSection.content.join(' '),
        });
      }

      // Get word count
      const words = fullText.split(/\s+/).filter((word) => word.length > 0);

      return {
        title: pdfData.info.Title || params.filename,
        authors: authors,
        abstract: abstract,
        fullText: fullText,
        pageCount: pdfData.numpages,
        wordCount: words.length,
        sections: sections,
      };
    } catch (error) {
      throw new Error(`Failed to read research paper: ${error.message}`);
    }
  },
};
