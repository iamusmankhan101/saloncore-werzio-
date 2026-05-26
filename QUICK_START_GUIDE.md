# Virtual Try-On - Quick Start Guide

## 🎉 Good News: It's Now FREE!

The virtual try-on feature now uses **free Stable Diffusion AI** - no credit card or API key required!

## How to Use

### Basic Usage (Free - No Setup Required)

1. **Navigate to Virtual Try-On**
   - Go to Dashboard → Virtual Try-On

2. **Upload Client Photo**
   - Click "Upload client photo"
   - Select a clear portrait photo (JPG or PNG)
   - Best results: front-facing, good lighting, visible hair

3. **Choose a Style**
   - Select a category: Hair Color, Hairstyle, Makeup, or Highlights
   - Click on any preset style (e.g., "Golden Blonde", "Short Pixie")
   - OR write a custom prompt in the text box

4. **Generate**
   - Click "Generate Try-On"
   - Wait 15-30 seconds for AI to process
   - View the before/after comparison

5. **Save & Share**
   - Click "Save" to download the result
   - Show it to your client
   - Book the service!

### Advanced Usage (Optional - Faster Processing)

For faster generation and higher rate limits, add a free Hugging Face token:

1. **Get a Token**
   - Visit [huggingface.co](https://huggingface.co/join)
   - Sign up for free
   - Go to Settings → Access Tokens
   - Create a token with "Read" permissions
   - Copy the token (starts with `hf_`)

2. **Add to Settings**
   - Go to Dashboard → Settings
   - Click "AI Integrations" in the sidebar
   - Paste your token in the "Hugging Face Token" field
   - Click "Save Changes"

3. **Enjoy Faster Processing**
   - Generations will be faster
   - Higher rate limits
   - Better reliability during peak times

## Tips for Best Results

### Photo Quality
- ✅ Clear, well-lit photos
- ✅ Front-facing portraits
- ✅ Visible hair and face
- ❌ Avoid blurry or dark photos
- ❌ Avoid extreme angles

### Prompts
- Be specific: "warm caramel balayage" vs "brown hair"
- Include texture: "silky straight", "bouncy curls"
- Mention style: "professional salon portrait"
- Keep it natural: AI works best with realistic requests

### Presets
- Start with presets - they're optimized for best results
- Experiment with different categories
- Combine ideas in custom prompts

## Troubleshooting

### "Model is loading" Error
**Cause:** AI model is starting up (first use or after inactivity)
**Solution:** Wait 20-30 seconds and click "Try Again"

### Slow Generation
**Cause:** Using free tier without authentication
**Solution:** Add a Hugging Face token (see Advanced Usage above)

### Rate Limit Error
**Cause:** Too many requests in short time
**Solution:** 
- Wait a few minutes
- Add a Hugging Face token for higher limits

### Poor Results
**Cause:** Photo quality or prompt issues
**Solution:**
- Use a clearer, better-lit photo
- Try a different preset
- Adjust your custom prompt to be more specific

## Cost Comparison

| Feature | Old (Replicate) | New (Stable Diffusion) |
|---------|----------------|------------------------|
| Cost per generation | PKR 2-3 | **FREE** |
| Setup required | API key + credit card | None |
| Quality | Excellent | Excellent |
| Speed | 4-15 seconds | 15-30 seconds |
| Rate limits | Based on payment | Free tier (upgradeable) |

## Example Prompts

### Hair Color
- "vibrant golden blonde hair, warm bright blonde hair color, professional salon portrait"
- "rich dark chocolate brown hair, glossy brunette hair color, professional salon portrait"
- "platinum silver blonde hair, icy cool platinum hair color, professional salon portrait"

### Hairstyle
- "short pixie cut hairstyle, stylish short cropped hair, professional salon portrait"
- "long straight silky smooth flowing hair, sleek straight hairstyle, professional salon portrait"
- "loose effortless beach waves hair, tousled wavy hairstyle, professional salon portrait"

### Makeup
- "natural glowing makeup, dewy fresh skin, subtle blush, healthy glow, professional beauty portrait"
- "dramatic smoky eye makeup, dark blended eyeshadow, bold eyes, professional beauty portrait"
- "bold classic red lipstick, vibrant red lips, professional beauty portrait"

### Custom Combinations
- "same person with warm chestnut brown hair and soft waves, natural makeup, professional salon portrait"
- "platinum blonde pixie cut with side swept bangs, bold red lip, professional salon portrait"
- "long dark hair with caramel highlights, beach waves, natural glowing makeup"

## Privacy & Data

- Photos are processed in real-time
- Not stored on Hugging Face servers
- Processed client-side for face preservation
- Only hair region is sent to AI
- Results can be saved locally

## Support

Need help? Check:
- [Full Setup Guide](./STABLE_DIFFUSION_SETUP.md)
- [Changes Summary](./CHANGES_SUMMARY.md)
- [Hugging Face Documentation](https://huggingface.co/docs/api-inference/index)

## What's Next?

Future enhancements planned:
- Multiple AI model options
- Better face preservation with ControlNet
- Batch processing for multiple clients
- Style history and favorites
- Direct booking integration

---

**Enjoy your free AI-powered virtual try-on! 🎨✨**
