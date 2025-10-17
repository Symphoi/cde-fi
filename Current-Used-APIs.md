# Current Used APIs

This document lists only the API endpoints that are currently being used by the frontend components of the CDE-FI application.

## Authentication APIs

### POST /api/auth/login
Authenticate user and get JWT token.

**Headers:**
- `Content-Type: application/json`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_code": "USR-001",
    "name": "John Doe",
    "email": "user@example.com",
    "department": "Sales",
    "position": "Manager",
    "roles": [
      {
        "role_code": "admin",
        "role_name": "Administrator"
      }
    ],
    "permissions": [
      {
        "permission_code": "read_sales_orders",
        "name": "Read Sales Orders",
        "category": "sales",
        "module": "orders",
        "action": "read"
      }
    ]
  }
}
```

### GET /api/auth/me
Get authenticated user information.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "user_code": "USR-001",
    "name": "John Doe",
    "email": "user@example.com",
    "department": "Sales",
    "position": "Manager",
    "roles": [
      {
        "role_code": "admin",
        "role_name": "Administrator"
      }
    ],
    "permissions": [
      {
        "permission_code": "read_sales_orders",
        "name": "Read Sales Orders",
        "category": "sales",
        "module": "orders",
        "action": "read"
      }
    ]
  }
}
```

## Sales Orders APIs

