import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let isUnique = false;
    let companyCode = '';
    let attempts = 0;
    const maxAttempts = 10;

    // Generate unique company code
    while (!isUnique && attempts < maxAttempts) {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      companyCode = `COMP${randomSuffix}`;
      
      // Check if code already exists
      const existingCompany = await query(
        'SELECT company_code FROM companies WHERE company_code = ? AND is_deleted = 0',
        [companyCode]
      );
      
      if (existingCompany.length === 0) {
        isUnique = true;
      }
      
      attempts++;
    }

    if (!isUnique) {
      return Response.json(
        { success: false, error: 'Failed to generate unique company code' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      data: { code: companyCode },
      message: 'Company code generated successfully'
    });

  } catch (error) {
    console.error('Generate company code error:', error);
    return Response.json(
      { success: false, error: 'Failed to generate company code' },
      { status: 500 }
    );
  }
}