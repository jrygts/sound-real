-- Fix Free Trial Word Limits
-- Updates existing Free users to have 250 words instead of 0 or 5000

-- 📊 Check current state of Free users
SELECT 
  plan_type,
  words_limit,
  COUNT(*) as user_count
FROM profiles 
WHERE plan_type = 'Free'
GROUP BY plan_type, words_limit
ORDER BY words_limit;

-- 🛠️ Update ALL Free users to have correct 250-word limit
UPDATE profiles 
SET 
  words_limit = 250,
  updated_at = NOW()
WHERE 
  plan_type = 'Free' 
  AND words_limit != 250;

-- ✅ Verify the fix - all Free users should now have 250 words
SELECT 
  id,
  plan_type,
  words_limit,
  words_used,
  email,
  updated_at
FROM profiles 
WHERE plan_type = 'Free'
ORDER BY updated_at DESC
LIMIT 10;

-- 📈 Summary check
SELECT 
  plan_type,
  words_limit,
  COUNT(*) as user_count,
  AVG(words_used) as avg_words_used
FROM profiles 
WHERE plan_type = 'Free'
GROUP BY plan_type, words_limit; 