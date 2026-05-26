# Quick Debug Steps for WhatsApp Messages

## Immediate Actions

### 1. Check BotSailor Dashboard (2 minutes)
**This is the most likely issue!**

1. Go to https://botsailor.com and log in
2. Click on **Templates** in the sidebar
3. Find template **#379788** (the one shown in your screenshot)
4. Check the status:
   - ✅ **APPROVED** = Good, template can be used
   - ⏳ **PENDING** = Waiting for WhatsApp approval (24-48 hours)
   - ❌ **REJECTED** = Template was rejected, need to create new one

**If PENDING or REJECTED:**
- You need to use a different template that's already approved
- Or wait for approval (if pending)
- Or fix and resubmit (if rejected)

### 2. Check Message Delivery Status (1 minute)
1. In BotSailor dashboard, go to **Message Logs** or **Reports**
2. Look for messages to **923058562523**
3. Check the actual delivery status:
   - **Delivered** ✅ = Message reached the phone
   - **Sent** ⏳ = Sent to WhatsApp but not confirmed delivered
   - **Failed** ❌ = Error occurred

### 3. Test with Your Own Number (2 minutes)
1. In your app, go to **Messages** page
2. Add yourself as a client (use your WhatsApp number)
3. Send a test message to yourself
4. Check if YOU receive it on your phone

**Result:**
- ✅ You receive it = Setup is correct, issue is with client's number
- ❌ You don't receive it = Issue with template or BotSailor config

## Common Issues & Quick Fixes

### Issue 1: Template Not Approved
**Symptoms:** Messages show "Sent" but never received

**Fix:**
1. BotSailor Dashboard → Templates
2. Look for templates with ✅ **APPROVED** status
3. Copy an approved template ID (e.g., #123456)
4. In your app: Account → WhatsApp
5. Update "Confirmation Template ID" to the approved one
6. Save and test again

### Issue 2: Wrong Template Variables
**Symptoms:** Messages fail or show errors in BotSailor logs

**Fix:**
1. Check your template in BotSailor
2. Note the variable placeholders (e.g., {{1}}, {{2}}, {{3}})
3. Make sure they match what your app sends:
   - {{1}} = name
   - {{2}} = service
   - {{3}} = date
   - {{4}} = time
   - {{5}} = salon_name

### Issue 3: Phone Number Issues
**Symptoms:** Specific numbers don't receive messages

**Fix:**
1. Click "Open in WhatsApp Web" for that client
2. If it opens a chat = number is valid
3. If it says "not on WhatsApp" = number is wrong or doesn't have WhatsApp
4. Update the client's phone number

## Enable Debug Logging

### Add Console Logging
To see what's actually happening, add this to your code:

**File:** `app/api/whatsapp/send/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { apiToken, phoneNumberId, templateId, phone, variables } = body;

  // ADD THIS LINE:
  console.log('📱 Sending WhatsApp:', { phone, templateId, variables });

  if (!apiToken || !phoneNumberId || !templateId || !phone) {
    return Response.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }

  const params = new URLSearchParams({
    apiToken,
    phoneNumberID: phoneNumberId,
    botTemplateID: templateId,
    sendToPhoneNumber: phone,
  });

  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      params.set(`templateVariable-${key}-1`, value);
    }
  }

  const url = `https://botsailor.com/api/v1/whatsapp/send/template?${params.toString()}`;
  
  // ADD THIS LINE:
  console.log('🔗 BotSailor URL:', url);

  const res = await fetch(url, { method: "GET" });
  const text = await res.text();

  // ADD THIS LINE:
  console.log('📥 BotSailor Response:', text);

  try {
    const data = JSON.parse(text);
    return Response.json({ ok: res.ok, status: res.status, data });
  } catch {
    return Response.json({ ok: res.ok, status: res.status, raw: text });
  }
}
```

### Check the Logs
1. Open your terminal where the dev server is running
2. Send a test message
3. Look for the console output:
   ```
   📱 Sending WhatsApp: { phone: '923058562523', templateId: '379788', ... }
   🔗 BotSailor URL: https://botsailor.com/api/v1/whatsapp/send/template?...
   📥 BotSailor Response: {"success":false,"error":"Template not approved"}
   ```

The response will tell you exactly what's wrong!

## Check Browser Console

1. Open your app in browser
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Send a test message
5. Look for any errors or the API response

## Most Likely Solution

Based on your screenshot showing messages as "Sent" but not received:

### **The template #379788 is probably not approved yet**

**What to do:**
1. ✅ Log into BotSailor
2. ✅ Check template #379788 status
3. ✅ If not approved, find an approved template
4. ✅ Update template ID in your app
5. ✅ Test again

**OR**

1. ✅ Wait for template approval (24-48 hours)
2. ✅ Test again after approval

## Quick Test Script

You can test the BotSailor API directly:

```bash
# Replace with your actual values
API_TOKEN="your_api_token"
PHONE_ID="114394566213104"
TEMPLATE_ID="379788"
PHONE="923058562523"

curl "https://botsailor.com/api/v1/whatsapp/send/template?apiToken=$API_TOKEN&phoneNumberID=$PHONE_ID&botTemplateID=$TEMPLATE_ID&sendToPhoneNumber=$PHONE&templateVariable-name-1=Test&templateVariable-service-1=Haircut"
```

This will show you the exact response from BotSailor.

## Expected Responses

### ✅ Success (Message Will Be Delivered)
```json
{
  "success": true,
  "message_id": "wamid.HBgNOTIzMDU4NTYyNTIzFQIAERgSQzg3...",
  "status": "sent"
}
```

### ❌ Template Not Approved
```json
{
  "success": false,
  "error": "Template not approved",
  "status": "failed"
}
```

### ❌ Invalid Phone Number
```json
{
  "success": false,
  "error": "Invalid phone number",
  "status": "failed"
}
```

### ❌ Template Not Found
```json
{
  "success": false,
  "error": "Template not found",
  "status": "failed"
}
```

## Next Steps

1. **First:** Check BotSailor dashboard for template status
2. **Second:** Check BotSailor message logs for delivery status
3. **Third:** Test with your own number
4. **Fourth:** Add debug logging to see API responses
5. **Fifth:** Contact BotSailor support if still not working

## Need Help?

If you've tried all the above and still having issues:

1. Share the BotSailor API response (from console logs)
2. Share the template status from BotSailor dashboard
3. Confirm if test message to your own number works
4. Check if the phone number has WhatsApp installed

---

**TL;DR:** Most likely the template is not approved in BotSailor. Check the dashboard and use an approved template.
