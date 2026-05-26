# WhatsApp Messages Not Receiving - Troubleshooting Guide

## Current Status (From Screenshot)
- ✅ BotSailor Connected
- ✅ Phone ID: 114394566213104
- ✅ 2 messages sent today
- ✅ 2 messages sent this week
- ✅ Messages show as "Sent" in the log
- ❌ **Messages not being received by clients**

## Common Reasons Why Messages Show "Sent" But Not Received

### 1. **Template Not Approved in BotSailor** ⚠️ MOST COMMON
**Problem:** BotSailor API returns success, but WhatsApp Business API rejects unapproved templates

**Solution:**
1. Log into your BotSailor dashboard
2. Go to **Templates** section
3. Check if template #379788 is **APPROVED** (green checkmark)
4. If status is "Pending" or "Rejected", you need to:
   - Submit for approval (takes 24-48 hours)
   - Or use a different approved template

**How to check:**
```
BotSailor Dashboard → Templates → Look for template #379788
Status should be: ✅ APPROVED
```

### 2. **Phone Number Not Registered with WhatsApp**
**Problem:** The recipient's phone number (923058562523) might not have WhatsApp

**Solution:**
1. Verify the number has WhatsApp installed
2. Try sending a test message via WhatsApp Web first
3. Check if the number is correct (no typos)

**Test:**
- Click "Open in WhatsApp Web" button
- If it opens a chat, the number is valid
- If it says "number not on WhatsApp", that's the issue

### 3. **Template Variables Mismatch**
**Problem:** Template expects certain variables but you're sending different ones

**Solution:**
Check your BotSailor template configuration:
```
Template #379788 should have variables like:
{{1}} = name
{{2}} = service  
{{3}} = date
{{4}} = time
{{5}} = salon_name
```

Make sure the variable numbers match what you're sending.

### 4. **WhatsApp Business API Restrictions**
**Problem:** WhatsApp has strict rules about who you can message

**Rules:**
- ✅ Can message: Users who messaged you first (24-hour window)
- ✅ Can message: Users who opted in to receive messages
- ❌ Cannot message: Random numbers without consent
- ❌ Cannot message: Numbers outside 24-hour window (without approved template)

**Solution:**
- Ensure clients have opted in to receive WhatsApp messages
- Use approved templates for messages outside 24-hour window

### 5. **BotSailor API Token Issues**
**Problem:** API token might be expired or have wrong permissions

**Solution:**
1. Go to BotSailor Dashboard → Settings → API
2. Regenerate API token
3. Update in your app: Account → WhatsApp → API Token
4. Save and try again

### 6. **Phone Number Format Issues**
**Problem:** Phone number format might be incorrect

**Current format:** 923058562523 ✅ (This looks correct)

**Correct formats:**
- ✅ 923001234567 (country code + number, no leading 0)
- ❌ 03001234567 (missing country code)
- ❌ +92 300 1234567 (has spaces/symbols)

**Your code handles this correctly**, but double-check in BotSailor logs.

## Debugging Steps

### Step 1: Check BotSailor Dashboard
1. Log into https://botsailor.com
2. Go to **Message Logs** or **Reports**
3. Look for messages sent to 923058562523
4. Check the status:
   - ✅ **Delivered** = Message was received
   - ⚠️ **Sent** = Sent to WhatsApp but not delivered
   - ❌ **Failed** = Error occurred

### Step 2: Check Template Status
1. BotSailor Dashboard → Templates
2. Find template #379788
3. Status should be **APPROVED**
4. If not approved:
   - Click "Submit for Approval"
   - Wait 24-48 hours
   - Use a different approved template in the meantime

### Step 3: Test with Your Own Number
1. Go to Messages page
2. Select yourself as the client (add your number if needed)
3. Send a test message
4. Check if YOU receive it
5. If you don't receive it, the issue is with BotSailor/template
6. If you DO receive it, the issue is with the client's number

### Step 4: Check API Response
Open browser console (F12) and look for the API response:

**Good response:**
```json
{
  "ok": true,
  "status": 200,
  "data": {
    "success": true,
    "message_id": "wamid.xxx"
  }
}
```

**Bad response (template not approved):**
```json
{
  "ok": true,
  "status": 200,
  "data": {
    "success": false,
    "error": "Template not approved"
  }
}
```

### Step 5: Verify Template Variables
Check that your template in BotSailor matches the variables being sent:

