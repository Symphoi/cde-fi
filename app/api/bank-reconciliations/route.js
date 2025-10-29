// app/api/manual-journals/route.js
import { NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth';
import { query } from '@/app/lib/db';

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await query('SELECT COUNT(*) as total FROM manual_journals');
    const total = countResult.total;

    // Get journals with pagination
    const journals = await query(`
      SELECT mj.*, 
             GROUP_CONCAT(CONCAT(mji.account_code, '|', mji.debit_amount, '|', mji.credit_amount, '|', COALESCE(mji.description, ''))) as items
      FROM manual_journals mj
      LEFT JOIN manual_journal_items mji ON mj.journal_code = mji.journal_code
      GROUP BY mj.journal_code
      ORDER BY mj.transaction_date DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { transaction_date, description, items } = await request.json();

    // Validate total debit = total credit
    const totalDebit = items.reduce((sum, item) => sum + parseFloat(item.debit_amount || 0), 0);
    const totalCredit = items.reduce((sum, item) => sum + parseFloat(item.credit_amount || 0), 0);

    if (totalDebit !== totalCredit) {
      return NextResponse.json({ 
        success: false, 
        error: 'Total debit dan credit harus sama' 
      }, { status: 400 });
    }

    // Generate journal code
    const date = new Date();
    const yearMonth = date.getFullYear() + '' + String(date.getMonth() + 1).padStart(2, '0');
    
    // Get count for journal code
    const countResult = await query(
      'SELECT COUNT(*) as count FROM manual_journals WHERE journal_code LIKE ?', 
      [`MJ-${yearMonth}-%`]
    );
    
    const count = countResult[0]?.count || 0;
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
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

// POST to journal
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

    // Update manual journal status
    await query(
      'UPDATE manual_journals SET status = "posted", posted_at = NOW() WHERE journal_code = ?',
      [journalCode]
    );

    // Get journal data
    const journal = await query('SELECT * FROM manual_journals WHERE journal_code = ?', [journalCode]);
    const items = await query('SELECT * FROM manual_journal_items WHERE journal_code = ?', [journalCode]);

    if (journal.length === 0) {
      return NextResponse.json({ success: false, error: 'Journal not found' }, { status: 404 });
    }

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}