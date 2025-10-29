import { query } from '@/app/lib/db';

// GET - Get all chart of accounts dengan hierarchical support
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const accountType = searchParams.get('accountType') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const showInactive = searchParams.get('showInactive') === 'true';

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (account_code LIKE ? OR account_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (accountType) {
      whereClause += ' AND account_type = ?';
      params.push(accountType);
    }

    if (!showInactive) {
      whereClause += ' AND is_active = 1';
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM chart_of_accounts ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get chart of accounts
    const coaQuery = `
      SELECT 
        id,
        account_code,
        account_name,
        account_type,
        parent_account_code,
        is_active,
        created_at
      FROM chart_of_accounts 
      ${whereClause}
      ORDER BY account_code ASC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];
    const accounts = await query(coaQuery, queryParams);

    // Build hierarchical structure for tree view
    const hierarchicalData = buildHierarchicalStructure(accounts);

    return Response.json({
      success: true,
      data: accounts,
      hierarchicalData: hierarchicalData,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('GET chart of accounts error:', error);
    return Response.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// POST - Create new account
export async function POST(request) {
  try {
    const accountData = await request.json();
    const {
      account_code,
      account_name,
      account_type,
      parent_account_code = null,
      is_active = true
    } = accountData;

    // Validation
    if (!account_code || !account_name || !account_type) {
      return Response.json(
        { success: false, error: 'Account code, name, and type are required' },
        { status: 400 }
      );
    }

    // Validate account code format (numeric)
    if (!/^\d+$/.test(account_code)) {
      return Response.json(
        { success: false, error: 'Account code must contain only numbers' },
        { status: 400 }
      );
    }

    // Validate account type
    const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    if (!validTypes.includes(account_type)) {
      return Response.json(
        { success: false, error: 'Invalid account type' },
        { status: 400 }
      );
    }

    // Check if account code already exists
    const existingAccount = await query(
      'SELECT account_code FROM chart_of_accounts WHERE account_code = ?',
      [account_code]
    );

    if (existingAccount.length > 0) {
      return Response.json(
        { success: false, error: 'Account code already exists' },
        { status: 400 }
      );
    }

    // Validate parent account if provided
    if (parent_account_code) {
      const parentAccount = await query(
        'SELECT account_code, account_type FROM chart_of_accounts WHERE account_code = ? AND is_active = 1',
        [parent_account_code]
      );

      if (parentAccount.length === 0) {
        return Response.json(
          { success: false, error: 'Parent account not found or inactive' },
          { status: 400 }
        );
      }

      // Validate that parent and child have same account type
      const parentType = parentAccount[0].account_type;
      if (parentType !== account_type) {
        return Response.json(
          { success: false, error: 'Child account must have same type as parent account' },
          { status: 400 }
        );
      }
    }

    // Insert account
    await query(
      `INSERT INTO chart_of_accounts 
       (account_code, account_name, account_type, parent_account_code, is_active) 
       VALUES (?, ?, ?, ?, ?)`,
      [account_code, account_name, account_type, parent_account_code, is_active]
    );

    return Response.json({
      success: true,
      message: 'Account created successfully'
    });

  } catch (error) {
    console.error('POST chart of accounts error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update account
export async function PUT(request) {
  try {
    const accountData = await request.json();
    const {
      id,
      account_code,
      account_name,
      account_type,
      parent_account_code = null,
      is_active = true
    } = accountData;

    // Validation
    if (!id || !account_code || !account_name || !account_type) {
      return Response.json(
        { success: false, error: 'Account ID, code, name, and type are required' },
        { status: 400 }
      );
    }

    // Validate account code format
    if (!/^\d+$/.test(account_code)) {
      return Response.json(
        { success: false, error: 'Account code must contain only numbers' },
        { status: 400 }
      );
    }

    // Validate account type
    const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    if (!validTypes.includes(account_type)) {
      return Response.json(
        { success: false, error: 'Invalid account type' },
        { status: 400 }
      );
    }

    // Check if account exists
    const existingAccount = await query(
      'SELECT account_code FROM chart_of_accounts WHERE id = ?',
      [id]
    );

    if (existingAccount.length === 0) {
      return Response.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    // Check if account code already exists (for other accounts)
    const existingCode = await query(
      'SELECT account_code FROM chart_of_accounts WHERE account_code = ? AND id != ?',
      [account_code, id]
    );

    if (existingCode.length > 0) {
      return Response.json(
        { success: false, error: 'Account code already exists for another account' },
        { status: 400 }
      );
    }

    // Validate parent account if provided
    if (parent_account_code) {
      const parentAccount = await query(
        'SELECT account_code, account_type FROM chart_of_accounts WHERE account_code = ? AND is_active = 1 AND id != ?',
        [parent_account_code, id]
      );

      if (parentAccount.length === 0) {
        return Response.json(
          { success: false, error: 'Parent account not found or inactive' },
          { status: 400 }
        );
      }

      // Validate that parent and child have same account type
      const parentType = parentAccount[0].account_type;
      if (parentType !== account_type) {
        return Response.json(
          { success: false, error: 'Child account must have same type as parent account' },
          { status: 400 }
        );
      }

      // Prevent circular reference (account cannot be parent of itself)
      if (parent_account_code === account_code) {
        return Response.json(
          { success: false, error: 'Account cannot be parent of itself' },
          { status: 400 }
        );
      }
    }

    // Check if this account has children before deactivating
    if (!is_active) {
      const childAccounts = await query(
        'SELECT account_code FROM chart_of_accounts WHERE parent_account_code = ? AND is_active = 1',
        [account_code]
      );

      if (childAccounts.length > 0) {
        return Response.json(
          { success: false, error: 'Cannot deactivate account that has active child accounts' },
          { status: 400 }
        );
      }
    }

    // Update account
    await query(
      `UPDATE chart_of_accounts 
       SET account_code = ?, account_name = ?, account_type = ?, parent_account_code = ?, is_active = ?
       WHERE id = ?`,
      [account_code, account_name, account_type, parent_account_code, is_active, id]
    );

    return Response.json({
      success: true,
      message: 'Account updated successfully'
    });

  } catch (error) {
    console.error('PUT chart of accounts error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete account
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Check if account exists
    const existingAccount = await query(
      'SELECT account_code, account_name FROM chart_of_accounts WHERE id = ?',
      [id]
    );

    if (existingAccount.length === 0) {
      return Response.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    // Check if account has child accounts
    const accountCode = existingAccount[0].account_code;
    const childAccounts = await query(
      'SELECT account_code FROM chart_of_accounts WHERE parent_account_code = ?',
      [accountCode]
    );

    if (childAccounts.length > 0) {
      return Response.json(
        { success: false, error: 'Cannot delete account that has child accounts' },
        { status: 400 }
      );
    }

    // Check if account is used in journal items
    const journalUsage = await query(
      'SELECT journal_code FROM journal_items WHERE account_code = ? LIMIT 1',
      [accountCode]
    );

    if (journalUsage.length > 0) {
      return Response.json(
        { success: false, error: 'Cannot delete account that is used in journal entries' },
        { status: 400 }
      );
    }

    // Delete account
    await query('DELETE FROM chart_of_accounts WHERE id = ?', [id]);

    return Response.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('DELETE chart of accounts error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to build hierarchical structure
function buildHierarchicalStructure(accounts) {
  const accountMap = new Map();
  const rootAccounts = [];

  // Create map of all accounts
  accounts.forEach(account => {
    accountMap.set(account.account_code, {
      ...account,
      children: []
    });
  });

  // Build tree structure
  accounts.forEach(account => {
    const node = accountMap.get(account.account_code);
    
    if (account.parent_account_code && accountMap.has(account.parent_account_code)) {
      const parent = accountMap.get(account.parent_account_code);
      parent.children.push(node);
    } else {
      rootAccounts.push(node);
    }
  });

  return rootAccounts;
}