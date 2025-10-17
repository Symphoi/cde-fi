```sql
-- ==================== REKAP DATABASE STRUCTURE ====================

-- 🎯 MODULE 1: USERS & RBAC
CREATE TABLE `users` (
  `user_code` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `department` VARCHAR(255),
  `position` VARCHAR(255),
  `status` ENUM('active','inactive') DEFAULT 'active',
  `roles` JSON,
  `last_login` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(255),
  `is_deleted` BOOLEAN DEFAULT FALSE
);

CREATE TABLE `roles` (
  `role_code` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `is_system_role` BOOLEAN DEFAULT FALSE,
  `permissions` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(255),
  `is_deleted` BOOLEAN DEFAULT FALSE
);

CREATE TABLE `permissions` (
  `permission_code` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `category` VARCHAR(50) NOT NULL,
  `module` VARCHAR(100) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` BOOLEAN DEFAULT FALSE
);

-- 🎯 MODULE 2: SALES ORDERS
CREATE TABLE `sales_orders` (
  `so_code` VARCHAR(50) PRIMARY KEY,
  `date` DATE NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_phone` VARCHAR(20) NOT NULL,
  `customer_email` VARCHAR(255),
  `customer_company` VARCHAR(255),
  `billing_address` TEXT,
  `shipping_address` TEXT,
  `sales_rep` VARCHAR(255),
  `sales_rep_email` VARCHAR(255),
  `sales_order_doc` VARCHAR(255),
  `total_amount` DECIMAL(15,2) NOT NULL,
  `total_cost` DECIMAL(15,2) NOT NULL,
  `total_profit` DECIMAL(15,2) NOT NULL,
  `profit_margin` DECIMAL(5,2) NOT NULL,
  `status` ENUM('draft','confirmed','processing','shipped','delivered','cancelled','completed') DEFAULT 'draft',
  `payment_status` ENUM('pending','paid','overdue') DEFAULT 'pending',
  `project_code` VARCHAR(50),
  `tax_included` BOOLEAN DEFAULT FALSE,
  `shipping_cost` DECIMAL(15,2) DEFAULT 0,
  `notes` TEXT,
  `invoice_number` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(255),
  `is_deleted` BOOLEAN DEFAULT FALSE
);

CREATE TABLE `sales_order_items` (
  `item_code` VARCHAR(50) PRIMARY KEY,
  `sales_order_code` VARCHAR(50) NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(100) NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(15,2) NOT NULL,
  `subtotal` DECIMAL(15,2) NOT NULL,
  `cost_price` DECIMAL(15,2),
  `profit` DECIMAL(15,2),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` BOOLEAN DEFAULT FALSE
);

