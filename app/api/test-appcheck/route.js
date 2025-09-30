// Test endpoint to verify App Check implementation
import { withAppCheck } from '@/utils/appCheck';

async function testHandler(request) {
  try {
    // Get App Check claims from the request (added by withAppCheck middleware)
    const appCheckClaims = request.appCheckClaims;
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'App Check validation successful',
        timestamp: new Date().toISOString(),
        appCheckClaims: {
          iss: appCheckClaims?.iss,
          aud: appCheckClaims?.aud,
          exp: appCheckClaims?.exp,
          iat: appCheckClaims?.iat
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  } catch (error) {
    console.error('Test endpoint error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Test endpoint failed',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Export the handler wrapped with App Check validation
export const GET = withAppCheck(testHandler);
export const POST = withAppCheck(testHandler);
