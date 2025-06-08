# Flask API Integration Setup Guide

## Overview

This guide covers the integration of the Flask humanizer API with the Next.js application for superior text humanization with 100% modification rates.

## Environment Variables

### For Local Development

Create a `.env.local` file in the `sound-real/` directory with:

```bash
# Flask Humanizer API Configuration
NEXT_PUBLIC_HUMANIZER_API_URL=http://localhost:5001
HUMANIZER_API_KEY=dev-key-for-local-testing

# Existing variables (keep these as they are)
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# etc.
```

### For Production (Vercel)

Add these environment variables in your Vercel dashboard:

```bash
NEXT_PUBLIC_HUMANIZER_API_URL=https://your-humanizer-api.railway.app
HUMANIZER_API_KEY=your-production-secret-key
```

## Flask API Setup

### 1. Install Dependencies

```bash
cd humanizer_api
pip install -r requirements.txt
```

### 2. Set Flask API Key

Create a `.env` file in the `humanizer_api/` directory:

```bash
HUMANIZER_API_KEY=dev-key-for-local-testing
```

For production deployment, set this as an environment variable on your hosting platform.

### 3. Start Flask API

```bash
cd humanizer_api
python app.py
```

The API will be available at `http://localhost:5001`

## Next.js Setup

### 1. Install Dependencies (if needed)

```bash
cd sound-real
npm install
```

### 2. Start Next.js Development Server

```bash
cd sound-real
npm run dev
```

The app will be available at `http://localhost:3000`

## Testing the Integration

### 1. Health Check

Visit: `http://localhost:5001/health`

Should return:
```json
{
  "status": "healthy",
  "service": "humanizer-api",
  "version": "1.0.0",
  "uptime_seconds": 123.45,
  "stats": {...}
}
```

### 2. Test API Directly

```bash
curl -X POST http://localhost:5001/test \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key-for-local-testing" \
  -d '{"text": "The research clearly shows that artificial intelligence will revolutionize everything."}'
```

### 3. Test Through Next.js

1. Go to `http://localhost:3000/dashboard/humanize`
2. Enter some text
3. Click "Humanize"
4. Should see the Flask API processing the text with high modification rates

## Key Features

### Response Format Transformation

The integration automatically transforms Flask API responses:
- `humanized_text` → `humanizedText` (camelCase)
- `changes_made` → `changesMade`
- `processing_time` → `processingTime`
- etc.

### Fallback Handling

- Health check before processing
- Graceful error handling
- Maintains original functionality if Flask API is unavailable

### Performance Optimization

- 30-second timeout for large texts
- 5-second timeout for health checks
- Comprehensive error logging

## Production Deployment

### Flask API Deployment Options

1. **Railway** (Recommended)
   - Connect your GitHub repo
   - Set `HUMANIZER_API_KEY` environment variable
   - Deploy automatically

2. **Render**
   - Connect your GitHub repo
   - Set environment variables
   - Use Python runtime

3. **AWS/Google Cloud**
   - Containerize with Docker
   - Set up load balancing
   - Configure auto-scaling

### Next.js Deployment (Vercel)

1. Set environment variables in Vercel dashboard
2. Deploy as usual
3. Verify Flask API connectivity

## Monitoring and Debugging

### Flask API Logs

Check `humanizer_api.log` for processing logs:
```bash
tail -f humanizer_api/humanizer_api.log
```

### Next.js Logs

Check Vercel function logs or local console for integration status.

### Common Issues

1. **CORS Errors**: Ensure your production domain is added to Flask CORS configuration
2. **API Key Issues**: Verify environment variables are set correctly
3. **Timeout Errors**: Check network connectivity between services

## Performance Metrics

Expected performance with Flask API:
- **Modification Rate**: 85-100% (vs 40-60% with OpenAI)
- **Processing Time**: 5-50ms (vs 2-5 seconds with OpenAI)
- **Cost**: Significantly lower operational costs
- **Reliability**: No external API dependencies

## Security Notes

1. Use strong API keys in production
2. Implement rate limiting if needed
3. Monitor API usage and costs
4. Keep Flask API updated

## Success Criteria

✅ Flask API responds to health checks  
✅ Next.js can authenticate with Flask API  
✅ Text processing works end-to-end  
✅ Response format transformation works  
✅ Error handling and fallbacks work  
✅ Performance meets expectations (85%+ modification rate)  
✅ All existing functionality continues working 