CREATE TABLE `sales_order_taxes` (
  `tax_code` VARCHAR(50) PRIMARY KEY,
  `sales_order_code` VARCHAR(50) NOT NULL,
  `tax_name` VARCHAR(100) NOT NULL,
  `tax_rate` DECIMAL(5,2) NOT NULL,
  `tax_amount` DECIMAL(15,2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` BOOLEAN DEFAULT FALSE
);

CREATE TABLE `sales_order_attachments` (
  `attachment_code` VARCHAR(50) PRIMARY KEY,
  `sales_order_code` VARCHAR(50) NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `file_type` ENUM('sales_order','other') NOT NULL,
  `file_size` VARCHAR(50),
  `upload_date` DATE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` BOOLEAN DEFAULT FALSE
);

-- 🎯 MODULE 3: PURCHASE ORDERS
CREATE TABLE `purchase_orders` (
  `po_code` VARCHAR(50) PRIMARY KEY,
  `sales_order_code` VARCHAR(50) NOT NULL,
  `supplier_name` VARCHAR(255) NOT NULL,
  `supplier_contact` VARCHAR(255),
  `supplier_bank` VARCHAR(255),
  `total_amount` DECIMAL(15,2) NOT NULL,
  `status` ENUM('submitted','approved_spv','approved_finance','rejected','paid') DEFAULT 'submitted',
  `notes` TEXT,
  `submitted_by` VARCHAR(255) NOT NULL,
  `submitted_date` DATE NOT NULL,
  `submitted_time` TIME NOT NULL,
  `priority` ENUM('low','medium','high') DEFAULT 'medium',
  `days_waiting` INT DEFAULT 0,
  `customer_ref` VARCHAR(255),
  `is_split_po` BOOLEAN DEFAULT FALSE,
  `original_so_quantity` INT,
  `split_sequence` INT,
  `approval_level` ENUM('spv','finance') DEFAULT 'spv',
  `approved_by_spv` VARCHAR(255),
  `approved_by_finance` VARCHAR(255),
  `approved_date_spv` DATE,
  `approved_date_finance` DATE,
  `approval_notes` TEXT,
  `rejection_reason` TEXT,
  `payment_proof` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(255),
  `is_deleted` BOOLEAN DEFAULT FALSE
);

CREATE TABLE `purchase_order_items` (
  `item_code` VARCHAR(50) PRIMARY KEY,
  `purchase_order_code` VARCHAR(50) NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(100) NOT NULL,
  `quantity` INT NOT NULL,
  `supplier` VARCHAR(255) NOT NULL,
  `purchase_price` DECIMAL(15,2) NOT NULL,
  `so_unit_price` DECIMAL(15,2) NOT NULL,
  `margin` DECIMAL(15,2) NOT NULL,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` BOOLEAN DEFAULT FALSE
);

-- 🎯 MODULE 4: APPROVAL SYSTEM
CREATE TABLE `bank_accounts` (
  `account_code` VARCHAR(50) PRIMARY KEY,
  `bank_name` VARCHAR(255) NOT NULL,
  `account_number` VARCHAR(255) NOT NULL,
  `account_name` VARCHAR(255) NOT NULL,
  `balance` DECIMAL(15,2) NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` BOOLEAN DEFAULT FALSE
);

CREATE TABLE `approval_documents` (
  `document_code` VARCHAR(50) PRIMARY KEY,
  `purchase_order_code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('customer_po','sales_order','purchase_order','supplier_invoice','payment_proof','other') NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `file_size` VARCHAR(50),
  `uploaded_by` VARCHAR(255) NOT NULL,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` BOOLEAN DEFAULT FALSE
);

CREATE TABLE `approval_logs` (
  `log_code` VARCHAR(50) PRIMARY KEY,
  `purchase_order_code` VARCHAR(50) NOT NULL,
  `action` ENUM('submit','approve_spv','approve_finance','reject','return') NOT NULL,
  `performed_by` VARCHAR(255) NOT NULL,
  `performed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT,
  `previous_status` VARCHAR(50),
  `new_status` VARCHAR(50)
);

-- 🎯 MODULE 5: PAYMENTS (DUAL SYSTEM)
CREATE TABLE `so_payments` (
  `payment_code` VARCHAR(50) PRIMARY KEY,
  `sales_order_code` VARCHAR(50) NOT NULL,
  `invoice_number` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `payment_date` DATE NOT NULL,
  `payment_method` ENUM('transfer','cash','credit_card','other') NOT NULL,
  `notes` TEXT,
  `status` ENUM('pending','paid','failed') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(255),
  `is_deleted` BOOLEAN DEFAULT FALSE
);

CREATE TABLE `po_payments` (
  `payment_code` VARCHAR(50) PRIMARY KEY,
  `purchase_order_code` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `payment_date` DATE NOT NULL,
  `payment_method` ENUM('transfer','cash','credit_card','other') NOT NULL,
  `bank_name` VARCHAR(255),
  `account_number` VARCHAR(255),
  `reference_number` VARCHAR(255) NOT NULL,
  `status` ENUM('pending','paid','failed') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(255),
  `is_deleted` BOOLEAN DEFAULT FALSE
);

CREATE TABLE `payment_documents` (
  `document_code` VARCHAR(50) PRIMARY KEY,
  `so_payment_code` VARCHAR(50),
  `po_payment_code` VARCHAR(50),
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('invoice','proof','other') DEFAULT 'proof',
  `filename` VARCHAR(255) NOT NULL,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` BOOLEAN DEFAULT FALSE
);

-- 🎯 MODULE 6: DELIVERY TRACKING
CREATE TABLE `delivery_orders` (
  `do_code` VARCHAR(50) PRIMARY KEY,
  `sales_order_code` VARCHAR(50) NOT NULL,
  `date` DATE NOT NULL,
  `courier` VARCHAR(255) NOT NULL,
  `tracking_number` VARCHAR(255) NOT NULL,
  `shipping_date` DATE NOT NULL,
  `shipping_cost` DECIMAL(15,2) DEFAULT 0,
  `shipping_proof` VARCHAR(255),
  `status` ENUM('shipping','delivered') DEFAULT 'shipping',
  `proof_of_delivery` VARCHAR(255),
  `received_date` DATE,
  `received_by` VARCHAR(255),
  `confirmation_method` ENUM('whatsapp','email','call','other'),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(255),
  `is_deleted` BOOLEAN DEFAULT FALSE
);

CREATE TABLE `delivery_order_items` (
  `item_code` VARCHAR(50) PRIMARY KEY,
  `delivery_order_code` VARCHAR(50) NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(100) NOT NULL,
  `quantity` INT NOT NULL,
  `purchase_order_code` VARCHAR(50) NOT NULL,
  `sales_order_item_code` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` BOOLEAN DEFAULT FALSE
);

CREATE TABLE `delivery_po_mapping` (
  `mapping_code` VARCHAR(50) PRIMARY KEY,
  `delivery_order_code` VARCHAR(50) NOT NULL,
  `purchase_order_code` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` BOOLEAN DEFAULT FALSE
);

CREATE TABLE `delivery_tracking_logs` (
  `log_code` VARCHAR(50) PRIMARY KEY,
  `delivery_order_code` VARCHAR(50) NOT NULL,
  `status` VARCHAR(100) NOT NULL,
  `location` VARCHAR(255),
  `description` TEXT,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(255),
  `is_deleted` BOOLEAN DEFAULT FALSE
);

-- 🎯 MODULE 7: PROJECTS & MASTER DATA
CREATE TABLE `projects` (
  `project_code` VARCHAR(50) PRIMARY KEY,
  `company_code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` BOOLEAN DEFAULT FALSE
);

CREATE TABLE `products` (
  `product_code` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(100) UNIQUE NOT NULL,
  `description` TEXT,
  `unit_price` DECIMAL(15,2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` BOOLEAN DEFAULT FALSE
);

CREATE TABLE `customers` (
  `customer_code` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255),
  `phone` VARCHAR(20),
  `company_name` VARCHAR(255),
  `billing_address` TEXT,
  `shipping_address` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` BOOLEAN DEFAULT FALSE
);

CREATE TABLE `suppliers` (
  `supplier_code` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `contact_person` VARCHAR(255),
  `phone` VARCHAR(20),
  `email` VARCHAR(255),
  `bank_name` VARCHAR(255),
  `account_number` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` BOOLEAN DEFAULT FALSE
);
```
