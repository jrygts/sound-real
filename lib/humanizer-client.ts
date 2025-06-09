/**
 * Humanizer API Client
 * Connects Next.js app with Flask humanizer service
 */

interface HumanizerConfig {
  aggressiveness?: number;
  use_contractions?: boolean;
  [key: string]: any;
}

interface HumanizerRequest {
  text: string;
  config?: HumanizerConfig;
}

interface FastAPIHumanizerResponse {
  original: string;
  humanized: string;
  processing_time_ms: number;
  ai_detection_estimate: number;
  method_used: string;
  changes_applied: string[];
  word_count_change: number;
}

interface HumanizerResponse {
  humanizedText: string;
  changesMade: string[];
  stats: {
    [key: string]: any;
  };
  processingTime: number;
  originalLength: number;
  humanizedLength: number;
  changePercentage: number;
  success: boolean;
  error?: string;
}

const HUMANIZER_API_URL = process.env.NEXT_PUBLIC_HUMANIZER_API_URL || 'http://localhost:5001';
const HUMANIZER_API_KEY = process.env.HUMANIZER_API_KEY || 'dev-key-for-local-testing';

/**
 * Transform FastAPI response to match frontend expectations
 */
function transformResponse(fastapiResponse: FastAPIHumanizerResponse): HumanizerResponse {
  return {
    humanizedText: fastapiResponse.humanized,
    changesMade: fastapiResponse.changes_applied,
    stats: {
      method_used: fastapiResponse.method_used,
      ai_detection_estimate: fastapiResponse.ai_detection_estimate,
      word_count_change: fastapiResponse.word_count_change
    },
    processingTime: fastapiResponse.processing_time_ms,
    originalLength: fastapiResponse.original.length,
    humanizedLength: fastapiResponse.humanized.length,
    changePercentage: Math.abs(fastapiResponse.word_count_change),
    success: true
  };
}

/**
 * Check if FastAPI is healthy
 */
export async function checkHumanizerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${HUMANIZER_API_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Longer timeout for serverless-to-serverless calls
      signal: AbortSignal.timeout(15000)
    });
    
    return response.ok;
  } catch (error) {
    console.error('Humanizer health check failed:', error);
    return false;
  }
}

/**
 * Humanize text using FastAPI
 */
export async function humanizeText(
  text: string, 
  config: HumanizerConfig = {}
): Promise<HumanizerResponse> {
  try {
    // Map aggressiveness to FastAPI mode
    const aggressiveness = config.aggressiveness || 0.9;
    let mode = 'balanced'; // default
    if (aggressiveness >= 0.9) mode = 'aggressive';
    else if (aggressiveness <= 0.3) mode = 'fast';

    const requestBody = {
      text,
      mode,
      target_detection_rate: 20.0
    };

    // Retry logic for network issues between Vercel and Render
    let response;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Humanizer] Attempt ${attempt}/${maxRetries} calling FastAPI`);
        
        response = await fetch(`${HUMANIZER_API_URL}/humanize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          // Longer timeout for serverless-to-serverless calls (60 seconds)
          signal: AbortSignal.timeout(60000)
        });
        
        // If we get here, the fetch succeeded
        break;
        
      } catch (error) {
        lastError = error;
        console.error(`[Humanizer] Attempt ${attempt} failed:`, error.message);
        
        // If this is the last attempt, don't wait
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[Humanizer] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If all attempts failed
    if (!response) {
      throw new Error(`FastAPI connection failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return transformResponse(data);

  } catch (error) {
    console.error('Humanization failed:', error);
    
    // Return fallback response with original text
    return {
      humanizedText: text,
      changesMade: [],
      stats: {},
      processingTime: 0,
      originalLength: text.length,
      humanizedLength: text.length,
      changePercentage: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test the humanizer API with sample text
 */
export async function testHumanizer(customText?: string): Promise<HumanizerResponse> {
  const testText = customText || "The research clearly shows that artificial intelligence is definitely going to revolutionize the way we work.";
  
  try {
    const response = await fetch(`${HUMANIZER_API_URL}/test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Test failed');
    }

    // Use the first test result from the balanced mode
    const testResult = data.balanced?.[0];
    if (!testResult) {
      throw new Error('No test results available');
    }

    return {
      humanizedText: testResult.humanized.replace('...', ''),
      changesMade: ['FastAPI test transformation'],
      stats: {
        detection_rate: testResult.detection_rate,
        processing_ms: testResult.processing_ms
      },
      processingTime: testResult.processing_ms,
      originalLength: testText.length,
      humanizedLength: testResult.humanized.length,
      changePercentage: 10, // Estimated
      success: true
    };

  } catch (error) {
    console.error('Humanizer test failed:', error);
    return {
      humanizedText: testText,
      changesMade: [],
      stats: {},
      processingTime: 0,
      originalLength: testText.length,
      humanizedLength: testText.length,
      changePercentage: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    };
  }
}

/**
 * Get humanizer API statistics
 */
export async function getHumanizerStats() {
  try {
    const response = await fetch(`${HUMANIZER_API_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get humanizer stats:', error);
    return null;
  }
} 