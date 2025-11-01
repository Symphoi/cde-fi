import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

// Helper function untuk audit log
// async function createAuditLog(userCode, userName, action, resourceType, resourceCode, notes) {
//   try {
//     const auditCode = `AUD-${Date.now()}`;
//     await query(
//       `INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes, timestamp)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
//       [auditCode, userCode, userName, action, resourceType, resourceCode, `${resourceType} ${resourceCode}`, notes]
//     );
//   } catch (error) {
//     console.error('Error creating audit log:', error);
//   }
// }

// GET - Get all bank accounts
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    const show_inactive = searchParams.get('show_inactive') === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE is_deleted = 0';
    let params = [];

    if (!show_inactive) {
      whereClause += ' AND is_active = 1';
    }

    if (search) {
      whereClause += ' AND (account_code LIKE ? OR bank_name LIKE ? OR account_holder LIKE ? OR account_number LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM bank_accounts 
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get bank accounts
    const bankQuery = `
      SELECT 
        id,
        account_code,
        bank_name,
        account_number,
        account_holder,
        branch,
        currency,
        description,
        is_active,
        created_at,
        updated_at
      FROM bank_accounts 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, parseInt(limit), offset];
    const bankAccounts = await query(bankQuery, queryParams);

    return Response.json({
      success: true,
      data: bankAccounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('GET bank accounts error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get single bank account by account_code
export async function GET_SINGLE(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { accountCode } = params;

    const bankAccount = await query(
      `SELECT 
        id,
        account_code,
        bank_name,
        account_number,
        account_holder,
        branch,
        currency,
        description,
        is_active,
        created_at,
        updated_at
       FROM bank_accounts 
       WHERE account_code = ? AND is_deleted = 0`,
      [accountCode]
    );

    if (bankAccount.length === 0) {
      return Response.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: bankAccount[0]
    });

  } catch (error) {
    console.error('GET single bank account error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new bank account
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const bankData = await request.json();
    const {
      account_code,
      bank_name,
      account_number,
      account_holder,
      branch = '',
      currency = 'IDR',
      description = ''
    } = bankData;

    // Validation
    if (!account_code || !bank_name || !account_number || !account_holder) {
      return Response.json(
        { success: false, error: 'Account code, bank name, account number, and account holder are required' },
        { status: 400 }
      );
    }

    // Check if account code already exists
    const existingAccount = await query(
      'SELECT account_code FROM bank_accounts WHERE account_code = ? AND is_deleted = 0',
      [account_code]
    );

    if (existingAccount.length > 0) {
      return Response.json(
        { success: false, error: 'Account code already exists' },
        { status: 400 }
      );
    }

    // Check if account number already exists
    const existingNumber = await query(
      'SELECT account_number FROM bank_accounts WHERE account_number = ? AND is_deleted = 0',
      [account_number]
    );

    if (existingNumber.length > 0) {
      return Response.json(
        { success: false, error: 'Account number already exists' },
        { status: 400 }
      );
    }

    // Insert bank account
    await query(
      `INSERT INTO bank_accounts 
       (account_code, bank_name, account_number, account_holder, branch, currency, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [account_code, bank_name, account_number, account_holder, branch, currency, description]
    );

    // Audit log
    // await createAuditLog(
    //   decoded.user_code,
    //   decoded.name,
    //   'create',
    //   'bank_account',
    //   account_code,
    //   `Created bank account: ${bank_name} - ${account_number}`
    // );

    return Response.json({
      success: true,
      message: 'Bank account created successfully',
      account_code: account_code
    });

  } catch (error) {
    console.error('POST bank account error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update bank account
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const bankData = await request.json();
    const {
      account_code,
      bank_name,
      account_number,
      account_holder,
      branch = '',
      currency = 'IDR',
      description = '',
      is_active = true
    } = bankData;

    // Validation
    if (!account_code || !bank_name || !account_number || !account_holder) {
      return Response.json(
        { success: false, error: 'Account code, bank name, account number, and account holder are required' },
        { status: 400 }
      );
    }

    // Check if bank account exists
    const existingAccount = await query(
      'SELECT account_code FROM bank_accounts WHERE account_code = ? AND is_deleted = 0',
      [account_code]
    );

    if (existingAccount.length === 0) {
      return Response.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      );
    }

    // Check if account number already exists (for other accounts)
    const existingNumber = await query(
      'SELECT account_number FROM bank_accounts WHERE account_number = ? AND account_code != ? AND is_deleted = 0',
      [account_number, account_code]
    );

    if (existingNumber.length > 0) {
      return Response.json(
        { success: false, error: 'Account number already exists for another account' },
        { status: 400 }
      );
    }

    // Update bank account
    await query(
      `UPDATE bank_accounts 
       SET bank_name = ?, account_number = ?, account_holder = ?, branch = ?, currency = ?, description = ?, is_active = ?, updated_at = NOW()
       WHERE account_code = ? AND is_deleted = 0`,
      [bank_name, account_number, account_holder, branch, currency, description, is_active, account_code]
    );

    // Audit log
    // await createAuditLog(
    //   decoded.user_code,
    //   decoded.name,
    //   'update',
    //   'bank_account',
    //   account_code,
    //   `Updated bank account: ${bank_name} - ${account_number}`
    // );

    return Response.json({
      success: true,
      message: 'Bank account updated successfully'
    });

  } catch (error) {
    console.error('PUT bank account error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete bank account
export async function DELETE(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const account_code = searchParams.get('account_code');

    if (!account_code) {
      return Response.json(
        { success: false, error: 'Account code is required' },
        { status: 400 }
      );
    }

    // Check if bank account exists
    const existingAccount = await query(
      'SELECT account_code, bank_name, account_number FROM bank_accounts WHERE account_code = ? AND is_deleted = 0',
      [account_code]
    );

    if (existingAccount.length === 0) {
      return Response.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      );
    }

    // Soft delete bank account
    await query(
      'UPDATE bank_accounts SET is_deleted = 1, deleted_at = NOW() WHERE account_code = ?',
      [account_code]
    );

    const account = existingAccount[0];

    // Audit log
    // await createAuditLog(
    //   decoded.user_code,
    //   decoded.name,
    //   'delete',
    //   'bank_account',
    //   account_code,
    //   `Deleted bank account: ${account.bank_name} - ${account.account_number}`
    // );

    return Response.json({
      success: true,
      message: 'Bank account deleted successfully'
    });

  } catch (error) {
    console.error('DELETE bank account error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}