# WhatsApp Template Variable Check

## Template #379788 - Confirmation (Custom)

### Status: ✅ Approved (23rd May 26 17:44)

## Potential Issues

Since the template is approved, the issue is likely one of these:

### 1. **Variable Mapping Mismatch**

BotSailor expects variables in a specific format. Check your template in BotSailor:

**If your template looks like this:**
```
Hello {{1}},

Your {{2}} appointment is confirmed for {{3}} at {{4}}.

Thank you,
{{5}}
```

**Then the API call should use:**
```javascript
templateVariable-1-1 = "usman khan"      // name
templateVariable-2-1 = "Haircut"         // service
templateVariable-3-1 = "24 May 2026"     // date
templateVariable-4-1 = "04:38 pm"        // time
templateVariable-5-1 = "Your Salon"      // salon_name
```

**But your code is sending:**
```javascript
templateVariable-name-1 = "usman khan"
templateVariable-service-1 = "Haircut"
templateVariable-date-1 = "24 May 2026"
templateVariable-time-1 = "04:38 pm"
templateVariable-salon_name-1 = "Your Salon"
```

### ⚠️ This is likely the issue!

## How to Fix

### Option 1: Update Your Code (Recommended)

Change the variable mapping to use numbers instead of names:

**File:** `app/api/whatsapp/send/route.ts`

```typescript
if (variables) {
  // Map variable names to numbers based on template order
  const variableMap: Record<string, string> = {
    'name': '1',
    'service': '2',
    'date': '3',
    'time': '4',
    'salon_name': '5'
  };

  for (const [key, value] of Object.entries(variables)) {
    const varNumber = variableMap[key] || key;
    params.set(`templateVariable-${varNumber}-1`, value);
  }
}
```

### Option 2: Check BotSailor Template Format

1. Log into BotSailor
2. Go to Templates → Edit template #379788
3. Check if variables are:
   - **{{1}}, {{2}}, {{3}}** (numbered) → Use Option 1 above
   - **{{name}}, {{service}}, {{date}}** (named) → Current code is correct

## Test After Fix

1. Restart your dev server
2. Send a test message
3. Check the terminal logs for:
   ```
   📱 WhatsApp Send Request: { ... }
   🔗 BotSailor URL: https://...
   📥 BotSailor Response: { ... }
   ```

4. The response should show:
   ```json
   {
     "success": true,
     "message_id": "wamid.xxx",
     "status": "sent"
   }
   ```

## Other Possible Issues

### 2. **24-Hour Window Restriction**

WhatsApp only allows messages to users who:
- Messaged you first within the last 24 hours
- OR you're using an approved template (which you are)

**But:** Even with approved templates, the recipient must have:
- ✅ Opted in to receive messages from your business
- ✅ Not blocked your business number

### 3. **Phone Number Format**

Your code normalizes to: **923058562523**

This is correct for Pakistan (+92), but verify:
- The number actually belongs to the person
- The number has WhatsApp installed
- The number hasn't blocked your business

### 4. **BotSailor Message Logs**

Check the actual delivery status in BotSailor:

1. BotSailor Dashboard → Message Logs
2. Find messages to 923058562523
3. Check status:
   - **Sent** = Sent to WhatsApp API
   - **Delivered** = WhatsApp confirmed delivery ✅
   - **Read** = User opened the message ✅
   - **Failed** = Error occurred ❌

If it shows "Sent" but not "Delivered", the issue is on WhatsApp's side.

## Quick Debug Steps

### Step 1: Add Logging (Already Done)
The logging code has been added to `app/api/whatsapp/send/route.ts`

### Step 2: Send Test Message
1. Go to Messages page
2. Send a message to usman khan (923058562523)
3. Check your terminal for the logs

### Step 3: Check Terminal Output
Look for:
```
📱 WhatsApp Send Request: {
  phone: '923058562523',
  templateId: '379788',
  phoneNumberId: '114394566213104',
  variables: { name: 'usman khan', service: '...', ... }
}

🔗 BotSailor URL: https://botsailor.com/api/v1/whatsapp/send/template?...

📥 BotSailor Response Status: 200

📥 BotSailor Response Body: {"success":true,"message_id":"wamid.xxx"}
```

### Step 4: Check BotSailor Dashboard
1. Go to Message Logs
2. Find the latest message
3. Check if it shows "Delivered" or just "Sent"

## Expected Behavior

### ✅ Working Correctly:
- Terminal shows: `"success": true`
- BotSailor shows: Status = "Delivered"
- User receives message on WhatsApp

### ⚠️ API Success but Not Delivered:
- Terminal shows: `"success": true`
- BotSailor shows: Status = "Sent" (not "Delivered")
- User doesn't receive message
- **Reason:** WhatsApp rejected delivery (user blocked, number invalid, etc.)

### ❌ API Failure:
- Terminal shows: `"success": false` or error
- BotSailor shows: Status = "Failed"
- **Reason:** Template issue, variable mismatch, or API error

## Most Likely Fix

Based on the template being approved, the issue is probably:

### **Variable mapping mismatch**

Update the code to map variable names to numbers (see Option 1 above), then test again.

---

**Next Steps:**
1. Send a test message
2. Check terminal logs
3. Share the BotSailor response here
4. We'll identify the exact issue from the response
