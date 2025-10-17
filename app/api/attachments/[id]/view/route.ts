import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id } = params;

    // Get attachment info
    const attachments = await query(
      `SELECT original_filename, file_type, file_path 
       FROM sales_order_attachments 
       WHERE attachment_code = ? AND is_deleted = FALSE`,
      [id]
    );

    if (attachments.length === 0) {
      return new Response('File not found', { status: 404 });
    }

    const attachment = attachments[0];

    // Check if file can be viewed in browser (PDF, images, text)
    const viewableTypes = [
      'application/pdf',
      'image/jpeg', 
      'image/png',
      'image/gif',
      'text/plain'
    ];

    if (!viewableTypes.includes(attachment.file_type)) {
      return new Response('File cannot be viewed in browser', { status: 400 });
    }

    // Read file
    const filePath = path.join(process.cwd(), 'public', attachment.file_path);
    const fileBuffer = await readFile(filePath);

    // Return file for viewing (no download header)
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': attachment.file_type,
        'Content-Disposition': 'inline', // Tampil di browser, bukan download
      },
    });

  } catch (error) {
    console.error('View error:', error);
    return new Response('File not found', { status: 404 });
  }
}