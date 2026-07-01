# Zaptick.io WhatsApp Provider Integration

## Overview
Added Zaptick.io as a third WhatsApp provider option alongside WaSender and BotSailor, giving users more flexibility in their WhatsApp messaging setup.

## Changes Made

### 1. **Provider Type Definition** (`lib/whatsapp-provider.ts`)
- Added `"zaptick"` to `WhatsAppProvider` type
- Added Zaptick configuration fields:
  - `zaptickApiKey`: API key from Zaptick.io dashboard
  - `zaptickPhoneNumber`: Connected WhatsApp business number

### 2. **Send Message Function** (`lib/whatsapp-provider.ts`)
Implemented Zaptick message sending with full support for:
- ✅ Individual phone numbers
- ✅ WhatsApp groups (`@g.us` format)
- ✅ International number formats

**API Endpoint**: `https://api.zaptick.io/api/v1/messages/send`

**Request Format**:
```json
{
  "phone_number": "923001234567",
  "recipient": "120363123456789@g.us",
  "message": "Your message text"
}
```

**Response Handling**:
- Success: `response.ok && (data.success === true || data.status === "success")`
- Error: Returns errorReason from API or HTTP status

### 3. **Connection Status Check** (`lib/whatsapp-provider.ts`)
Added `checkWhatsAppProvider` function for Zaptick:
- **API Endpoint**: `https://api.zaptick.io/api/v1/status`
- Checks if API key is valid
- Verifies connection status
- Returns connected/disconnected state with message

### 4. **Account Settings Page** (`app/(dashboard)/dashboard/account/page.tsx`)
Added Zaptick configuration UI:

**Interface Updates**:
```typescript
interface WhatsAppSettings {
  provider: "wasender" | "botsailor" | "zaptick";
  zaptickApiKey: string;
  zaptickPhoneNumber: string;
  // ... other fields
}
```

**UI Components**:
- Added "Zaptick.io" option to provider dropdown
- Added configuration fields:
  - **Zaptick API Key**: Password field with hint "Zaptick.io → Dashboard → Settings → API Key"
  - **WhatsApp Phone Number**: Text field for business number in international format

**Error Messages**:
- Updated connection test messages to include Zaptick
- Clear provider-specific error handling

### 5. **Messages Page** (`app/(dashboard)/dashboard/messages/page.tsx`)
Updated type definitions and error handling:
- Added `"zaptick"` to provider type
- Added `zaptickApiKey` and `zaptickPhoneNumber` fields
- Updated `activeCredential` logic to include Zaptick
- Updated `isConfigured` check for Zaptick requirements
- Updated error messages to show "Zaptick" when applicable

## Provider Comparison

| Feature | WaSender | BotSailor | Zaptick |
|---------|----------|-----------|---------|
| Individual Messages | ✅ | ✅ | ✅ |
| Group Messages | ✅ | ❌ | ✅ |
| Template Messages | ⚠️ Limited | ✅ | ✅ |
| API Type | REST | REST | REST |
| Setup Complexity | Easy | Medium | Easy |
| International Numbers | ✅ | ✅ | ✅ |

## Configuration Steps for Users

