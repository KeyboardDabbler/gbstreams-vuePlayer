/**
 * Helper for HTML manipulation and sanitization
 *
 */
import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Sanitizes a string containing HTML tags and replaces newlines with the proper HTML tag.
 *
 * @param input - string to sanitize
 * @returns a cleaned up string
 */
export async function sanitizeHtml(input: string, isMarkdown = false): Promise<string> {
  // Some providers have newlines, replace them with the proper tag.
  const cleanString = input.replaceAll(/\r\n|\r|\n/g, '<br>');

  return DOMPurify.sanitize(
    isMarkdown ? await marked.parse(cleanString) : cleanString,
    {
      USE_PROFILES: { html: true }
    }
  );
}
