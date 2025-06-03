/**
 * Text processing utilities for AI humanization
 * Removes markdown formatting to create more natural text
 */

/**
 * Removes markdown formatting to create more natural text
 * Preserves readability while eliminating robotic formatting
 */
export const cleanMarkdownForHumanization = (text: string): string => {
  return text
    // Remove headers (# ## ### etc) - preserve original line structure
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    
    // Remove bold and italic formatting
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1') // Bold italic
    .replace(/\*\*(.+?)\*\*/g, '$1')     // Bold
    .replace(/\*(.+?)\*/g, '$1')         // Italic
    .replace(/___(.+?)___/g, '$1')       // Alt bold italic
    .replace(/__(.+?)__/g, '$1')         // Alt bold
    .replace(/_(.+?)_/g, '$1')           // Alt italic
    
    // Remove code formatting
    .replace(/`{3}[\s\S]*?`{3}/g, (match) => {
      // Extract just the code content, remove language specifier
      return match.replace(/`{3}[\w]*\n?/g, '').replace(/`{3}/g, '');
    })
    .replace(/`(.+?)`/g, '$1')           // Inline code
    
    // Convert lists to natural text - handle both numbered and bullet lists
    .replace(/^\s*[-*+]\s+(.+)$/gm, '$1') // Remove bullet points
    .replace(/^\s*\d+\.\s+(.+)$/gm, '$1') // Remove numbered list markers
    
    // Remove blockquotes
    .replace(/^\s*>\s+(.+)$/gm, '$1')
    
    // Remove horizontal rules
    .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '')
    
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // ![alt](image) → alt text
    
    // Remove strikethrough
    .replace(/~~(.+?)~~/g, '$1')
    
    // Clean up extra whitespace and line breaks
    .replace(/\n{3,}/g, '\n\n')          // Multiple line breaks to double
    .replace(/^\s+|\s+$/gm, '')          // Leading/trailing spaces per line
    .trim();
};

/**
 * Calculates markdown density for future smart detection
 */
export const calculateMarkdownDensity = (text: string): number => {
  const markdownPatterns = [
    /#{1,6}\s/g,           // Headers
    /\*\*.*?\*\*/g,        // Bold
    /\*.*?\*/g,            // Italic
    /`.*?`/g,              // Code
    /^\s*[-*+]\s/gm,       // Lists
    /\[.*?\]\(.*?\)/g,     // Links
  ];
  
  let markdownMatches = 0;
  markdownPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) markdownMatches += matches.length;
  });
  
  const totalWords = text.split(/\s+/).length;
  return totalWords > 0 ? (markdownMatches / totalWords) * 100 : 0;
};

/**
 * Checks if text has significant markdown formatting
 * Returns true if markdown density is above threshold
 */
export const hasSignificantMarkdown = (text: string, threshold: number = 5): boolean => {
  return calculateMarkdownDensity(text) > threshold;
}; 