// app/api/manual-journals/route.js
import { NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

// GET - Handle both accounts dropdown and journals list
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Jika request untuk get accounts (dropdown)
    if (action === 'accounts') {
      const accounts = await query(`
        SELECT account_code, account_name, account_type, category
        FROM chart_of_accounts 
        WHERE is_active = true
        ORDER BY 
          CASE account_type
            WHEN 'asset' THEN 1
            WHEN 'liability' THEN 2
            WHEN 'equity' THEN 3
            WHEN 'income' THEN 4
            WHEN 'expense' THEN 5
            WHEN 'cost_of_sales' THEN 6
            ELSE 7
          END,
          account_code
      `);
      return NextResponse.json({ success: true, data: accounts });
    }

    // Jika request untuk get journals (pagination + filter)
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;
    
    // Filter parameters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build WHERE conditions
    let whereConditions = [];
    let queryParams = [];
    let countParams = [];

    if (search) {
      whereConditions.push('(mj.journal_code LIKE ? OR mj.description LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (status !== 'all') {
      whereConditions.push('mj.status = ?');
      queryParams.push(status);
      countParams.push(status);
    }

    if (startDate) {
      whereConditions.push('mj.transaction_date >= ?');
      queryParams.push(startDate);
      countParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push('mj.transaction_date <= ?');
      queryParams.push(endDate);
      countParams.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count dengan filter
    const countQuery = `SELECT COUNT(*) as total FROM manual_journals mj ${whereClause}`;
    const countResult = await query(countQuery, countParams);
    const total = countResult[0].total;

    // Get journals dengan pagination + filter
    const journalsQuery = `
      SELECT mj.*, 
             GROUP_CONCAT(CONCAT(mji.account_code, '|', mji.debit_amount, '|', mji.credit_amount, '|', COALESCE(mji.description, ''))) as items
      FROM manual_journals mj
      LEFT JOIN manual_journal_items mji ON mj.journal_code = mji.journal_code
      ${whereClause}
      GROUP BY mj.journal_code
      ORDER BY mj.transaction_date DESC, mj.journal_code DESC
      LIMIT ? OFFSET ?
    `;
    
    queryParams.push(limit, offset);
    const journals = await query(journalsQuery, queryParams);

    const formattedJournals = journals.map(journal => ({
      ...journal,
      items: journal.items ? journal.items.split(',').map(item => {
        const [account_code, debit_amount, credit_amount, description] = item.split('|');
        return { 
          account_code, 
          debit_amount: parseFloat(debit_amount), 
          credit_amount: parseFloat(credit_amount), 
          description 
        };
      }) : []
    }));

    return NextResponse.json({ 
      success: true, 
      data: formattedJournals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('GET Manual Journals Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// POST create manual journal
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { transaction_date, description, items } = await request.json();

    // Validate required fields
    if (!transaction_date || !description || !items || items.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tanggal, deskripsi, dan items harus diisi' 
      }, { status: 400 });
    }

    // Validate total debit = total credit
    const totalDebit = items.reduce((sum, item) => sum + parseFloat(item.debit_amount || 0), 0);
    const totalCredit = items.reduce((sum, item) => sum + parseFloat(item.credit_amount || 0), 0);

    if (totalDebit !== totalCredit) {
      return NextResponse.json({ 
        success: false, 
        error: 'Total debit dan credit harus sama' 
      }, { status: 400 });
    }

    // Validate account codes exist
    const accountCodes = items.map(item => item.account_code).filter(code => code);
    if (accountCodes.length > 0) {
      const placeholders = accountCodes.map(() => '?').join(',');
      const validAccounts = await query(
        `SELECT account_code FROM chart_of_accounts WHERE account_code IN (${placeholders}) AND is_active = true`,
        accountCodes
      );
      
      const validAccountCodes = validAccounts.map(acc => acc.account_code);
      const invalidAccounts = accountCodes.filter(code => !validAccountCodes.includes(code));
      
      if (invalidAccounts.length > 0) {
        return NextResponse.json({ 
          success: false, 
          error: `Kode akun tidak valid: ${invalidAccounts.join(', ')}` 
        }, { status: 400 });
      }
    }

    // Generate journal code
    const date = new Date();
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const countResult = await query(
      'SELECT COUNT(*) as total FROM manual_journals WHERE journal_code LIKE ?', 
      [`MJ-${yearMonth}-%`]
    );
    
    const count = countResult[0].total || 0;
    const journalCode = `MJ-${yearMonth}-${String(count + 1).padStart(3, '0')}`;

    // Save manual journal
    await query(
      'INSERT INTO manual_journals (journal_code, transaction_date, description, total_amount, created_by) VALUES (?, ?, ?, ?, ?)',
      [journalCode, transaction_date, description, totalDebit, decoded.email || 'system']
    );

    // Save journal items
    for (const item of items) {
      await query(
        'INSERT INTO manual_journal_items (journal_code, account_code, debit_amount, credit_amount, description) VALUES (?, ?, ?, ?, ?)',
        [journalCode, item.account_code, item.debit_amount || 0, item.credit_amount || 0, item.description || '']
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: { journal_code: journalCode },
      message: 'Jurnal manual berhasil dibuat'
    });
  } catch (error) {
    console.error('POST Manual Journals Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Gagal membuat jurnal manual' 
    }, { status: 500 });
  }
}

// PUT untuk post journal ke general ledger
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { journalCode } = await request.json();

    if (!journalCode) {
      return NextResponse.json({ success: false, error: 'Journal code is required' }, { status: 400 });
    }

    // Check if journal exists and is draft
    const journal = await query('SELECT * FROM manual_journals WHERE journal_code = ?', [journalCode]);
    
    if (journal.length === 0) {
      return NextResponse.json({ success: false, error: 'Journal tidak ditemukan' }, { status: 404 });
    }

    if (journal[0].status === 'posted') {
      return NextResponse.json({ success: false, error: 'Journal sudah diposting' }, { status: 400 });
    }

    // Update manual journal status
    await query(
      'UPDATE manual_journals SET status = "posted", posted_at = NOW() WHERE journal_code = ?',
      [journalCode]
    );

    // Get journal items
    const items = await query('SELECT * FROM manual_journal_items WHERE journal_code = ?', [journalCode]);

    // Generate main journal entry
    const mainJournalCode = `JNL-${journalCode}`;
    await query(
      `INSERT INTO journal_entries (journal_code, transaction_date, description, reference_module, reference_code, total_amount) 
       VALUES (?, ?, ?, "MANUAL", ?, ?)`,
      [mainJournalCode, journal[0].transaction_date, journal[0].description, journalCode, journal[0].total_amount]
    );

    // Create journal entry items
    for (const item of items) {
      await query(
        `INSERT INTO journal_entry_items (journal_code, account_code, debit_amount, credit_amount, description) 
         VALUES (?, ?, ?, ?, ?)`,
        [mainJournalCode, item.account_code, item.debit_amount, item.credit_amount, item.description]
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Jurnal berhasil diposting ke general ledger'
    });
  } catch (error) {
    console.error('PUT Manual Journals Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Gagal memposting jurnal' 
    }, { status: 500 });
  }
}