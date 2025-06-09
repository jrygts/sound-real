import { describe, it, expect, beforeAll, afterAll } from 'vitest'
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

// Test users (create these in your test environment)
const testUserA = {
  email: 'test-user-a@example.com',
  password: 'testpassword123'
}

const testUserB = {
  email: 'test-user-b@example.com', 
  password: 'testpassword123'
}

describe('Row Level Security (RLS) Tests', () => {
  let supabaseA: any
  let supabaseB: any
  let userA: any
  let userB: any

  beforeAll(async () => {
    // Create separate clients for each user
    supabaseA = createClient(validatedUrl, validatedKey)
    supabaseB = createClient(validatedUrl, validatedKey)

    // Sign in as User A
    const { data: dataA, error: errorA } = await supabaseA.auth.signInWithPassword(testUserA)
    if (errorA) {
      console.error('Failed to sign in User A:', errorA)
      throw errorA
    }
    userA = dataA.user

    // Sign in as User B  
    const { data: dataB, error: errorB } = await supabaseB.auth.signInWithPassword(testUserB)
    if (errorB) {
      console.error('Failed to sign in User B:', errorB)
      throw errorB
    }
    userB = dataB.user

    console.log('✅ Test users signed in:', { userA: userA.id, userB: userB.id })
  })

  afterAll(async () => {
    // Clean up test data
    await supabaseA.from('transformations').delete().eq('user_id', userA.id)
    await supabaseB.from('transformations').delete().eq('user_id', userB.id)
    
    // Sign out
    await supabaseA.auth.signOut()
    await supabaseB.auth.signOut()
  })

  it('should create transformations for each user', async () => {
    // User A creates a transformation
    const { data: transformA, error: errorA } = await supabaseA
      .from('transformations')
      .insert({
        user_id: userA.id,
        original_text: 'Test text from User A',
        humanized_text: 'Humanized text from User A',
        word_count: 5
      })
      .select()
      .single()

    expect(errorA).toBeNull()
    expect(transformA).toBeTruthy()
    expect(transformA.user_id).toBe(userA.id)

    // User B creates a transformation
    const { data: transformB, error: errorB } = await supabaseB
      .from('transformations')
      .insert({
        user_id: userB.id,
        original_text: 'Test text from User B',
        humanized_text: 'Humanized text from User B', 
        word_count: 5
      })
      .select()
      .single()

    expect(errorB).toBeNull()
    expect(transformB).toBeTruthy()
    expect(transformB.user_id).toBe(userB.id)
  })

  it('should only allow users to read their own transformations', async () => {
    // User A should only see their own transformations
    const { data: userATransforms, error: errorA } = await supabaseA
      .from('transformations')
      .select('*')

    expect(errorA).toBeNull()
    expect(userATransforms).toBeTruthy()
    expect(userATransforms!.length).toBeGreaterThan(0)
    
    // All transformations should belong to User A
    userATransforms!.forEach((transform: any) => {
      expect(transform.user_id).toBe(userA.id)
    })

    // User B should only see their own transformations
    const { data: userBTransforms, error: errorB } = await supabaseB
      .from('transformations')
      .select('*')

    expect(errorB).toBeNull()
    expect(userBTransforms).toBeTruthy()
    expect(userBTransforms!.length).toBeGreaterThan(0)
    
    // All transformations should belong to User B
    userBTransforms!.forEach((transform: any) => {
      expect(transform.user_id).toBe(userB.id)
    })
  })

  it('should prevent users from reading other users profiles', async () => {
    // User A tries to read User B's profile
    const { data: profileB, error: errorA } = await supabaseA
      .from('profiles')
      .select('*')
      .eq('id', userB.id)

    // Should return empty result, not an error (RLS filters it out)
    expect(errorA).toBeNull()
    expect(profileB).toEqual([])

    // User B tries to read User A's profile
    const { data: profileA, error: errorB } = await supabaseB
      .from('profiles')
      .select('*')
      .eq('id', userA.id)

    // Should return empty result, not an error (RLS filters it out)
    expect(errorB).toBeNull()
    expect(profileA).toEqual([])
  })

  it('should allow users to read their own profile', async () => {
    // User A reads their own profile
    const { data: profileA, error: errorA } = await supabaseA
      .from('profiles')
      .select('*')
      .eq('id', userA.id)

    expect(errorA).toBeNull()
    expect(profileA).toBeTruthy()
    expect(profileA!.length).toBe(1)
    expect(profileA![0].id).toBe(userA.id)

    // User B reads their own profile
    const { data: profileB, error: errorB } = await supabaseB
      .from('profiles') 
      .select('*')
      .eq('id', userB.id)

    expect(errorB).toBeNull()
    expect(profileB).toBeTruthy()
    expect(profileB!.length).toBe(1)
    expect(profileB![0].id).toBe(userB.id)
  })

  it('should test increment_words_used function security', async () => {
    // User A should only be able to increment their own usage
    const { data: resultA, error: errorA } = await supabaseA
      .rpc('increment_words_used', {
        uid: userA.id,
        add_words: 10
      })

    expect(errorA).toBeNull()
    expect(resultA).toBeTruthy()
    expect(resultA.words_used).toBeGreaterThanOrEqual(10)

    // User A should NOT be able to increment User B's usage
    const { data: resultB, error: errorB } = await supabaseA
      .rpc('increment_words_used', {
        uid: userB.id,
        add_words: 10
      })

    // This should fail due to RLS - User A cannot modify User B's profile
    expect(errorB).toBeTruthy()
    expect(errorB.message).toContain('Profile not found')
  })

  it('should verify usage tracking updates correctly', async () => {
    // Get User A's profile before transformation
    const { data: beforeProfile } = await supabaseA
      .from('profiles')
      .select('words_used, transformations_used')
      .eq('id', userA.id)
      .single()

    const wordsBefore = beforeProfile?.words_used || 0
    const transformsBefore = beforeProfile?.transformations_used || 0

    // Increment usage 
    await supabaseA.rpc('increment_words_used', {
      uid: userA.id,
      add_words: 25
    })

    // Get profile after increment
    const { data: afterProfile } = await supabaseA
      .from('profiles')
      .select('words_used, transformations_used')
      .eq('id', userA.id)
      .single()

    expect(afterProfile?.words_used).toBe(wordsBefore + 25)
    expect(afterProfile?.transformations_used).toBe(transformsBefore + 1)
  })
})

// Helper function to create test users (run this manually once)
export async function createTestUsers() {
  const supabase = createClient(validatedUrl, validatedKey)

  // Create User A
  const { error: errorA } = await supabase.auth.signUp(testUserA)
  if (errorA && !errorA.message.includes('already registered')) {
    console.error('Failed to create User A:', errorA)
  }

  // Create User B
  const { error: errorB } = await supabase.auth.signUp(testUserB)
  if (errorB && !errorB.message.includes('already registered')) {
    console.error('Failed to create User B:', errorB)
  }

  console.log('✅ Test users created (or already exist)')
} 