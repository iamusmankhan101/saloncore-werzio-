# Qwen Image Edit Implementation

## Overview
The virtual try-on feature now uses **Qwen/Qwen-Image-Edit-2511** from Hugging Face, a state-of-the-art image editing model that's specifically designed for modifying existing images while preserving the original subject's identity and features.

## Why Qwen Image Edit?

### Advantages over Text-to-Image Models
1. **Preserves Identity**: Unlike text-to-image models (like FLUX), Qwen Image Edit maintains the original person's facial features and identity
2. **True Image Editing**: Modifies only the requested aspects (hair color, style, makeup) without regenerating the entire image
3. **Better Context Understanding**: Works with the input image directly, understanding what needs to be changed
4. **Free Tier Available**: Hugging Face provides free inference API access

### Previous Approach Issues
- **FLUX.1-schnell**: Generated entirely new images, often changing the person's face
- **Color Overlay**: Simple but unrealistic, just tinted the hair region without proper texture

## Technical Implementation

### API Endpoint
```
https://api-inference.huggingface.co/models/Qwen/Qwen-Image-Edit-2511
```

### Request Format
```json
{
  "inputs": {
    "image": "base64_encoded_image_data",
    "prompt": "description of desired changes"
  },
  "parameters": {
    "guidance_scale": 7.5,
    "num_inference_steps": 20
  }
}
```

### Key Parameters
- **guidance_scale**: 7.5 (controls how closely the model follows the prompt)
- **num_inference_steps**: 20 (quality vs speed tradeoff)
- **timeout**: 60 seconds (image editing takes longer than text-to-image)

## How It Works

### 1. Image Upload
- Client uploads a photo
- Image is resized to max 768px for optimal processing
- Converted to base64 for API transmission

### 2. Style Selection
- User selects from preset styles (hair colors, hairstyles, makeup)
- Or enters custom prompt for specific changes

### 3. API Processing
```typescript
// Extract base64 data without data URL prefix
const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

// Simplify prompt for better results
const simplifiedPrompt = prompt
  .replace(/Apply\s+/gi, '')
  .replace(/to the woman in the uploaded image,?\s*/gi, '')
  .replace(/virtual try-on/gi, '')
  .replace(/seamless/gi, '')
  .trim();

// Send to Qwen Image Edit API
const response = await fetch(HF_API_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    inputs: {
      image: base64Data,
      prompt: simplifiedPrompt,
    },
    parameters: {
      guidance_scale: 7.5,
      num_inference_steps: 20,
    }
  }),
});
```

### 4. Result Processing
- API returns edited image as binary data
- Convert to base64 and display to user
- Optional: Composite with hair mask for enhanced results

## Fallback Strategy

The implementation includes a tiered approach:

1. **Together AI** (if API token provided)
   - Fastest, paid service
   - Uses FLUX.1-schnell-Free
   - ~4-8 seconds generation time

2. **Hugging Face Qwen** (free tier)
   - Free, no API key required
   - Better quality for image editing
   - ~20-40 seconds generation time

## Prompt Engineering

### Original Prompts
```
"Apply jet black shiny glossy hair color to the woman in the uploaded image, 
keeping natural hair texture and realistic lighting, rich deep black 
salon-finish hair, seamless virtual try-on"
```

### Simplified for Qwen
```
"jet black shiny glossy hair color, keeping natural hair texture and 
realistic lighting, rich deep black salon-finish hair"
```

**Why simplify?**
- Removes redundant instructions ("Apply", "to the woman")
- Focuses on the desired outcome
- Reduces token count
- Improves model understanding

## Error Handling

### Model Loading State
```typescript
if (errorData.estimated_time) {
  return Response.json({ 
    error: `Model is loading. Please wait ${Math.ceil(errorData.estimated_time)} seconds and try again.`,
    isLoading: true,
    estimatedTime: errorData.estimated_time
  }, { status: 503 });
}
```

### Timeout Handling
- 60-second timeout for API requests
- Graceful error messages to user
- Retry option available

## Performance Considerations

### Expected Timing
- **Model Cold Start**: 30-60 seconds (first request)
- **Model Warm**: 20-30 seconds (subsequent requests)
- **With API Token**: 4-8 seconds (Together AI)

### Optimization Tips
1. Keep images under 768px for faster processing
2. Use simple, clear prompts
3. Consider caching results for popular styles
4. Implement request queuing for multiple users

## Future Enhancements

### Potential Improvements
1. **Fine-tuning**: Train on salon-specific images for better results
2. **Batch Processing**: Process multiple styles at once
3. **Real-time Preview**: Show progressive results during generation
4. **Style Transfer**: Learn from uploaded reference images
5. **API Key Support**: Add Hugging Face API key for higher rate limits

### Alternative Models to Consider
- **InstantID**: For better identity preservation
- **IP-Adapter**: For style reference images
- **ControlNet**: For precise control over edits

## Cost Analysis

### Free Tier (Hugging Face)
- **Cost**: $0
- **Rate Limit**: ~1000 requests/day
- **Speed**: 20-40 seconds
- **Quality**: Good for image editing

### Paid Tier (Together AI)
- **Cost**: ~$0.008-0.015 per generation
- **Rate Limit**: Based on credits
- **Speed**: 4-8 seconds
- **Quality**: Good for text-to-image

### Recommendation
- Start with free tier for testing
- Upgrade to paid for production with high traffic
- Consider hybrid approach: free for demos, paid for actual clients

## Testing

### Test Cases
1. **Hair Color Changes**: Black, blonde, red, purple
2. **Hairstyle Changes**: Short, long, curly, straight
3. **Makeup Application**: Natural, dramatic, bridal
4. **Edge Cases**: Multiple people, side profiles, poor lighting

### Quality Metrics
- Identity preservation (does it look like the same person?)
- Realism (does the edit look natural?)
- Accuracy (does it match the requested style?)
- Speed (acceptable generation time?)

## Troubleshooting

### Common Issues

**Issue**: Model loading error
**Solution**: Wait 30-60 seconds and retry

**Issue**: Empty response
**Solution**: Check image format and size

**Issue**: Poor quality results
**Solution**: Simplify prompt, ensure good input image quality

**Issue**: Timeout errors
**Solution**: Reduce image size, increase timeout duration

## References

- [Qwen Image Edit Model Card](https://huggingface.co/Qwen/Qwen-Image-Edit-2511)
- [Hugging Face Inference API Docs](https://huggingface.co/docs/api-inference/index)
- [Together AI Documentation](https://docs.together.ai/)

## Support

For issues or questions:
1. Check Hugging Face model status page
2. Review API error messages
3. Test with simpler prompts
4. Consider upgrading to paid tier for reliability
