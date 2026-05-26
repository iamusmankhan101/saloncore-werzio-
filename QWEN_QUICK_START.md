# Qwen Image Edit - Quick Start Guide

## What Changed?

Your virtual try-on feature now uses **Qwen Image Edit** instead of FLUX text-to-image generation. This means:

✅ **Better Results**: Preserves the person's face and identity  
✅ **True Editing**: Modifies only hair/makeup, not the entire image  
✅ **Still Free**: No API key required for basic usage  
✅ **Faster with Token**: Optional Together AI upgrade for speed  

## How to Use

### 1. Basic Usage (Free)
No setup required! Just use the try-on feature:

1. Upload a client photo
2. Select a hair color, style, or makeup preset
3. Click "Generate Try-On"
4. Wait 20-40 seconds for the result

### 2. Faster Results (Optional)
For faster generation (4-8 seconds), add a Together AI API key:

1. Sign up at [together.ai](https://together.ai) (get $25 free credits)
2. Get your API key from the dashboard
3. Add to your `.env.local`:
   ```
   TOGETHER_API_KEY=your_api_key_here
   ```
4. Restart your dev server

## API Changes

### Before (FLUX)
```typescript
// Generated entirely new images
const response = await fetch(HF_API_URL, {
  body: JSON.stringify({
    inputs: "portrait of woman with red hair",  // No input image
    parameters: { num_inference_steps: 4 }
  })
});
```

### After (Qwen)
```typescript
// Edits the input image
const response = await fetch(HF_API_URL, {
  body: JSON.stringify({
    inputs: {
      image: base64Data,           // Input image provided
      prompt: "red hair"           // What to change
    },
    parameters: {
      guidance_scale: 7.5,
      num_inference_steps: 20
    }
  })
});
```

## Expected Behavior

### Hair Color Changes
- **Input**: Photo of person with brown hair
- **Prompt**: "jet black hair"
- **Output**: Same person with black hair, face unchanged

### Hairstyle Changes
- **Input**: Photo of person with long hair
- **Prompt**: "short pixie cut"
- **Output**: Same person with short hair, face unchanged

### Makeup Application
- **Input**: Photo of person with minimal makeup
- **Prompt**: "bold red lipstick"
- **Output**: Same person with red lips, face unchanged

## Troubleshooting

### "Model is loading" Error
**Cause**: Hugging Face is loading the model (cold start)  
**Solution**: Wait 30-60 seconds and try again  
**Prevention**: Use Together AI API key for instant results

### Slow Generation
**Cause**: Free tier has variable speed  
**Solution**: 
- Reduce image size (under 768px)
- Use Together AI API key
- Try during off-peak hours

### Poor Quality Results
**Cause**: Unclear prompt or low-quality input image  
**Solution**:
- Use high-quality, well-lit photos
- Try preset styles instead of custom prompts
- Ensure face is clearly visible

### Timeout Errors
**Cause**: Request took longer than 60 seconds  
**Solution**:
- Reduce image size
- Retry the request
- Check internet connection

## Performance Tips

### For Best Results
1. **Image Quality**: Use clear, well-lit photos
2. **Image Size**: 512-768px works best
3. **Face Position**: Front-facing or slight angle
4. **Lighting**: Even, natural lighting preferred
5. **Background**: Simple backgrounds work better

### For Faster Generation
1. **Use API Key**: Together AI is 5-10x faster
2. **Smaller Images**: Resize to 512px if speed is critical
3. **Simple Prompts**: Shorter prompts process faster
4. **Warm Model**: Second request is faster than first

## Cost Comparison

| Service | Speed | Cost | Quality | Setup |
|---------|-------|------|---------|-------|
| **Hugging Face (Free)** | 20-40s | $0 | Good | None |
| **Together AI** | 4-8s | ~$0.01 | Good | API Key |

## Testing Checklist

Before deploying to production:

- [ ] Test with various hair colors
- [ ] Test with different hairstyles
- [ ] Test with makeup presets
- [ ] Test with custom prompts
- [ ] Test with different image sizes
- [ ] Test with poor quality images
- [ ] Test error handling (timeout, loading)
- [ ] Test with and without API key

## Next Steps

1. **Test the Feature**: Try uploading various photos
2. **Monitor Performance**: Check generation times
3. **Gather Feedback**: Ask users about result quality
4. **Consider Upgrade**: If speed is important, add API key
5. **Fine-tune Prompts**: Adjust presets based on results

## Support Resources

- **Model Documentation**: [Qwen Image Edit on Hugging Face](https://huggingface.co/Qwen/Qwen-Image-Edit-2511)
- **API Reference**: [Hugging Face Inference API](https://huggingface.co/docs/api-inference/index)
- **Together AI**: [together.ai](https://together.ai)
- **Implementation Details**: See `QWEN_IMAGE_EDIT_IMPLEMENTATION.md`

## Questions?

Common questions answered:

**Q: Do I need an API key?**  
A: No, the free tier works without any API key.

**Q: How many requests can I make?**  
A: ~1000 per day on free tier, unlimited with API key.

**Q: Can I use my own Hugging Face API key?**  
A: Currently only Together AI is supported, but HF key support can be added.

**Q: Why is the first request slow?**  
A: The model needs to load (cold start). Subsequent requests are faster.

**Q: Can I customize the prompts?**  
A: Yes! Use the custom prompt field or edit the presets in the code.
