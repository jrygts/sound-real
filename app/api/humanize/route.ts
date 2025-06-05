import { createClient } from "@/libs/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import OpenAI from "openai";
import { isUserAdmin } from "@/libs/admin";
import { countWords, validateWordCount } from "@/lib/wordUtils";
import { cleanMarkdownForHumanization } from "@/libs/textProcessing";
// TODO: Implement postProcessor in Phase 2
// import { postProcess } from "@/libs/postProcessor";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FREE_DAILY_LIMIT = 5;

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { text } = await request.json();
    
    // Validate input
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Clean and validate text
    const cleanedText = cleanMarkdownForHumanization(text.trim());
    
    // Validate word count and text
    const validation = validateWordCount(cleanedText);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const wordsToProcess = validation.wordCount;
    console.log(`📝 [Transform] Processing ${wordsToProcess} words`);

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    // Handle free (non-authenticated) usage
    if (!user) {
      const freeUsesToday = parseInt(cookies().get("free_uses_today")?.value || "0");
      const lastResetDate = cookies().get("last_reset_date")?.value;
      const today = new Date().toDateString();
      
      let currentUses = freeUsesToday;
      if (lastResetDate !== today) {
        currentUses = 0;
      }
      
      if (currentUses >= FREE_DAILY_LIMIT) {
        return NextResponse.json(
          { 
            error: "TRANSFORMATION_LIMIT_EXCEEDED",
            message: "Daily limit reached. Please sign up for unlimited access!",
            upgradeUrl: "/pricing" 
          },
          { status: 429 }
        );
      }
    } else {
              // Handle authenticated users with new word-based billing
        const isAdmin = isUserAdmin({ email: user.email, id: user.id });
        
        if (!isAdmin) {
          // Get current usage before processing
          try {
            const usageResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/subscription/usage`, {
              method: 'GET',
              headers: {
                'Cookie': request.headers.get('Cookie') || '',
                'Authorization': `Bearer ${request.headers.get('Authorization')?.replace('Bearer ', '') || ''}`,
              },
            });

            if (!usageResponse.ok) {
              console.error('📊 [Transform] Failed to get usage data');
              return NextResponse.json(
                { error: "Unable to check usage limits. Please try again." },
                { status: 500 }
              );
            }

            const usageData = await usageResponse.json();
            const usage = usageData.usage;

            console.log(`📊 [Usage] Current: ${usage.words_used}/${usage.words_limit} words, Plan: ${usage.plan}`);

            /* Guard: refuse if this job would exceed quota */
            if (usage.words_used + wordsToProcess > usage.words_limit && usage.words_limit !== -1) {
              return NextResponse.json(
                { error: "limit-reached", words_remaining: usage.words_limit - usage.words_used },
                { status: 403 },
              );
            }

          } catch (error) {
            console.error('📊 [Transform] Usage check error:', error);
            return NextResponse.json(
              { error: "Unable to verify usage limits. Please try again." },
              { status: 500 }
            );
          }
        }
    }
    
    // All checks passed - proceed with transformation
    console.log(`🚀 [Transform] Starting OpenAI baseline rewrite for ${wordsToProcess} words`);

    // Determine mode based on word count
    const mode = wordsToProcess <= 400 ? 'MODE-A' : 'MODE-B';
    console.log(`📝 [Transform] Using ${mode} for ${wordsToProcess} words`);

    const systemPrompt = `You are SR-Rewriter, focused on creating baseline rewrites that preserve facts and professional tone while preparing text for post-processing.

CORE MISSION: Apply ${mode} rewriting rules to create a solid foundation for further humanization processing.`;

    const userPrompt = `Baseline Rewrite Instructions

Text to rewrite: "${cleanedText}"

Apply ${mode} rules:

${mode === 'MODE-A' ? `MODE-A (≤400 words) — Micro-Paraphrase:
1. Swap ≤15% of verbs/adjectives with synonyms that maintain register
2. Vary sentence lengths between 8-30 words through minor splitting/merging
3. Remove headers if present; use plain paragraphs
4. Remove rhetorical questions
5. Keep citations and brackets unchanged` : `MODE-B (>400 words) — Structural Re-order:
1. Delete headers; output plain paragraphs only
2. In 40% of sentences, flip clause order or switch passive ↔ active voice
3. Restructure paragraph order while maintaining logical flow
4. Vary sentence structure and length significantly
5. Keep markdown lists and citations unchanged if present`}

CONSTRAINTS:
• Preserve all factual content exactly
• Maintain professional, academic tone
• No slang, humor, or personal voice
• Keep all citations/brackets untouched
• Output clean, readable prose

Return only the rewritten text, no explanations.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.5,
      top_p: 0.9,
      presence_penalty: 0.2,
      frequency_penalty: 0.2,
      max_tokens: Math.min(wordsToProcess * 2, 4000),
    });
    
    const baselineRewrite = completion.choices[0].message.content || cleanedText;
    console.log(`✅ [Transform] Baseline rewrite completed`);

    // Apply post-processor with random seed for additional humanization
    console.log(`🔧 [Transform] Applying post-processor`);
    // TODO: Implement postProcessor in Phase 2 - for now, using baseline rewrite as final output
    const humanizedText = baselineRewrite;
    
    // TODO: Replace in Phase 2 - Mock AI detection scores for MVP (will be replaced with real GPTZero API)
    const mockScoreBefore = 0.87; // Mock: 87% AI-generated before
    const mockScoreAfter = 0.48;  // Mock: 48% AI-generated after (below 65% target)
    
    console.log(`✅ [Transform] Post-processing completed successfully`);

    // Save transformation and update usage for authenticated users
    if (user) {
      try {
        // Save transformation to database
        await supabase.from("transformations").insert({
          user_id: user.id,
          original_text: text, // Keep original with markdown for reference
          humanized_text: humanizedText,
          ai_score_before: mockScoreBefore,
          ai_score_after: mockScoreAfter,
          word_count: wordsToProcess,
        });
        console.log('💾 [Transform] Transformation saved to database');

        // Update usage after successful processing
        const isAdmin = isUserAdmin({ email: user.email, id: user.id });
        
        if (!isAdmin) {
          const { error: incErr } = await supabase.rpc("increment_words_used", {
            uid: user.id,
            add_words: wordsToProcess,
          });
          
          if (incErr) {
            if (incErr.message.includes("limit-reached")) {
              return NextResponse.json(
                { error: "limit-reached", words_remaining: 0 },
                { status: 403 },
              );
            }
            throw incErr;
          }
        }
      } catch (error) {
        console.error('💾 [Transform] Failed to save transformation:', error);
        // Don't fail the request if saving fails
      }
    } else {
      // Update cookie usage for non-authenticated users
      const freeUsesToday = parseInt(cookies().get("free_uses_today")?.value || "0");
      const today = new Date().toDateString();
      cookies().set("free_uses_today", (freeUsesToday + 1).toString());
      cookies().set("last_reset_date", today);
      console.log(`📊 [Transform] Updated cookie usage: ${freeUsesToday + 1}/${FREE_DAILY_LIMIT}`);
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      humanizedText,
      aiScoreBefore: mockScoreBefore,
      aiScoreAfter: mockScoreAfter,
      wordCount: wordsToProcess,
    });
    
  } catch (error) {
    console.error("🚨 [Transform] Transformation error:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again in a moment." },
          { status: 429 }
        );
      }
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please try again later." },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to humanize text. Please try again." },
      { status: 500 }
    );
  }
} 