/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';
import { Tool } from '../ai-agent-types';

const pdfParamsSchema = z.object({
  filename: z
    .string()
    .describe('Name of the PDF file in the files folder to read'),
});

const pdfResultSchema = z.object({
  title: z.string(),
  overview: z.string(),
  pageCount: z.number(),
  wordCount: z.number(),
});

export const PdfTool: Tool<
  z.infer<typeof pdfParamsSchema>,
  z.infer<typeof pdfResultSchema>
> = {
  name: 'pdf_reader',
  description:
    'Reads a PDF file from the files folder and provides a brief overview',
  paramsSchema: pdfParamsSchema,
  resultSchema: pdfResultSchema,
  execute: async (params) => {
    try {
      // Get the PDF from the ai/files folder
      // Get the PDF from the files folder next to this tool
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

      // Get word count
      const words = pdfData.text.split(/\s+/).filter((word) => word.length > 0);

      // Get first 200 words for overview
      const overview =
        pdfData.text.split(/\s+/).slice(0, 200).join(' ') + '...';

      return {
        title: pdfData.info.Title || params.filename,
        overview: overview,
        pageCount: pdfData.numpages,
        wordCount: words.length,
      };
    } catch (error) {
      throw new Error(`Failed to read PDF: ${error.message}`);
    }
  },
};
