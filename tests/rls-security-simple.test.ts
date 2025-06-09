import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Environment variables are loaded in tests/setup.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables are available
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Make sure .env.local is configured.')
}

// TypeScript type assertions after validation
const validatedUrl = supabaseUrl as string
const validatedKey = supabaseAnonKey as string

describe('RLS Security Verification', () => {
  it('should prevent unauthenticated access to transformations', async () => {
    const supabase = createClient(validatedUrl, validatedKey)
    
    // Try to access transformations without authentication
    const { data, error } = await supabase
      .from('transformations')
      .select('*')
      .limit(1)

    // Should either get an error or empty results due to RLS
    if (error) {
      // If we get an error, it should be related to authentication/authorization
      expect(error.message).toContain('row-level security')
    } else {
      // If no error, we should get empty results due to RLS filtering
      expect(data).toEqual([])
    }
  })

  it('should prevent unauthenticated access to profiles', async () => {
    const supabase = createClient(validatedUrl, validatedKey)
    
    // Try to access profiles without authentication
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    // Should either get an error or empty results due to RLS
    if (error) {
      expect(error.message).toContain('row-level security')
    } else {
      expect(data).toEqual([])
    }
  })

  it('should prevent unauthenticated access to usage_tracking', async () => {
    const supabase = createClient(validatedUrl, validatedKey)
    
    // Try to access usage_tracking without authentication
    const { data, error } = await supabase
      .from('usage_tracking')
      .select('*')
      .limit(1)

    // Should either get an error or empty results due to RLS
    if (error) {
      expect(error.message).toContain('row-level security')
    } else {
      expect(data).toEqual([])
    }
  })

  it('should verify increment_words_used function exists', async () => {
    const supabase = createClient(validatedUrl, validatedKey)
    
    // Try to call the function with a fake UUID
    const { error } = await supabase
      .rpc('increment_words_used', { 
        uid: '00000000-0000-0000-0000-000000000000', 
        add_words: 0 
      })

    // Should get an error, but not "function does not exist"
    expect(error).toBeTruthy()
    expect(error!.message).not.toContain('function "increment_words_used" does not exist')
    
    // Should get either "Profile not found" or auth-related error
    const validErrors = [
      'Profile not found',
      'row-level security',
      'authentication',
      'permission denied'
    ]
    
    const hasValidError = validErrors.some(validError => 
      error!.message.toLowerCase().includes(validError.toLowerCase())
    )
    
    expect(hasValidError).toBe(true)
  })

  it('should verify database tables exist and are accessible', async () => {
    const supabase = createClient(validatedUrl, validatedKey)
    
    const tables = ['profiles', 'transformations', 'usage_tracking']
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(0) // Just check if table exists, don't fetch data
      
      // Error should not be "relation does not exist" (table missing)
      if (error) {
        expect(error.message).not.toContain('relation "' + table + '" does not exist')
      }
    }
  })
})

// Optional: Test with real authentication if credentials are provided
describe('RLS with Authentication (Optional)', () => {
  const testEmail = process.env.TEST_USER_EMAIL
  const testPassword = process.env.TEST_USER_PASSWORD

  it('should allow authenticated users to access their own data', async () => {
    if (!testEmail || !testPassword) {
      console.log('⏭️  Skipping auth test - TEST_USER_EMAIL and TEST_USER_PASSWORD not provided')
      return
    }

    const supabase = createClient(validatedUrl, validatedKey)
    
    // Sign in with test credentials
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    if (authError) {
      console.log('⏭️  Skipping auth test - failed to sign in:', authError.message)
      return
    }

    expect(authData.user).toBeTruthy()

    // Test profile access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, plan_type, words_used, words_limit')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      // Profile might not exist yet, that's ok
      expect(profileError.message).toContain('no rows returned')
    } else {
      expect(profile.id).toBe(authData.user.id)
    }

    // Test transformations access (should return user's data or empty array)
    const { data: transformations, error: transformError } = await supabase
      .from('transformations')
      .select('id, user_id')
      .limit(5)

    expect(transformError).toBeNull()
    expect(Array.isArray(transformations)).toBe(true)
    
    // If there are transformations, they should all belong to the current user
    if (transformations && transformations.length > 0) {
      transformations.forEach((transform: any) => {
        expect(transform.user_id).toBe(authData.user.id)
      })
    }

    // Clean up
    await supabase.auth.signOut()
  })
}) 