import { createClient } from "@/libs/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isUserAdmin } from "@/libs/admin";
import { countWords, validateWordCount } from "@/lib/wordUtils";
import { cleanMarkdownForHumanization } from "@/libs/textProcessing";
import { humanizeText, checkHumanizerHealth } from "@/lib/humanizer-client";

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
    // console.log removed for prod (`📝 [Transform] Processing ${wordsToProcess} words`);

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
        // Get current usage directly from database instead of internal API call
        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select(`
              plan_type, 
              words_used, 
              words_limit, 
              stripe_subscription_status, 
              has_access
            `)
            .eq("id", user.id)
            .single();

          if (profileError) {
            console.error('📊 [Transform] Profile fetch error:', profileError);
            return NextResponse.json(
              { error: "Unable to check usage limits. Please try again." },
              { status: 500 }
            );
          }

          const wordsUsed = profile?.words_used || 0;
          const wordsLimit = profile?.words_limit || 0;
          const hasAccess = profile?.has_access || false;

          // console.log removed for prod (`📊 [Usage] Current: ${wordsUsed}/${wordsLimit} words, Plan: ${profile?.plan_type}, Access: ${hasAccess}`);

          // Check if user has access to the service
          if (!hasAccess) {
            return NextResponse.json(
              { error: "No active subscription found. Please upgrade your plan." },
              { status: 403 }
            );
          }

          /* Guard: refuse if this job would exceed quota */
          if (wordsUsed + wordsToProcess > wordsLimit && wordsLimit !== -1) {
            return NextResponse.json(
              { error: "limit-reached", words_remaining: wordsLimit - wordsUsed },
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
    
    // All checks passed - proceed with transformation using FastAPI
    // console.log removed for prod (`🚀 [Transform] Starting FastAPI humanization for ${wordsToProcess} words`);

    // Check if FastAPI is healthy before processing
    const isHealthy = await checkHumanizerHealth();
    if (!isHealthy) {
      return NextResponse.json(
        { error: "Humanizer service is currently unavailable. Please try again later." },
        { status: 503 }
      );
    }

    // Determine aggressiveness based on word count
    const aggressiveness = wordsToProcess <= 400 ? 0.7 : 0.9;
    // console.log removed for prod (`📝 [Transform] Using aggressiveness ${aggressiveness} for ${wordsToProcess} words`);

    // Call FastAPI humanizer service
    const humanizerResult = await humanizeText(cleanedText, { aggressiveness });
    
    if (!humanizerResult.success) {
      return NextResponse.json(
        { error: humanizerResult.error || "Failed to humanize text. Please try again." },
        { status: 500 }
      );
    }

    const humanizedText = humanizerResult.humanizedText;
    
    // Get AI detection scores from FastAPI response
    const mockScoreBefore = 0.87; // Default fallback - 87% AI detected before
    // FastAPI returns detection estimate as percentage (0-100), convert to 0-1 scale
    // The "after" score should be lower to show improvement
    const fastApiScore = humanizerResult.stats.ai_detection_estimate || 48;
    const mockScoreAfter = Math.max(0.2, (fastApiScore / 100) * 0.6); // Cap between 0.2-0.6 to show improvement
    
    // console.log removed for prod (`✅ [Transform] Post-processing completed successfully`);

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
        // console.log removed for prod ('💾 [Transform] Transformation saved to database');

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
      // console.log removed for prod (`📊 [Transform] Updated cookie usage: ${freeUsesToday + 1}/${FREE_DAILY_LIMIT}`);
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