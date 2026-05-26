# Stable Diffusion Virtual Try-On Setup

## Overview

The virtual try-on feature now uses **Pollinations.ai** - a completely free AI image generation service that requires:

- ✅ **No API key** - Works immediately
- ✅ **No signup** - No account needed
- ✅ **No rate limits** - Unlimited generations
- ✅ **Fast & reliable** - Consistent performance

## How It Works

1. **Free AI Service**
   - Uses Pollinations.ai API
   - Completely free and open
   - No authentication required
   - Stable Diffusion based

2. **Image Generation**
   - Text-to-image generation
   - 768x768 resolution
   - Enhanced prompts for better quality
   - Client-side hair masking for face preservation

## API Endpoint

The integration uses:
```
https://image.pollinations.ai/prompt/{prompt}?width=768&height=768&nologo=true&enhance=true
```

## Features

- **Text-to-Image Generation**: Creates new hairstyles based on prompts
- **Hair Masking**: Preserves the client's face while changing hair
- **Multiple Presets**: Pre-configured styles for hair color, cuts, makeup, and highlights
- **Custom Prompts**: Users can write their own style descriptions
- **Instant Results**: No waiting for model loading

## Technical Details

### API Request Format

Simple GET request with URL-encoded prompt:
```
GET https://image.pollinations.ai/prompt/{encoded_prompt}?width=768&height=768&nologo=true&enhance=true
```

### Response

Returns a JPEG image directly, which is converted to base64 for display.

### Error Handling

- **Network Errors**: Clear error messages with retry option
- **Timeout**: 55-second timeout with abort controller
- **Empty Response**: Validation and error reporting

## Cost Comparison

| Service | Cost per Generation | Setup Required |
|---------|-------------------|----------------|
| Replicate (old) | PKR 2-3 | API key + credit card |
| Pollinations.ai (new) | **FREE** | None |

## Advantages

1. **Zero Setup**: Works immediately without any configuration
2. **No Limits**: Unlimited generations
3. **Fast**: No cold start delays
4. **Reliable**: Consistent uptime
5. **Simple**: Single API endpoint

## Limitations

1. **Text-to-Image Only**: Generates from scratch (not image-to-image)
2. **Fixed Resolution**: 768x768 output
3. **No Fine Control**: Limited parameters compared to full SD API

## Alternative APIs (Future Options)

If you want to switch to a different provider, here are alternatives:

### Hugging Face (Free with optional token)
```typescript
const HF_API_URL = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5";
// Requires: Optional HF token for better rate limits
```

### Replicate (Paid)
```typescript
const REPLICATE_URL = "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions";
// Requires: API token + payment
```

### Local Stable Diffusion (Self-hosted)
```typescript
const LOCAL_URL = "http://localhost:7860/sdapi/v1/txt2img";
// Requires: Local SD installation
```

## Upgrading

To switch to a different API, simply modify `app/api/try-on/route.ts` and change the API endpoint and request format.

## Troubleshooting

### "Failed to generate image" Error
- **Cause**: Network connectivity issue
- **Solution**: Check internet connection and retry

### Slow Generation
- **Cause**: Network speed or API load
- **Solution**: Wait and retry, usually resolves quickly

### Timeout Errors
- **Cause**: Request took longer than 55 seconds
- **Solution**: Retry the generation

## Support

For issues with the Pollinations.ai API:
- [Pollinations.ai Website](https://pollinations.ai/)
- [GitHub Repository](https://github.com/pollinations/pollinations)

## Migration Notes

### From Previous Version
- No migration needed
- Old Replicate code removed
- Hugging Face token field removed from settings
- Works immediately without configuration
