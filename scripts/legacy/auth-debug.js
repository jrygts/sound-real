// 🔍 Emergency Auth Debug Script
// Paste this in your browser console (F12) to instantly check auth state

(async function debugAuth() {
  console.log('🔍 AUTH DEBUG: Starting comprehensive auth check...');
  
  try {
    // Test 1: Check if we can import Supabase
    const { createClient } = await import('/libs/supabase/client.js');
    const supabase = createClient();
    console.log('✅ Supabase client created successfully');

    // Test 2: Check current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('📋 Current session:', sessionData.session?.user?.email || 'No active session');
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
    }

    // Test 3: Check user state
    const { data: userData, error: userError } = await supabase.auth.getUser();
    console.log('👤 Current user:', userData.user?.email || 'No user found');
    
    if (userError) {
      console.error('❌ User error:', userError);
    }

    // Test 4: Test API endpoint
    const authResponse = await fetch('/api/auth/me');
    const authData = await authResponse.json();
    console.log('🛠️ API auth check:', authData);

    // Test 5: Check localStorage for any auth tokens
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('auth')
    );
    console.log('🔑 Auth keys in localStorage:', authKeys);

    // Summary
    const isAuthenticated = !!(sessionData.session?.user || userData.user);
    console.log(
      `🎯 AUTH STATUS: ${isAuthenticated ? '✅ AUTHENTICATED' : '❌ NOT AUTHENTICATED'}`
    );
    
    if (!isAuthenticated) {
      console.log('🔗 To test magic link: Go to http://localhost:3001/signin');
      console.log('📧 After clicking magic link, check this console again');
    }

    return {
      session: sessionData.session,
      user: userData.user,
      isAuthenticated,
      apiResponse: authData
    };

  } catch (error) {
    console.error('💥 AUTH DEBUG ERROR:', error);
    console.log('🛠️ Possible issues:');
    console.log('  - Supabase client not properly configured');
    console.log('  - Environment variables missing');
    console.log('  - Module import path incorrect');
  }
})();

// Additional quick tests
console.log('🚀 Quick auth tests available:');
console.log('  - debugAuth() - Run full auth diagnostic');
console.log('  - window.location.href = "/signin" - Go to sign in page');
console.log('  - localStorage.clear() - Clear all local storage (logout)'); 