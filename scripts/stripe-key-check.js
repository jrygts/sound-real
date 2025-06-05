#!/usr/bin/env node

/**
 * Stripe Key Production Checker
 * Fails the build if test keys are detected in environment or compiled output
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Checking for Stripe test keys...\n');

let hasTestKeys = false;

// Check environment variables
const checkEnvVar = (varName) => {
  const value = process.env[varName];
  if (value && value.includes('_test_')) {
    console.error(`❌ ${varName} contains test key: ${value.substring(0, 20)}...`);
    hasTestKeys = true;
    return true;
  }
  return false;
};

console.log('📋 Checking environment variables:');
checkEnvVar('STRIPE_SECRET_KEY');
checkEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
checkEnvVar('STRIPE_PUBLISHABLE_KEY');

// Check .env files
console.log('\n📄 Checking .env files:');
const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local'];
envFiles.forEach(envFile => {
  if (fs.existsSync(envFile)) {
    try {
      const content = fs.readFileSync(envFile, 'utf8');
      const hasTestKeys_file = content.includes('_test_');
      console.log(`🔍 Debug ${envFile}: contains _test_ = ${hasTestKeys_file}`);
      if (hasTestKeys_file) {
        console.error(`❌ ${envFile} contains test keys`);
        // Show where
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (line.includes('_test_')) {
            console.error(`   Line ${i+1}: ${line.substring(0, 50)}...`);
          }
        });
        hasTestKeys = true;
      } else {
        console.log(`✅ ${envFile} looks clean`);
      }
    } catch (error) {
      console.log(`⚠️  Could not read ${envFile}`);
    }
  }
});

// Check compiled output
console.log('\n📦 Checking compiled output:');
try {
  const result = execSync('grep -r "_test_" .next/static 2>/dev/null || true', { encoding: 'utf8' });
  if (result.trim()) {
    console.error('❌ Test keys found in compiled output:');
    console.error(result);
    hasTestKeys = true;
  } else {
    console.log('✅ No test keys in compiled output');
  }
} catch (error) {
  console.log('⚠️  Could not scan compiled output (may not be built yet)');
}

// Check source code
console.log('\n📝 Checking source code:');
try {
  const pkTestResult = execSync('grep -r "pk_test_" app components lib libs 2>/dev/null || true', { encoding: 'utf8' });
  const skTestResult = execSync('grep -r "sk_test_" app components lib libs 2>/dev/null || true', { encoding: 'utf8' });
  
  if (pkTestResult.trim() || skTestResult.trim()) {
    console.error('❌ Hardcoded test keys found in source:');
    if (pkTestResult.trim()) console.error(pkTestResult);
    if (skTestResult.trim()) console.error(skTestResult);
    hasTestKeys = true;
  } else {
    console.log('✅ No hardcoded test keys in source');
  }
} catch (error) {
  console.log('⚠️  Could not scan source code');
}

// Final result
console.log('\n' + '='.repeat(50));
if (hasTestKeys) {
  console.error('🚨 PRODUCTION BUILD FAILED: Test keys detected!');
  console.error('Replace all test keys with live keys before deploying.');
  process.exit(1);
} else {
  console.log('✅ PRODUCTION BUILD OK: No test keys detected');
  process.exit(0);
} 