const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAndFixProfiles() {
  console.log('🔍 Checking user profiles...\n');
  
  try {
    // Get all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(10);
      
    if (error) {
      console.error('❌ Error fetching profiles:', error.message);
      return;
    }
    
    console.log(`📊 Found ${profiles.length} profiles:\n`);
    
    for (const profile of profiles) {
      console.log(`👤 User: ${profile.email || 'No email'}`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   has_access: ${profile.has_access}`);
      console.log(`   plan_type: ${profile.plan_type || 'Not set'}`);
      console.log(`   words_limit: ${profile.words_limit || 'Not set'}`);
      console.log(`   words_used: ${profile.words_used || 0}`);
      
      // Fix access if needed
      if (!profile.has_access || !profile.plan_type) {
        console.log('   🔧 Fixing access...');
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            has_access: true,
            plan_type: 'Free',
            words_limit: 5000,
            words_used: 0,
            transformations_limit: 200,
            transformations_used: 0
          })
          .eq('id', profile.id);
          
        if (updateError) {
          console.log(`   ❌ Failed to update: ${updateError.message}`);
        } else {
          console.log('   ✅ Access granted!');
        }
      } else {
        console.log('   ✅ Access already granted');
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

checkAndFixProfiles(); 