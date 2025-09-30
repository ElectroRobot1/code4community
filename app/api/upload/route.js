import { NextResponse } from 'next/server';
import { validateFileUpload } from '@/utils/validation';
import { withAppCheck } from '@/utils/appCheck';

async function uploadHandler(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validationError = validateFileUpload(file, 5 * 1024 * 1024); // 5MB limit
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Additional security checks
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Check file size (additional check)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large' },
        { status: 400 }
      );
    }

    // In a real application, you would:
    // 1. Scan the file for malware
    // 2. Store it in a secure location (AWS S3, etc.)
    // 3. Generate a secure filename
    // 4. Store metadata in database

    // For now, return success
    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      filename: file.name,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

// Export the handler wrapped with App Check validation
export const POST = withAppCheck(uploadHandler);
