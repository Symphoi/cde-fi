import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

// GET all accounting rules
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ruleCode = searchParams.get('rule_code');
    const transactionType = searchParams.get('transaction_type');
    const isActive = searchParams.get('is_active');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    // Jika request specific rule
    if (ruleCode) {
      const rules = await query(
        `SELECT 
          ar.rule_code,
          ar.rule_name,
          ar.description,
          ar.transaction_type,
          ar.debit_account_code,
          ar.credit_account_code,
          ar.is_active,
          ar.created_at,
          ar.updated_at,
          debit_acc.account_name as debit_account_name,
          credit_acc.account_name as credit_account_name
         FROM accounting_rules ar
         LEFT JOIN chart_of_accounts debit_acc ON ar.debit_account_code = debit_acc.account_code
         LEFT JOIN chart_of_accounts credit_acc ON ar.credit_account_code = credit_acc.account_code
         WHERE ar.rule_code = ?`,
        [ruleCode]
      );

      if (rules.length === 0) {
        return Response.json({ error: 'Accounting rule not found' }, { status: 404 });
      }

      return Response.json({
        success: true,
        data: rules[0]
      });
    }

    // Get all rules dengan filter
    let whereClause = 'WHERE 1=1';
    let params = [];

    if (transactionType) {
      whereClause += ' AND ar.transaction_type = ?';
      params.push(transactionType);
    }

    if (isActive !== null) {
      whereClause += ' AND ar.is_active = ?';
      params.push(isActive === 'true' ? 1 : 0);
    }

    const rules = await query(
      `SELECT 
        ar.rule_code,
        ar.rule_name,
        ar.description,
        ar.transaction_type,
        ar.debit_account_code,
        ar.credit_account_code,
        ar.is_active,
        ar.created_at,
        ar.updated_at,
        debit_acc.account_name as debit_account_name,
        credit_acc.account_name as credit_account_name
       FROM accounting_rules ar
       LEFT JOIN chart_of_accounts debit_acc ON ar.debit_account_code = debit_acc.account_code
       LEFT JOIN chart_of_accounts credit_acc ON ar.credit_account_code = credit_acc.account_code
       ${whereClause}
       ORDER BY ar.transaction_type, ar.rule_name
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM accounting_rules ar ${whereClause}`,
      params
    );

    return Response.json({
      success: true,
      data: rules,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get accounting rules error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// CREATE new accounting rule
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ruleData = await request.json();
    const {
      rule_code,
      rule_name,
      description,
      transaction_type,
      debit_account_code,
      credit_account_code,
      is_active = true
    } = ruleData;

    // Validasi required fields
    if (!rule_code || !rule_name || !transaction_type || !debit_account_code || !credit_account_code) {
      return Response.json(
        { error: 'Rule code, rule name, transaction type, debit account, and credit account are required' },
        { status: 400 }
      );
    }

    // Validasi account codes exist
    const debitAccount = await query(
      'SELECT account_code FROM chart_of_accounts WHERE account_code = ? AND is_active = 1',
      [debit_account_code]
    );
    
    const creditAccount = await query(
      'SELECT account_code FROM chart_of_accounts WHERE account_code = ? AND is_active = 1',
      [credit_account_code]
    );

    if (debitAccount.length === 0) {
      return Response.json({ error: 'Debit account not found or inactive' }, { status: 400 });
    }

    if (creditAccount.length === 0) {
      return Response.json({ error: 'Credit account not found or inactive' }, { status: 400 });
    }

    // Check if rule code already exists
    const existingRule = await query(
      'SELECT rule_code FROM accounting_rules WHERE rule_code = ?',
      [rule_code]
    );

    if (existingRule.length > 0) {
      return Response.json({ error: 'Rule code already exists' }, { status: 400 });
    }

    // Insert new rule
    await query(
      `INSERT INTO accounting_rules 
       (rule_code, rule_name, description, transaction_type, debit_account_code, credit_account_code, is_active, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        rule_code,
        rule_name,
        description,
        transaction_type,
        debit_account_code,
        credit_account_code,
        is_active ? 1 : 0
      ]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes, timestamp)
       VALUES (?, ?, ?, 'create', 'accounting_rule', ?, ?, ?, NOW())`,
      [
        `AUD-${Date.now()}`,
        decoded.usercode,
        decoded.name,
        rule_code,
        `Accounting Rule ${rule_code}`,
        `Created new accounting rule: ${rule_name}`
      ]
    );

    return Response.json({
      success: true,
      message: 'Accounting rule created successfully',
      rule_code: rule_code
    });

  } catch (error) {
    console.error('Create accounting rule error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// UPDATE accounting rule
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ruleData = await request.json();
    const {
      rule_code,
      rule_name,
      description,
      transaction_type,
      debit_account_code,
      credit_account_code,
      is_active
    } = ruleData;

    if (!rule_code) {
      return Response.json({ error: 'Rule code is required' }, { status: 400 });
    }

    // Check if rule exists
    const existingRule = await query(
      'SELECT rule_code FROM accounting_rules WHERE rule_code = ?',
      [rule_code]
    );

    if (existingRule.length === 0) {
      return Response.json({ error: 'Accounting rule not found' }, { status: 404 });
    }

    // Validasi account codes jika di-update
    if (debit_account_code) {
      const debitAccount = await query(
        'SELECT account_code FROM chart_of_accounts WHERE account_code = ? AND is_active = 1',
        [debit_account_code]
      );
      if (debitAccount.length === 0) {
        return Response.json({ error: 'Debit account not found or inactive' }, { status: 400 });
      }
    }

    if (credit_account_code) {
      const creditAccount = await query(
        'SELECT account_code FROM chart_of_accounts WHERE account_code = ? AND is_active = 1',
        [credit_account_code]
      );
      if (creditAccount.length === 0) {
        return Response.json({ error: 'Credit account not found or inactive' }, { status: 400 });
      }
    }

    // Build dynamic update query
    let updateFields = [];
    let params = [];

    if (rule_name !== undefined) {
      updateFields.push('rule_name = ?');
      params.push(rule_name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      params.push(description);
    }
    if (transaction_type !== undefined) {
      updateFields.push('transaction_type = ?');
      params.push(transaction_type);
    }
    if (debit_account_code !== undefined) {
      updateFields.push('debit_account_code = ?');
      params.push(debit_account_code);
    }
    if (credit_account_code !== undefined) {
      updateFields.push('credit_account_code = ?');
      params.push(credit_account_code);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    updateFields.push('updated_at = NOW()');

    if (updateFields.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(rule_code);

    await query(
      `UPDATE accounting_rules SET ${updateFields.join(', ')} WHERE rule_code = ?`,
      params
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes, timestamp)
       VALUES (?, ?, ?, 'update', 'accounting_rule', ?, ?, ?, NOW())`,
      [
        `AUD-${Date.now()}`,
        decoded.usercode,
        decoded.name,
        rule_code,
        `Accounting Rule ${rule_code}`,
        `Updated accounting rule`
      ]
    );

    return Response.json({
      success: true,
      message: 'Accounting rule updated successfully'
    });

  } catch (error) {
    console.error('Update accounting rule error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE accounting rule (soft delete)
export async function DELETE(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ruleCode = searchParams.get('rule_code');

    if (!ruleCode) {
      return Response.json({ error: 'Rule code is required' }, { status: 400 });
    }

    // Check if rule exists and is not used in transactions
    const ruleUsage = await query(
      `SELECT COUNT(*) as usage_count FROM journal_entries WHERE reference_type = 'accounting_rule' AND reference_code = ?`,
      [ruleCode]
    );

    if (ruleUsage[0].usage_count > 0) {
      return Response.json(
        { error: 'Cannot delete accounting rule that is used in transactions' },
        { status: 400 }
      );
    }

    // Soft delete
    const result = await query(
      'UPDATE accounting_rules SET is_active = 0, updated_at = NOW() WHERE rule_code = ?',
      [ruleCode]
    );

    if (result.affectedRows === 0) {
      return Response.json({ error: 'Accounting rule not found' }, { status: 404 });
    }

    // Audit log
    await query(
      `INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes, timestamp)
       VALUES (?, ?, ?, 'delete', 'accounting_rule', ?, ?, ?, NOW())`,
      [
        `AUD-${Date.now()}`,
        decoded.usercode,
        decoded.name,
        ruleCode,
        `Accounting Rule ${ruleCode}`,
        `Deleted accounting rule`
      ]
    );

    return Response.json({
      success: true,
      message: 'Accounting rule deleted successfully'
    });

  } catch (error) {
    console.error('Delete accounting rule error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}