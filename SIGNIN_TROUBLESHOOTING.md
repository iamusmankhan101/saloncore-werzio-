# Sign-In Troubleshooting Guide

## Quick Checks

### 1. Check if user exists in database
Visit: `https://app.werzio.com/api/debug/users`

This will show all users in the database with their email verification status.

### 2. Check browser console
Open browser DevTools (F12) and check the Console tab for error messages when trying to sign in.

### 3. Check Network tab
In DevTools, go to Network tab and look at the `/api/auth/signin` request:
- Status should be 200 for success
- Status 401 means invalid credentials
- Status 403 means email not verified
- Check the response body for error messages

## Common Issues

### Issue: "Invalid email or password"
**Cause**: Email or password doesn't match what's in the database

**Solutions**:
1. Check if the user exists: `/api/debug/users`
2. Verify you're using the correct email (case-insensitive)
3. Verify you're using the correct password (case-sensitive)
4. If you forgot password, you'll need to reset it in the database

### Issue: "Please verify your email"
**Cause**: Email verification not completed

**Solutions**:
1. Check your email inbox for verification link
2. Click the verification link
3. If link expired, sign up again to get a new verification email

### Issue: Sign-in appears to work but redirects back to sign-in page
**Cause**: Session not being stored properly or `getCurrentUser()` not finding the user

**Solutions**:
1. Check browser localStorage:
   - Open DevTools → Application → Local Storage
   - Look for `werzio_auth_session` - should contain user ID
   - Look for `werzio_user_cache_{userId}` - should contain user data
2. Clear localStorage and try again
3. Try in incognito/private mode

### Issue: "Could not reach the server"
**Cause**: Network error or API endpoint not responding

**Solutions**:
1. Check if you're connected to the internet
2. Check if the app is deployed and running
3. Check Vercel logs for errors
4. Verify environment variables are set in Vercel

## How Authentication Works

1. **Sign Up**:
   - User submits form → `/api/auth/signup`
   - Creates user in database with `email_verified = 0`
   - Sends verification email via Resend
   - Returns user data (but doesn't log in yet)

2. **Email Verification**:
   - User clicks link → `/verify-email?token=...`
   - Page calls `/api/verify-email?token=...`
   - API marks `email_verified = 1` in database
   - Fetches full user data via `/api/auth/user`
   - Stores session in localStorage:
     - `werzio_auth_session` = user ID
     - `werzio_user_cache_{userId}` = full user object
   - Redirects to dashboard

3. **Sign In**:
   - User submits form → `/api/auth/signin`
   - API validates credentials against database
   - Returns user data if valid
   - Frontend stores session in localStorage (same as verification)
   - Redirects to dashboard

4. **Session Check**:
   - `getCurrentUser()` in `lib/auth.ts` checks:
     1. Is there a `werzio_auth_session` in localStorage?
     2. Is there cached user data in `werzio_user_cache_{userId}`?
     3. If yes, return the cached user
     4. If no, check old localStorage system (backward compatibility)

## Environment Variables Required

Make sure these are set in Vercel:

```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=eyJ...
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=https://app.werzio.com
```

## Testing Sign-In Locally

1. Start dev server: `npm run dev`
2. Go to `http://localhost:3000/sign-up`
3. Create an account
4. Check terminal for verification link (Resend will log it in dev mode)
5. Click verification link
6. Should redirect to dashboard
7. Sign out and try signing in again

## Database Queries

To manually check/fix users in Turso:

```sql
-- List all users
SELECT id, email, email_verified, created_at FROM users;

-- Verify a user's email manually
UPDATE users SET email_verified = 1 WHERE email = 'user@example.com';

-- Check a specific user
SELECT * FROM users WHERE email = 'user@example.com';

-- Delete a user (for testing)
DELETE FROM users WHERE email = 'user@example.com';
```

## Still Not Working?

1. Check Vercel deployment logs
2. Check browser console for JavaScript errors
3. Try clearing all localStorage and cookies
4. Try in a different browser
5. Check if database is accessible (visit `/api/debug/users`)
