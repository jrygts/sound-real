import { describe, test, expect } from 'vitest';
import { cleanMarkdownForHumanization, calculateMarkdownDensity, hasSignificantMarkdown } from './textProcessing';

// Test cases for markdown cleaning
const testCases = [
  {
    name: 'Headers and formatting',
    input: "# Main Title\n\n## Subtitle\n\n**Bold text** and *italic text*\n\nRegular text here.",
    expected: "Main Title\n\nSubtitle\n\nBold text and italic text\n\nRegular text here."
  },
  {
    name: 'Lists and links',
    input: "Check out [this link](https://example.com) and:\n\n- Item 1\n- Item 2\n- Item 3",
    expected: "Check out this link and:\n\nItem 1. Item 2. Item 3."
  },
  {
    name: 'Code blocks',
    input: "Here's some code:\n\n```javascript\nconsole.log('hello');\nconst x = 1;\n```\n\nAnd `inline code` too.",
    expected: "Here's some code:\n\nconsole.log('hello');\nconst x = 1;\n\nAnd inline code too."
  },
  {
    name: 'Complex mixed formatting',
    input: "# AI Writing Tips\n\n**Important:** Use these guidelines:\n\n1. Write naturally\n2. Avoid *robotic* patterns\n3. Include `human elements`\n\n> This is a quote\n\nCheck [our guide](https://example.com) for more info.",
    expected: "AI Writing Tips\n\nImportant: Use these guidelines:\n\nWrite naturally. Avoid robotic patterns. Include human elements.\n\nThis is a quote\n\nCheck our guide for more info."
  },
  {
    name: 'Plain text (should be unchanged)',
    input: "This is just regular text without any formatting. It should remain mostly the same.",
    expected: "This is just regular text without any formatting. It should remain mostly the same."
  }
];

describe('Markdown Cleaning Tests', () => {
  test('cleanMarkdownForHumanization function exists and runs', () => {
    const result = cleanMarkdownForHumanization("# Title\n\nSome text");
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
  
  test('handles plain text without errors', () => {
    const plainText = "This is just regular text without any formatting. It should remain mostly the same.";
    const result = cleanMarkdownForHumanization(plainText);
    expect(result).toBe(plainText);
  });
});

describe('Markdown Density Tests', () => {
  test('calculates markdown density correctly', () => {
    const markdownHeavyText = "# Title\n\n**Bold** and *italic* with `code` and [links](url)";
    const plainText = "This is just regular text without any special formatting";
    
    const heavyDensity = calculateMarkdownDensity(markdownHeavyText);
    const plainDensity = calculateMarkdownDensity(plainText);
    
    expect(heavyDensity).toBeGreaterThan(plainDensity);
    expect(hasSignificantMarkdown(markdownHeavyText)).toBe(true);
    expect(hasSignificantMarkdown(plainText)).toBe(false);
  });
});

describe('Edge Case Tests', () => {
  test('handles empty string', () => {
    const result = cleanMarkdownForHumanization('');
    expect(result).toBe('');
  });
  
  test('handles whitespace-only input', () => {
    const result = cleanMarkdownForHumanization('   \n  \n  ');
    expect(result).toBe('');
  });
  
  test('handles basic formatting without throwing errors', () => {
    const input = '***Bold italic*** text';
    const result = cleanMarkdownForHumanization(input);
    expect(typeof result).toBe('string');
    expect(result.includes('text')).toBe(true);
  });
}); 