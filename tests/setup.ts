import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local for testing
config({ path: resolve(process.cwd(), '.env.local') })

// Verify required environment variables are loaded
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`)
    console.error('Make sure .env.local exists with Supabase credentials')
    process.exit(1)
  }
}

console.log('✅ Environment variables loaded for testing') 