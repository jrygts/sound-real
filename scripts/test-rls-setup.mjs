#!/usr/bin/env node

/**
 * Quick RLS Setup Verification Script
 * Run with: node scripts/test-rls-setup.mjs
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRLSSetup() {
  console.log('🔍 Testing RLS Setup...\n')

  try {
    // Test 1: Check if RLS is enabled
    console.log('📋 Test 1: Checking RLS Status')
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('transformations')
      .select('id')
      .limit(1)

    if (rlsError) {
      console.log('✅ RLS is working! (Got expected auth error)')
    } else {
      console.log('⚠️  RLS might not be enabled - got data without auth')
    }

    // Test 2: Check if increment_words_used function exists
    console.log('\n📋 Test 2: Checking increment_words_used function')
    const { error: funcError } = await supabase
      .rpc('increment_words_used', { uid: '00000000-0000-0000-0000-000000000000', add_words: 0 })

    if (funcError && funcError.message.includes('function "increment_words_used" does not exist')) {
      console.log('❌ increment_words_used function not found')
      console.log('   Run the fix-rls-security.sql script first!')
    } else if (funcError && funcError.message.includes('Profile not found')) {
      console.log('✅ increment_words_used function exists (got expected profile error)')
    } else {
      console.log('✅ increment_words_used function exists')
    }

    // Test 3: Check if tables exist
    console.log('\n📋 Test 3: Checking table structure')
    const tables = ['profiles', 'transformations', 'usage_tracking']
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(0)
      if (error) {
        console.log(`❌ Table ${table} not accessible: ${error.message}`)
      } else {
        console.log(`✅ Table ${table} exists and accessible`)
      }
    }

    console.log('\n🎯 Next Steps:')
    console.log('1. If RLS is not enabled, run: fix-rls-security.sql in Supabase')
    console.log('2. Test with actual user accounts')
    console.log('3. Run: npm run test tests/rls-security.test.ts')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Helper function to test with actual authentication
async function testWithAuth(email, password) {
  console.log(`\n🔐 Testing with authenticated user: ${email}`)
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (authError) {
    console.log(`❌ Failed to sign in: ${authError.message}`)
    return
  }

  console.log(`✅ Signed in as: ${authData.user.email}`)

  // Test profile access
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, plan_type, words_used, words_limit')
    .eq('id', authData.user.id)
    .single()

  if (profileError) {
    console.log(`❌ Profile access failed: ${profileError.message}`)
  } else {
    console.log(`✅ Profile: ${JSON.stringify(profile, null, 2)}`)
  }

  // Test transformations access
  const { data: transformations, error: transformError } = await supabase
    .from('transformations')
    .select('id, user_id')
    .limit(5)

  if (transformError) {
    console.log(`❌ Transformations access failed: ${transformError.message}`)
  } else {
    console.log(`✅ Found ${transformations.length} transformations`)
    if (transformations.length > 0) {
      const userIds = [...new Set(transformations.map(t => t.user_id))]
      if (userIds.length === 1 && userIds[0] === authData.user.id) {
        console.log('✅ RLS is working - only seeing own transformations')
      } else {
        console.log('⚠️  RLS might not be working - seeing other users data')
      }
    }
  }

  await supabase.auth.signOut()
}

// Main execution
testRLSSetup().then(() => {
  console.log('\n✨ RLS setup test completed!')
  
  // Uncomment and add real credentials to test with auth
  // testWithAuth('your-test-email@example.com', 'your-test-password')
}) 