### GET /api/sales-orders
Get all sales orders with filtering, searching, and pagination.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Filter by status (e.g., submitted, approved, rejected, all)
- `search` (optional): Search term for customer name, phone, email, or SO code
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "so_code": "SO-2025-0001",
      "created_at": "2024-01-01T10:00:00Z",
      "customer_name": "John Doe",
      "customer_phone": "1234567890",
      "customer_email": "john@example.com",
      "billing_address": "123 Main St",
      "shipping_address": "123 Main St",
      "sales_rep": "Jane Smith",
      "sales_rep_email": "jane@example.com",
      "sales_order_doc": null,
      "total_amount": 1000,
      "tax_amount": 100,
      "shipping_cost": 50,
      "status": "submitted",
      "notes": "Test order",
      "items": [
        {
          "so_item_code": "SOI-1234567890-abc",
          "product_name": "Product A",
          "product_code": "PROD-001",
          "quantity": 5,
          "unit_price": 200,
          "subtotal": 1000
        }
      ],
      "taxes": [
        {
          "so_tax_code": "SOT-1234567890-def",
          "tax_name": "VAT",
          "tax_rate": 10,
          "tax_amount": 100
        }
      ],
      "attachments": [
        {
          "id": "ATT-1234567890",
          "name": "invoice.pdf",
          "type": "application/pdf",
          "upload_date": "2024-01-01T10:00:00Z",
          "size": 102400
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### POST /api/sales-orders
Create a new sales order. Supports both JSON and multipart/form-data for file uploads.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json` or `multipart/form-data`

**Request Body (JSON):**
```json
{
  "customer_name": "John Doe",
  "customer_phone": "1234567890",
  "customer_email": "john@example.com",
  "billing_address": "123 Main St",
  "shipping_address": "123 Main St",
  "sales_rep": "Jane Smith",
  "sales_rep_email": "jane@example.com",
  "sales_order_doc": "Document reference",
  "total_amount": 1000,
  "tax_amount": 100,
  "shipping_cost": 50,
  "notes": "Test order",
  "items": [
    {
      "product_name": "Product A",
      "product_code": "PROD-001",
      "quantity": 5,
      "unit_price": 200,
      "subtotal": 1000
    }
  ],
  "taxes": [
    {
      "tax_name": "VAT",
      "tax_rate": 10,
      "tax_amount": 100
    }
  ]
}
```

**Request Body (Form Data for file uploads):**
```javascript
// FormData with 'data' field containing JSON string and files
const salesOrderData = {
  "customer_name": "John Doe",
  "customer_phone": "1234567890",
  // ... other fields as needed
};

formData.append('data', JSON.stringify(salesOrderData));
formData.append('sales_order_doc', salesOrderFile);  // Sales order document
formData.append('other_docs', otherDocumentFile);    // Other documents
```

**Response:**
```json
{
  "success": true,
  "message": "Sales order created successfully",
  "so_code": "SO-2025-0001",
  "files_uploaded": 0
}
```

### GET /api/sales-orders/[so_code]
Get a specific sales order by its code.

**Headers:**
- `Authorization: Bearer <token>`

**Path Parameters:**
- `so_code`: The sales order code

**Response:**
```json
{
  "success": true,
  "data": {
    "so_code": "SO-2025-0001",
    "created_at": "2024-01-01T10:00:00Z",
    "customer_name": "John Doe",
    "customer_phone": "1234567890",
    "customer_email": "john@example.com",
    "billing_address": "123 Main St",
    "shipping_address": "123 Main St",
    "sales_rep": "Jane Smith",
    "sales_rep_email": "jane@example.com",
    "sales_order_doc": null,
    "total_amount": 1000,
    "tax_amount": 100,
    "shipping_cost": 50,
    "status": "submitted",
    "notes": "Test order",
    "items": [
      {
        "so_item_code": "SOI-1234567890-abc",
        "product_name": "Product A",
        "product_code": "PROD-001",
        "quantity": 5,
        "unit_price": 200,
        "subtotal": 1000
      }
    ],
    "taxes": [
      {
        "so_tax_code": "SOT-1234567890-def",
        "tax_name": "VAT",
        "tax_rate": 10,
        "tax_amount": 100
      }
    ],
    "attachments": [
      {
        "id": "ATT-1234567890",
        "name": "invoice.pdf",
        "type": "application/pdf",
        "upload_date": "2024-01-01T10:00:00Z",
        "size": 102400
      }
    ]
  }
}
```

## Purchase Orders APIs

### GET /api/purchase-orders
Get all purchase orders with filtering, searching, and pagination.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Filter by status (e.g., submitted, approved_spv, approved_finance, rejected, paid)
- `search` (optional): Search term for PO code, supplier name, or SO reference
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "po_code": "PO-2025-0001",
      "so_code": "SO-2025-0001",
      "so_reference": "SO-2025-0001",
      "supplier_name": "Supplier ABC",
      "supplier_contact": "supplier@example.com",
      "supplier_bank": "Bank Name",
      "total_amount": 1000,
      "status": "submitted",
      "notes": "Test order",
      "date": "2024-01-01",
      "priority": "medium",
      "days_waiting": 0,
      "customer_ref": "Customer Ref",
      "approval_level": null,
      "approved_by_spv": null,
      "approved_by_finance": null,
      "approved_date_spv": null,
      "approved_date_finance": null,
      "approval_notes": null,
      "rejection_reason": null,
      "created_at": "2024-01-01T10:00:00Z",
      "items": [
        {
          "po_item_code": "POI-1234567890-xyz",
          "product_name": "Product A",
          "product_code": "PROD-001",
          "quantity": 5,
          "supplier": "Supplier ABC",
          "purchase_price": 200,
          "notes": "Test item"
        }
      ],
      "payments": [
        {
          "payment_code": "PAY-2025-0001",
          "amount": 1000,
          "payment_date": "2024-01-01",
          "payment_method": "Bank Transfer",
          "bank_name": "Test Bank",
          "account_number": "1234567890",
          "reference_number": "REF-001",
          "status": "paid"
        }
      ],
      "attachments": [
        {
          "id": "POATT-1234567890",
          "name": "contract.pdf",
          "type": "application/pdf",
          "filename": "contract.pdf",
          "upload_date": "2024-01-01T10:00:00Z"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### POST /api/purchase-orders
Create a new purchase order. Supports both JSON and multipart/form-data for file uploads.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json` or `multipart/form-data`

**Request Body (JSON):**
```json
{
  "so_code": "SO-2025-0001",
  "so_reference": "SO-2025-0001",
  "supplier_name": "Supplier ABC",
  "supplier_contact": "supplier@example.com",
  "supplier_bank": "Bank Name",
  "notes": "Test order",
  "items": [
    {
      "product_name": "Product A",
      "product_code": "PROD-001",
      "quantity": 5,
      "supplier": "Supplier ABC",
      "purchase_price": 200,
      "notes": "Test item"
    }
  ],
  "priority": "medium",
  "customer_ref": "Customer Ref"
}
```

**Request Body (Form Data):**
```javascript
// FormData with 'data' field containing JSON string and files
formData.append('data', JSON.stringify(purchaseOrderData));
formData.append('files', file1);
formData.append('files', file2);
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase order created successfully",
  "po_code": "PO-2025-0001",
  "files_uploaded": 0
}
```

### OPTIONS /api/purchase-orders
Get sales orders for creating purchase orders (used by the frontend). This is an alternative endpoint in the purchase orders route.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `search` (optional): Search term for SO code, customer name, or SO reference
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "so_code": "SO-2025-0001",
      "customer_name": "John Doe",
      "customer_phone": "1234567890",
      "customer_email": "john@example.com",
      "sales_rep": "Jane Smith",
      "total_amount": 1000,
      "status": "submitted",
      "created_at": "2024-01-01T10:00:00Z",
      "items": [
        {
          "so_item_code": "SOI-1234567890-abc",
          "product_name": "Product A",
          "product_code": "PROD-001",
          "quantity": 5,
          "unit_price": 200,
          "subtotal": 1000
        }
      ],
      "po_count": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### PATCH /api/purchase-orders
Update purchase order status (approve/reject). This endpoint is used for approval actions in the purchase orders context.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "po_code": "PO-2025-0001",
  "action": "approve_spv",  // or "approve_finance", "reject"
  "notes": "Approved by supervisor",
  "rejection_reason": "Reason for rejection (only for reject action)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase order approved successfully"
}
```

### PUT /api/purchase-orders
Create a payment for a purchase order. Supports multipart/form-data for file uploads.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body:**
```javascript
// FormData with 'data' field containing payment info and 'files' for attachments
const paymentData = {
  "po_code": "PO-2025-0001",
  "payment_method": "Bank Transfer",
  "bank_name": "Test Bank",
  "account_number": "1234567890",
  "payment_date": "2024-01-01",
  "reference_number": "REF-001",
  "notes": "Payment notes",
  "amount": 1000,
  "supplier_name": "Supplier ABC",
  "so_code": "SO-2025-0001",
  "so_reference": "SO-2025-0001"
};

formData.append('data', JSON.stringify(paymentData));
formData.append('files', paymentProofFile);
```

**Response:**
```json
{
  "success": true,
  "message": "Payment created successfully with 1 documents",
  "payment_code": "PAY-2025-0001"
}
```

## Approval Transactions APIs

### GET /api/approval-transactions
Get all purchase orders for approval or get details of a specific PO.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `po_code` (optional): Get details for a specific purchase order

**Response (All for approval):**
```json
{
  "success": true,
  "data": [
    {
      "po_code": "PO-2025-0001",
      "so_code": "SO-2025-0001",
      "so_reference": "SO-2025-0001",
      "supplier_name": "Supplier ABC",
      "supplier_contact": "supplier@example.com",
      "supplier_bank": "Bank Name",
      "total_amount": 1000,
      "status": "submitted",
      "notes": "Test order",
      "date": "2024-01-01",
      "priority": "medium",
      "days_waiting": 5,
      "customer_ref": "Customer Ref",
      "approval_level": null,
      "approved_by_spv": null,
      "approved_by_finance": null,
      "approved_date_spv": null,
      "approved_date_finance": null,
      "approval_notes": null,
      "rejection_reason": null,
      "created_at": "2024-01-01T10:00:00Z",
      "customer_name": "John Doe",
      "customer_phone": "1234567890",
      "customer_email": "john@example.com",
      "sales_rep": "Jane Smith",
      "sales_rep_email": "jane@example.com",
      "items_count": 5
    }
  ]
}
```

**Response (Single PO Detail):**
```json
{
  "success": true,
  "data": {
    "po_code": "PO-2025-0001",
    "so_code": "SO-2025-0001",
    "so_reference": "SO-2025-0001",
    "supplier_name": "Supplier ABC",
    "supplier_contact": "supplier@example.com",
    "supplier_bank": "Bank Name",
    "total_amount": 1000,
    "status": "submitted",
    "notes": "Test order",
    "date": "2024-01-01",
    "priority": "medium",
    "days_waiting": 5,
    "customer_ref": "Customer Ref",
    "approval_level": null,
    "approved_by_spv": null,
    "approved_by_finance": null,
    "approved_date_spv": null,
    "approved_date_finance": null,
    "approval_notes": null,
    "rejection_reason": null,
    "created_at": "2024-01-01T10:00:00Z",
    "customer_name": "John Doe",
    "customer_phone": "1234567890",
    "customer_email": "john@example.com",
    "customer_address": "123 Main St",
    "sales_rep": "Jane Smith",
    "sales_rep_email": "jane@example.com",
    "so_total_amount": 1200,
    "items": [
      {
        "po_item_code": "POI-1234567890-xyz",
        "product_name": "Product A",
        "product_code": "PROD-001",
        "quantity": 5,
        "purchase_price": 200,
        "notes": "Test item",
        "so_unit_price": 240,
        "margin": 200,
        "margin_percentage": 16.67
      }
    ],
    "documents": [
      {
        "id": "POATT-1234567890",
        "name": "contract.pdf",
        "type": "application/pdf",
        "filename": "contract.pdf",
        "file_path": "/uploads/po/contract.pdf",
        "upload_date": "2024-01-01T10:00:00Z",
        "source": "PO"
      }
    ],
    "is_split_po": false,
    "original_so_quantity": 5,
    "split_sequence": 1
  }
}
```

### PATCH /api/approval-transactions
Approve or reject a purchase order.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "po_code": "PO-2025-0001",
  "action": "approve_spv",  // or "approve_finance", "reject"
  "notes": "Approved by supervisor",
  "rejection_reason": "Reason for rejection (only for reject action)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase order approved successfully"
}
```

## Reference Data APIs

### GET /api/projects
Get all projects.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "project_code": "PROJ-2025-001",
      "name": "Project Alpha",
      "description": "Test project",
      "client_name": "Client ABC",
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "budget": 10000,
      "status": "active"
    }
  ]
}
```

### GET /api/tax-types
Get all active tax types.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tax_code": "VAT-001",
      "name": "VAT",
      "description": "Value Added Tax"
    }
  ]
}
```

## Attachments API

### GET /api/attachments/[id]
Download a sales order attachment by its ID.

**Path Parameters:**
- `id`: The attachment code

**Response:**
File download with appropriate content type.

## Frontend Usage Patterns

### Authentication Flow
- Login form calls POST `/api/auth/login` and stores the JWT token in `localStorage` under the key `'token'`
- User profile is stored in `localStorage` under the key `'user'`
- All authenticated API calls include the token in the `Authorization` header as `Bearer <token>`
- The frontend implements test accounts for development:
  - Admin: `admin@company.com` / `password123`
  - Finance: `budi.finance@company.com` / `password123`
  - Staff: `ahmad.sales@company.com` / `password123`

### Error Handling
- 401 Unauthorized responses trigger automatic logout and redirect to login
- Error messages are displayed using toast notifications
- Failed API calls are properly handled with user feedback

### Client-Side Token Management
- The frontend stores authentication tokens in localStorage
- Tokens are automatically included in the Authorization header for all protected endpoints
- Session expiration is handled gracefully with redirects to login page