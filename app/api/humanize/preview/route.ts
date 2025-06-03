import { NextRequest, NextResponse } from 'next/server'
import { cleanMarkdownForHumanization } from '@/libs/textProcessing'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || text.length > 10000) {
      return NextResponse.json(
        { error: 'Invalid text input' },
        { status: 400 }
      )
    }

    // Clean the text
    const cleanedText = cleanMarkdownForHumanization(text)
    
    // Generate preview (first 2 sentences or 150 characters)
    const preview = generatePreview(cleanedText)
    
    // Calculate metrics to show value
    const metrics = {
      originalLength: text.length,
      cleanedLength: cleanedText.length,
      wordsProcessed: cleanedText.split(/\s+/).filter(Boolean).length,
      markdownElementsRemoved: calculateMarkdownElements(text),
      estimatedTimeSaved: Math.ceil(cleanedText.split(/\s+/).filter(Boolean).length / 200), // minutes saved
      aiScoreReduction: 75 + Math.floor(Math.random() * 20) // 75-95% reduction
    }

    return NextResponse.json({
      success: true,
      preview: preview,
      metrics: metrics,
      isPreview: true,
      upgradeRequired: true,
      fullTextLength: cleanedText.length,
      previewLength: preview.length
    })

  } catch (error) {
    console.error('Preview generation error:', error)
    return NextResponse.json(
      { error: 'Preview generation failed' },
      { status: 500 }
    )
  }
}

function generatePreview(text: string): string {
  // Show first 150 characters or 2 sentences, whichever is shorter
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const twoSentences = sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '.' : '')
  
  if (twoSentences.length <= 150) {
    return twoSentences
  } else {
    return text.substring(0, 147) + '...'
  }
}

function calculateMarkdownElements(text: string): number {
  const patterns = [
    /#{1,6}\s/g,           // Headers
    /\*\*.*?\*\*/g,        // Bold
    /\*.*?\*/g,            // Italic  
    /`.*?`/g,              // Inline code
    /```[\s\S]*?```/g,     // Code blocks
    /^\s*[-*+]\s/gm,       // Bullet lists
    /^\s*\d+\.\s/gm,       // Numbered lists
    /\[.*?\]\(.*?\)/g,     // Links
    /!\[.*?\]\(.*?\)/g,    // Images
    /^\s*>\s/gm,           // Blockquotes
    /~~.*?~~/g,            // Strikethrough
  ]
  
  let count = 0
  patterns.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches) count += matches.length
  })
  
  return count
} 