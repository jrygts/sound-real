const REQUIRED_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET", 
  "OPENAI_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SITE_URL",
] as const;

// Check for required environment variables
const missingVars: string[] = [];

for (const name of REQUIRED_ENV_VARS) {
  if (!process.env[name]) {
    missingVars.push(name);
  }
}

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  for (const varName of missingVars) {
    console.error(`   - ${varName}`);
  }
  console.error('\n💡 Please check your .env.local file and add the missing variables.');
  console.error('📚 See the project documentation for setup instructions.');
  process.exit(1);
}

// console.log removed for prod ('✅ All required environment variables are present'); 