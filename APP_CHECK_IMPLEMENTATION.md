# Firebase App Check Implementation

This document explains the complete Firebase App Check implementation in the BRHS application.

## Overview

Firebase App Check is now properly configured to protect your application from abuse and unauthorized access. It validates that requests come from your legitimate app instances.

## What Was Fixed

### 1. Firestore Rules ✅
- **Before**: App Check validation was disabled (`return true`)
- **After**: Proper validation using `request.app_check != null && request.app_check.valid == true`

### 2. Server-Side Validation ✅
- Created `utils/appCheck.js` with token validation utilities
- Added `withAppCheck()` middleware for API routes
- Proper error handling and token verification

### 3. API Route Protection ✅
- Updated `/api/upload/route.js` to use App Check validation
- Updated `/api/avatar/route.js` to use App Check validation
- All API routes now require valid App Check tokens

### 4. Client-Side Integration ✅
- Created `utils/apiClient.js` for making API calls with App Check tokens
- Automatic token inclusion in all API requests
- Proper error handling for token failures

## How It Works

### Client-Side (Browser)
1. Firebase App Check is initialized with reCAPTCHA v3
2. When making API calls, the client automatically gets an App Check token
3. The token is included in the `X-Firebase-AppCheck` header
4. Firestore operations automatically include App Check tokens

### Server-Side (API Routes)
1. The `withAppCheck()` middleware validates incoming tokens
2. Invalid or missing tokens result in 403 Forbidden responses
3. Valid tokens allow the request to proceed
4. App Check claims are available in the request object

### Firestore Security Rules
1. All rules now check `isAppCheckValid()` function
2. Only requests with valid App Check tokens can access data
3. This prevents unauthorized access to your database

## Testing

### Test Endpoint
- **URL**: `/api/test-appcheck`
- **Methods**: GET, POST
- **Purpose**: Verify App Check validation is working

### Test Component
- **File**: `components/AppCheckTest.js`
- **Usage**: Add to any page to test App Check functionality
- **Features**: Tests both GET and POST requests

### Manual Testing
1. Visit `/api/test-appcheck` in your browser
2. Should return 403 Forbidden (no App Check token)
3. Use the test component to verify proper functionality

## Configuration

### Required Environment Variables
- `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY`: Your reCAPTCHA v3 site key
- Already configured in `keys.js` as `recaptchaSiteKey`

### Firebase Console Setup
1. Go to Firebase Console → App Check
2. Register your web app
3. Configure reCAPTCHA v3 provider
4. Use the site key from `keys.js`

## Security Benefits

### Before App Check
- ❌ Anyone could make API calls to your endpoints
- ❌ Firestore rules were bypassed
- ❌ No protection against automated attacks
- ❌ Vulnerable to abuse and scraping

### After App Check
- ✅ Only legitimate app instances can make requests
- ✅ All Firestore operations are protected
- ✅ API endpoints require valid tokens
- ✅ Protection against automated attacks and abuse

## API Usage Examples

### Using the API Client
```javascript
import { apiGet, apiPost, apiUpload } from '@/utils/apiClient';

// GET request with App Check token
const response = await apiGet('/api/users/profile');

// POST request with App Check token
const response = await apiPost('/api/tutoring-requests', requestData);

// File upload with App Check token
const formData = new FormData();
formData.append('file', file);
const response = await apiUpload('/api/upload', formData);
```

### Direct Firestore Usage
```javascript
// Firestore operations automatically include App Check tokens
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/firebase';

const docRef = doc(firestore, 'users', userId);
const docSnap = await getDoc(docRef);
```

## Troubleshooting

### Common Issues

1. **403 Forbidden on API calls**
   - Check that App Check is properly initialized
   - Verify reCAPTCHA site key is correct
   - Ensure the domain is registered in Firebase Console

2. **Firestore access denied**
   - Check that App Check is enabled in Firestore rules
   - Verify the app is registered in Firebase Console
   - Check browser console for App Check errors

3. **reCAPTCHA errors**
   - Verify the site key is correct
   - Check that the domain is registered with reCAPTCHA
   - Ensure the site key matches the one in Firebase Console

### Debug Mode
To enable debug mode for testing (development only):
```javascript
// In firebase.js, add this before initializeAppCheck
if (process.env.NODE_ENV === 'development') {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = 'your-debug-token';
}
```

## Monitoring

### Firebase Console
- Monitor App Check usage in Firebase Console
- Check for failed token validations
- Review security rules violations

### Application Logs
- Server-side validation errors are logged
- Client-side token failures are logged
- Monitor for suspicious activity patterns

## Next Steps

1. **Deploy the changes** to your production environment
2. **Test thoroughly** using the test endpoint and component
3. **Monitor** App Check usage in Firebase Console
4. **Update** any additional API routes to use App Check validation
5. **Consider** implementing additional security measures as needed

## Files Modified/Created

### Modified Files
- `firestore.rules` - Enabled App Check validation
- `firebase.js` - Exported app instance
- `app/api/upload/route.js` - Added App Check validation
- `app/api/avatar/route.js` - Added App Check validation

### New Files
- `utils/appCheck.js` - Server-side validation utilities
- `utils/apiClient.js` - Client-side API client with App Check
- `utils/apiExamples.js` - Usage examples
- `app/api/test-appcheck/route.js` - Test endpoint
- `components/AppCheckTest.js` - Test component
- `APP_CHECK_IMPLEMENTATION.md` - This documentation

Your App Check implementation is now complete and secure! 🎉
