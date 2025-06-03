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

// Helper function to run tests (for manual testing)
export const runMarkdownTests = () => {
  console.log('🧪 Running Markdown Cleaning Tests\n');
  
  testCases.forEach((testCase, index) => {
    const result = cleanMarkdownForHumanization(testCase.input);
    const passed = result.trim() === testCase.expected.trim();
    
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`✅ Passed: ${passed}`);
    if (!passed) {
      console.log(`❌ Expected: "${testCase.expected}"`);
      console.log(`❌ Got: "${result}"`);
    }
    console.log('---');
  });
  
  // Test markdown density calculation
  console.log('\n📊 Markdown Density Tests');
  const markdownHeavyText = "# Title\n\n**Bold** and *italic* with `code` and [links](url)";
  const plainText = "This is just regular text without any special formatting";
  
  console.log(`Heavy markdown density: ${calculateMarkdownDensity(markdownHeavyText).toFixed(1)}%`);
  console.log(`Plain text density: ${calculateMarkdownDensity(plainText).toFixed(1)}%`);
  console.log(`Has significant markdown (heavy): ${hasSignificantMarkdown(markdownHeavyText)}`);
  console.log(`Has significant markdown (plain): ${hasSignificantMarkdown(plainText)}`);
};

// Edge case tests
export const testEdgeCases = () => {
  console.log('\n🔍 Testing Edge Cases');
  
  const edgeCases = [
    { name: 'Empty string', input: '', expected: '' },
    { name: 'Only whitespace', input: '   \n  \n  ', expected: '' },
    { name: 'Mixed line breaks', input: 'Line 1\n\n\n\nLine 2', expected: 'Line 1\n\nLine 2' },
    { name: 'Nested formatting', input: '***Bold italic*** text', expected: 'Bold italic text' },
    { name: 'Malformed markdown', input: '**unclosed bold and *unclosed italic', expected: 'unclosed bold and unclosed italic' }
  ];
  
  edgeCases.forEach((testCase) => {
    const result = cleanMarkdownForHumanization(testCase.input);
    const passed = result === testCase.expected;
    console.log(`${testCase.name}: ${passed ? '✅' : '❌'}`);
    if (!passed) {
      console.log(`  Expected: "${testCase.expected}"`);
      console.log(`  Got: "${result}"`);
    }
  });
}; 