**Code sends:**
```javascript
{
  name: "usman khan",
  service: "Haircut",
  date: "2024-05-24",
  time: "04:38 pm",
  salon_name: "Your Salon"
}
```

**BotSailor template should have:**
```
Hello {{name}},

Your {{service}} appointment is confirmed for {{date}} at {{time}}.

Thank you,
{{salon_name}}
```

## Quick Fixes

### Fix 1: Use a Pre-Approved Template
BotSailor usually has some pre-approved templates. Use one of those:

1. BotSailor Dashboard → Templates
2. Look for templates with ✅ APPROVED status
3. Copy the template ID
4. Update in your app: Account → WhatsApp → Template IDs
5. Try sending again

### Fix 2: Enable Template Debugging
Add this to your API route to see the actual response:

```typescript
// In app/api/whatsapp/send/route.ts
const res = await fetch(url, { method: "GET" });
const text = await res.text();

// Add this line:
console.log('BotSailor Response:', text);

try {
  const data = JSON.parse(text);
  // Also log the parsed data
  console.log('Parsed Data:', data);
  return Response.json({ ok: res.ok, status: res.status, data });
}
```

Then check your server console for the actual response.

### Fix 3: Test with WhatsApp Web First
Before using the API, test manually:

1. Click "Open in WhatsApp Web" for the client
2. Send a manual message
3. If they receive it, WhatsApp connection is fine
4. If they don't, the number might be wrong or blocked

## Common BotSailor Issues

### Issue: "Template not found"
**Cause:** Template ID is wrong or template was deleted
**Fix:** Check template ID in BotSailor dashboard

### Issue: "Phone number not registered"
**Cause:** Number doesn't have WhatsApp
**Fix:** Verify number has WhatsApp installed

### Issue: "Outside 24-hour window"
**Cause:** Can't send non-template messages after 24 hours
**Fix:** Use approved templates (which you are)

### Issue: "Template not approved"
**Cause:** Template is pending approval
**Fix:** Wait for approval or use different template

## Recommended Solution

Based on your screenshot showing "Sent" status, the most likely issue is:

### **Template #379788 is not approved in BotSailor**

**Action Plan:**
1. ✅ Log into BotSailor dashboard
2. ✅ Go to Templates section
3. ✅ Check status of template #379788
4. ✅ If not approved:
   - Submit for approval (24-48 hours)
   - OR use a different approved template
5. ✅ Update template ID in app if using different template
6. ✅ Test again

## How to Verify Messages Are Actually Delivered

### In BotSailor Dashboard:
Look for these statuses:
- **Sent** = Sent to WhatsApp API (but not necessarily delivered)
- **Delivered** = WhatsApp confirmed delivery to recipient
- **Read** = Recipient opened the message

### In Your App:
The current implementation only checks if the API call succeeded, not if the message was delivered. To improve this:

1. BotSailor should provide webhooks for delivery status
2. You can query BotSailor API for message status
3. Or check the BotSailor dashboard manually

## Testing Checklist

- [ ] Template #379788 is APPROVED in BotSailor
- [ ] Phone number 923058562523 has WhatsApp installed
- [ ] You can open WhatsApp Web chat with this number
- [ ] Template variables match what's being sent
- [ ] API token is valid and not expired
- [ ] Test message sent to your own number works
- [ ] Check BotSailor dashboard for delivery status
- [ ] Check browser console for API errors
- [ ] Verify phone number format is correct

## Need More Help?

### Check BotSailor Logs
1. BotSailor Dashboard → Reports/Logs
2. Filter by phone number: 923058562523
3. Check delivery status
4. Look for error messages

### Contact BotSailor Support
If messages show "Sent" in your app but not in BotSailor:
- Email: support@botsailor.com
- Provide: Phone Number ID, Template ID, Timestamp
- Ask: "Why are messages showing sent but not delivered?"

### Enable Detailed Logging
Add logging to track the full flow:

```typescript
// In lib/whatsapp-scheduler.ts
console.log('Sending WhatsApp message:', {
  phone,
  templateId,
  variables,
  timestamp: new Date().toISOString()
});

const ok = await callSendApi(...);

console.log('WhatsApp send result:', {
  success: ok,
  phone,
  templateId
});
```

---

**Most Likely Issue:** Template not approved in BotSailor  
**Quick Fix:** Use a pre-approved template or wait for approval  
**Test:** Send to your own number first to verify setup
