import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

// Helper function untuk validate template variables
function validateTemplate(template) {
  const allowedVariables = ['{company}', '{project}', '{customer}', '{sales_rep}', '{year}', '{month}'];
  const variablesInTemplate = template.match(/\{[\w]+\}/g) || [];
  
  const invalidVariables = variablesInTemplate.filter(v => !allowedVariables.includes(v));
  if (invalidVariables.length > 0) {
    throw new Error(`Invalid template variables: ${invalidVariables.join(', ')}. Allowed: ${allowedVariables.join(', ')}`);
  }
  
  return true;
}

// Helper function untuk audit log - DISABLED
async function createAuditLog(userCode, userName, action, resourceType, resourceCode, notes) {
  try {
    console.log(`[AUDIT DISABLED] ${action} ${resourceType} ${resourceCode}: ${notes}`);
    return;
  } catch (error) {
    console.error('Error in audit log (disabled):', error);
  }
}

// GET - Get all numbering sequences
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (sequence_code LIKE ? OR prefix LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const sequencesQuery = `
      SELECT 
        id,
        sequence_code,
        prefix,
        next_number,
        description,
        created_at,
        updated_at
      FROM numbering_sequences 
      ${whereClause}
      ORDER BY sequence_code ASC
    `;

    const sequences = await query(sequencesQuery, params);

    return Response.json({
      success: true,
      data: sequences
    });

  } catch (error) {
    console.error('GET numbering sequences error:', error);
    return Response.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// POST - Create new numbering sequence
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sequenceData = await request.json();
    const {
      sequence_code,
      prefix = '',
      next_number = 1,
      description = ''
    } = sequenceData;

    // Validation
    if (!sequence_code) {
      return Response.json(
        { success: false, error: 'Sequence code is required' },
        { status: 400 }
      );
    }

    // Validate template variables
    if (prefix) {
      try {
        validateTemplate(prefix);
      } catch (error) {
        return Response.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
    }

    // Check if sequence code already exists
    const existingSequence = await query(
      'SELECT sequence_code FROM numbering_sequences WHERE sequence_code = ?',
      [sequence_code]
    );

    if (existingSequence.length > 0) {
      return Response.json(
        { success: false, error: 'Sequence code already exists' },
        { status: 400 }
      );
    }

    // Insert sequence
    await query(
      `INSERT INTO numbering_sequences 
       (sequence_code, prefix, next_number, description) 
       VALUES (?, ?, ?, ?)`,
      [sequence_code, prefix, next_number, description]
    );

    // Audit log (disabled)
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'create',
      'numbering_sequence',
      sequence_code,
      `Created numbering sequence: ${sequence_code}`
    );

    return Response.json({
      success: true,
      message: 'Numbering sequence created successfully'
    });

  } catch (error) {
    console.error('POST numbering sequence error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update numbering sequence
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sequenceData = await request.json();
    const {
      id,
      sequence_code,
      prefix = '',
      next_number = 1,
      description = ''
    } = sequenceData;

    // Validation
    if (!id || !sequence_code) {
      return Response.json(
        { success: false, error: 'Sequence ID and code are required' },
        { status: 400 }
      );
    }

    // Validate template variables
    if (prefix) {
      try {
        validateTemplate(prefix);
      } catch (error) {
        return Response.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
    }

    // Check if sequence exists
    const existingSequence = await query(
      'SELECT sequence_code FROM numbering_sequences WHERE id = ?',
      [id]
    );

    if (existingSequence.length === 0) {
      return Response.json(
        { success: false, error: 'Numbering sequence not found' },
        { status: 404 }
      );
    }

    // Check if sequence code already exists (for other sequences)
    const existingCode = await query(
      'SELECT sequence_code FROM numbering_sequences WHERE sequence_code = ? AND id != ?',
      [sequence_code, id]
    );

    if (existingCode.length > 0) {
      return Response.json(
        { success: false, error: 'Sequence code already exists for another sequence' },
        { status: 400 }
      );
    }

    // Update sequence
    await query(
      `UPDATE numbering_sequences 
       SET sequence_code = ?, prefix = ?, next_number = ?, description = ?, updated_at = NOW()
       WHERE id = ?`,
      [sequence_code, prefix, next_number, description, id]
    );

    // Audit log (disabled)
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'update',
      'numbering_sequence',
      sequence_code,
      `Updated numbering sequence: ${sequence_code}`
    );

    return Response.json({
      success: true,
      message: 'Numbering sequence updated successfully'
    });

  } catch (error) {
    console.error('PUT numbering sequence error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete numbering sequence
export async function DELETE(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json(
        { success: false, error: 'Sequence ID is required' },
        { status: 400 }
      );
    }

    // Check if sequence exists
    const existingSequence = await query(
      'SELECT sequence_code FROM numbering_sequences WHERE id = ?',
      [id]
    );

    if (existingSequence.length === 0) {
      return Response.json(
        { success: false, error: 'Numbering sequence not found' },
        { status: 404 }
      );
    }

    const sequence = existingSequence[0];

    // Delete sequence
    await query(
      'DELETE FROM numbering_sequences WHERE id = ?',
      [id]
    );

    // Audit log (disabled)
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'delete',
      'numbering_sequence',
      sequence.sequence_code,
      `Deleted numbering sequence: ${sequence.sequence_code}`
    );

    return Response.json({
      success: true,
      message: 'Numbering sequence deleted successfully'
    });

  } catch (error) {
    console.error('DELETE numbering sequence error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Reset sequence number
export async function PATCH(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const newNumber = searchParams.get('new_number');

    if (!id || !newNumber) {
      return Response.json(
        { success: false, error: 'Sequence ID and new number are required' },
        { status: 400 }
      );
    }

    const nextNumber = parseInt(newNumber);
    if (isNaN(nextNumber) || nextNumber < 1) {
      return Response.json(
        { success: false, error: 'New number must be a positive integer' },
        { status: 400 }
      );
    }

    // Check if sequence exists
    const existingSequence = await query(
      'SELECT sequence_code FROM numbering_sequences WHERE id = ?',
      [id]
    );

    if (existingSequence.length === 0) {
      return Response.json(
        { success: false, error: 'Numbering sequence not found' },
        { status: 404 }
      );
    }

    const sequence = existingSequence[0];

    // Update sequence number
    await query(
      'UPDATE numbering_sequences SET next_number = ?, updated_at = NOW() WHERE id = ?',
      [nextNumber, id]
    );

    // Audit log (disabled)
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'update',
      'numbering_sequence',
      sequence.sequence_code,
      `Reset numbering sequence ${sequence.sequence_code} to ${nextNumber}`
    );

    return Response.json({
      success: true,
      message: `Sequence number reset to ${nextNumber} successfully`
    });

  } catch (error) {
    console.error('PATCH numbering sequence error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}