// app/api/upload/route.js - SIMPLE VERSION
import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const soCode = formData.get('so_code');
    const type = formData.get('type') || 'other';

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Simple validation - max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: 'File too large. Max 5MB' }, { status: 400 });
    }

    // Generate simple filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const filename = `file_${timestamp}.${fileExtension}`;
    
    // Save file
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, filename);
    
    await writeFile(filePath, buffer);

    // Save to database - SIMPLE
    const attachmentCode = `ATT-${timestamp}`;

    await query(
      `INSERT INTO sales_order_attachments 
       (attachment_code, so_code, filename, original_filename, file_type, file_size, file_path) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        attachmentCode,
        soCode,
        filename,
        file.name,
        file.type,
        file.size,
        `/uploads/${filename}`
      ]
    );

    return Response.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: attachmentCode,
        name: file.name,
        type: type,
        size: file.size,
        file_path: `/uploads/${filename}`
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}