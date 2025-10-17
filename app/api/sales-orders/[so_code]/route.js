// app/api/sales-orders/[so_code]/route.js
import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

export async function GET(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { so_code } = params;

    // Get sales order
    const salesOrders = await query(
      `SELECT 
        so.so_code,
        so.created_at,
        so.customer_name,
        so.customer_phone,
        so.customer_email,
        so.billing_address,
        so.shipping_address,
        so.sales_rep,
        so.sales_rep_email,
        so.sales_order_doc,
        so.total_amount,
        so.tax_amount,
        so.shipping_cost,
        so.status,
        so.notes
       FROM sales_orders so 
       WHERE so.so_code = ? AND so.is_deleted = FALSE`,
      [so_code]
    );

    if (salesOrders.length === 0) {
      return Response.json(
        { error: 'Sales order not found' },
        { status: 404 }
      );
    }

    const salesOrder = salesOrders[0];

    // Get items
    const items = await query(
      `SELECT 
        so_item_code,
        product_name,
        product_code,
        quantity,
        unit_price,
        subtotal
       FROM sales_order_items 
       WHERE so_code = ? AND is_deleted = FALSE`,
      [so_code]
    );
    salesOrder.items = items;

    // Get taxes
    const taxes = await query(
      `SELECT 
        so_tax_code,
        tax_name,
        tax_rate,
        tax_amount
       FROM sales_order_taxes 
       WHERE so_code = ? AND is_deleted = FALSE`,
      [so_code]
    );
    salesOrder.taxes = taxes;

    // Get attachments
    const attachments = await query(
      `SELECT 
        attachment_code as id,
        filename as name,
        file_type as type,
        uploaded_at as upload_date,
        file_size as size
       FROM sales_order_attachments 
       WHERE so_code = ? AND is_deleted = FALSE`,
      [so_code]
    );
    salesOrder.attachments = attachments;

    return Response.json({
      success: true,
      data: salesOrder
    });

  } catch (error) {
    console.error('Get sales order detail error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}