import { createClient } from "@/libs/supabase/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { cookies } from "next/headers";
import { cleanMarkdownForHumanization } from "@/libs/textProcessing";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FREE_DAILY_LIMIT = 3;

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { text } = await request.json();
    
    // Validate input - Fix: Count words instead of characters
    const wordCount = text?.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    if (!text || wordCount < 1 || wordCount > 1000) {
      return NextResponse.json(
        { error: "Text must be between 1 and 1000 words" },
        { status: 400 }
      );
    }
    
    // NEW: Clean markdown before AI processing
    const cleanedText = cleanMarkdownForHumanization(text);
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    // Handle free usage
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
          { error: "Daily limit reached. Please sign up for unlimited access!" },
          { status: 403 }
        );
      }
      
      // Update cookies
      cookies().set("free_uses_today", (currentUses + 1).toString());
      cookies().set("last_reset_date", today);
    } else {
      // Check subscription for logged-in users
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_subscription_status")
        .eq("id", user.id)
        .single();
        
      if (profile?.stripe_subscription_status !== "active") {
        // Check free tier limits
        const { data: usage } = await supabase
          .from("usage_tracking")
          .select("*")
          .eq("user_id", user.id)
          .single();
          
        const today = new Date().toDateString();
        const lastReset = usage?.last_reset_date ? new Date(usage.last_reset_date).toDateString() : "";
        
        let todayUses = usage?.free_uses_today || 0;
        if (lastReset !== today) {
          todayUses = 0;
          // Reset daily uses
          await supabase
            .from("usage_tracking")
            .upsert({
              user_id: user.id,
              free_uses_today: 0,
              last_reset_date: new Date().toISOString()
            });
        }
        
        if (todayUses >= FREE_DAILY_LIMIT) {
          return NextResponse.json(
            { error: "Daily limit reached. Upgrade to Pro for unlimited!" },
            { status: 403 }
          );
        }
      }
    }
    
    // Transform text with OpenAI
    const prompt = `You are an expert at rewriting AI-generated text to sound naturally human. The text below has been cleaned of markdown formatting to help you focus on creating natural, conversational content.

Your task is to rewrite this text to:
- Use varied sentence structures and natural rhythm
- Include subtle human writing patterns and transitions  
- Add conversational elements where appropriate
- Maintain the original meaning and all factual information
- Create engaging, readable prose that flows naturally
- Eliminate robotic or repetitive AI patterns
- Sound like it was written by a knowledgeable human, not an AI

Focus on making the text feel authentic and naturally written while preserving all the important information.

Text to humanize:
${cleanedText}

Natural, human-sounding version:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert at transforming AI-generated text into natural, human-sounding content. Focus on creating authentic, conversational prose that maintains factual accuracy while eliminating robotic patterns."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: Math.min(cleanedText.split(/\s+/).length * 2, 2000),
    });
    
    const humanizedText = completion.choices[0].message.content || cleanedText;
    
    // Mock AI detection scores
    const aiScoreBefore = 0.87 + Math.random() * 0.12;
    const aiScoreAfter = 0.08 + Math.random() * 0.17;
    
    // Save transformation for logged-in users
    if (user) {
      await supabase.from("transformations").insert({
        user_id: user.id,
        original_text: text, // Keep original with markdown for reference
        humanized_text: humanizedText,
        ai_score_before: aiScoreBefore,
        ai_score_after: aiScoreAfter,
        word_count: cleanedText.split(/\s+/).length,
      });
      
      // Update usage
      await supabase.rpc("increment", { 
        table_name: "usage_tracking",
        column_name: "free_uses_today",
        user_id: user.id 
      });
    }
    
    return NextResponse.json({
      success: true,
      humanizedText,
      aiScoreBefore,
      aiScoreAfter,
    });
    
  } catch (error) {
    console.error("Transform error:", error);
    return NextResponse.json(
      { error: "Failed to transform text" },
      { status: 500 }
    );
  }
} 