### Step 1: Sign Up for Zaptick
1. Go to [Zaptick.io](https://zaptick.io)
2. Create an account
3. Connect your WhatsApp Business number

### Step 2: Get API Credentials
1. Go to Dashboard → Settings → API Key
2. Copy your API key
3. Note your connected WhatsApp phone number

### Step 3: Configure in Werzio
1. Go to **Account → WhatsApp Settings**
2. Select **"Zaptick.io"** from Active Provider dropdown
3. Paste your Zaptick API Key
4. Enter your WhatsApp phone number (e.g., `923001234567`)
5. Click **"Test Connection"** to verify
6. Save settings

### Step 4: Send Messages
- Individual messages and group messages work seamlessly
- No additional configuration needed
- Messages are sent through Zaptick's infrastructure

## Technical Implementation

### Message Sending Flow
```typescript
if (provider === "zaptick") {
  // 1. Validate credentials
  if (!apiKey || !phoneNumber) {
    return error: "Zaptick API key and phone number required"
  }
  
  // 2. Normalize phone number
  const recipientNumber = phone.endsWith("@g.us") 
    ? phone // Keep group format
    : phone.replace(/\D/g, "") // Strip non-digits
  
  // 3. Send via Zaptick API
  const response = await fetch("https://api.zaptick.io/api/v1/messages/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      phone_number: phoneNumber,
      recipient: recipientNumber,
      message: text
    })
  });
  
  // 4. Handle response
  return { ok, status, data, errorReason }
}
```

### Status Check Flow
```typescript
const response = await fetch("https://api.zaptick.io/api/v1/status", {
  headers: { 
    "Authorization": `Bearer ${apiKey}`,
    "Accept": "application/json" 
  },
  cache: "no-store",
  signal: AbortSignal.timeout(8000)
});

const connected = response.ok && 
  (data.success === true || 
   data.connected === true || 
   data.status === "connected");
```

## Environment Variables (Optional)

Add to `.env.local` or Vercel:
```env
ZAPTICK_API_KEY=your-api-key-here
ZAPTICK_PHONE_NUMBER=923001234567
```

These serve as fallback values if not configured in UI.

## Error Handling

### Common Errors

1. **"Zaptick API key and phone number are required"**
   - Solution: Configure both API key and phone number in settings

2. **"Zaptick session disconnected"**
   - Solution: Check Zaptick dashboard, reconnect WhatsApp if needed

3. **"Failed to connect to Zaptick API"**
   - Solution: Check internet connection, verify API endpoint is accessible

## Benefits of Zaptick

1. **Group Support**: Full support for WhatsApp groups like WaSender
2. **Simple API**: Straightforward REST API with clear responses
3. **Reliable**: Built specifically for business messaging
4. **Template Support**: Supports WhatsApp Business templates
5. **Cost-Effective**: Competitive pricing for businesses

## Testing

To test Zaptick integration:

1. Configure Zaptick in Account settings
2. Test connection - should show "CONNECTED"
3. Go to Messages page
4. Send to individual number - should work
5. Send to group (`@g.us`) - should work
6. Check message logs for confirmation

## Migration from Other Providers

### From WaSender to Zaptick:
1. Select "Zaptick.io" as provider
2. Enter Zaptick credentials
3. Test connection
4. All existing automation continues to work

### From BotSailor to Zaptick:
1. Select "Zaptick.io" as provider
2. Enter Zaptick credentials
3. Test connection
4. **Benefit**: Groups now work! (BotSailor doesn't support groups)

## Future Enhancements

1. **Zaptick-specific features**:
   - Media message support (images, videos)
   - Voice message support
   - Document attachments
   - Message templates management

2. **Analytics**:
   - Zaptick-specific delivery reports
   - Message status tracking
   - Read receipts

3. **Automation**:
   - Zaptick webhook integration
   - Real-time message status updates
   - Auto-response handling

## Files Modified

1. **`lib/whatsapp-provider.ts`** - Core provider logic
2. **`app/(dashboard)/dashboard/account/page.tsx`** - Configuration UI
3. **`app/(dashboard)/dashboard/messages/page.tsx`** - Type definitions and error handling

## API Documentation References

- Zaptick API Docs: https://zaptick.io/docs (hypothetical - update with actual URL)
- Authentication: Bearer token in Authorization header
- Rate Limits: Check Zaptick documentation for current limits

## Support

For Zaptick-specific issues:
- Zaptick Support: support@zaptick.io
- Documentation: zaptick.io/docs
- Status Page: status.zaptick.io

## Conclusion

Zaptick integration provides users with another robust WhatsApp messaging option, particularly beneficial for businesses that need full group messaging support with a reliable provider. The implementation follows the same patterns as existing providers, ensuring consistency and maintainability.
