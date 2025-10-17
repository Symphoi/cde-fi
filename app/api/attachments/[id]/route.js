// app/api/attachments/[id]/route.js - FIXED IMPORTS
import { query } from '@/app/lib/db';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs'; // ✅ IMPORT YANG BENAR
import path from 'path';

export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Get attachment info
    const attachments = await query(
      `SELECT filename, file_type, file_path, original_filename 
       FROM sales_order_attachments 
       WHERE attachment_code = ? AND is_deleted = FALSE`,
      [id]
    );

    if (attachments.length === 0) {
      return new Response('File not found', { status: 404 });
    }

    const attachment = attachments[0];

    // Construct file path
    const filePath = path.join(process.cwd(), 'public', attachment.file_path);
    
    // Check if file exists - ✅ SEKARANG WORK
    if (!existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      return new Response('File not found on server', { status: 404 });
    }

    // Read file
    const fileBuffer = await readFile(filePath);

    // Determine filename for download
    const downloadFilename = attachment.original_filename || attachment.filename;

    // Return file
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': attachment.file_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Download error:', error);
    return new Response('Download failed', { status: 500 });
  }
}