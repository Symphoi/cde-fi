/*
 Navicat Premium Dump SQL

 Source Server         : localhost
 Source Server Type    : MySQL
 Source Server Version : 80043 (8.0.43-0ubuntu0.24.04.2)
 Source Host           : localhost:3306
 Source Schema         : cdefi-v2

 Target Server Type    : MySQL
 Target Server Version : 80043 (8.0.43-0ubuntu0.24.04.2)
 File Encoding         : 65001

 Date: 30/10/2025 00:56:43
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for accounting_periods
-- ----------------------------
DROP TABLE IF EXISTS `accounting_periods`;
CREATE TABLE `accounting_periods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `period_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `period_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('open','closed','locked') COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `is_fiscal_year` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `period_code` (`period_code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of accounting_periods
-- ----------------------------
BEGIN;
INSERT INTO `accounting_periods` (`id`, `period_code`, `period_name`, `start_date`, `end_date`, `status`, `is_fiscal_year`, `created_at`, `updated_at`) VALUES (1, '2024-01', 'Januari 2024', '2024-01-01', '2024-01-31', 'open', 0, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
COMMIT;

-- ----------------------------
-- Table structure for accounting_rules
-- ----------------------------
DROP TABLE IF EXISTS `accounting_rules`;
CREATE TABLE `accounting_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rule_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `transaction_type` enum('sales','purchase','cash_advance','reimbursement','payment','receipt') COLLATE utf8mb4_unicode_ci NOT NULL,
  `debit_account_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `credit_account_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rule_code` (`rule_code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of accounting_rules
-- ----------------------------
BEGIN;
INSERT INTO `accounting_rules` (`id`, `rule_code`, `rule_name`, `transaction_type`, `debit_account_code`, `credit_account_code`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (1, 'RULE001', 'Penjualan Kredit', 'sales', '1130', '4100', NULL, 1, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `accounting_rules` (`id`, `rule_code`, `rule_name`, `transaction_type`, `debit_account_code`, `credit_account_code`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (2, 'RULE002', 'Pembelian Kredit', 'purchase', '5100', '2110', NULL, 1, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `accounting_rules` (`id`, `rule_code`, `rule_name`, `transaction_type`, `debit_account_code`, `credit_account_code`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (3, 'RULE003', 'Penerimaan Kas', 'receipt', '1110', '1130', NULL, 1, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `accounting_rules` (`id`, `rule_code`, `rule_name`, `transaction_type`, `debit_account_code`, `credit_account_code`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (4, 'RULE004', 'Pengeluaran Kas', 'payment', '2110', '1110', NULL, 1, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `accounting_rules` (`id`, `rule_code`, `rule_name`, `transaction_type`, `debit_account_code`, `credit_account_code`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (5, 'RULE005', 'Cash Advance', 'cash_advance', '1130', '1110', NULL, 1, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `accounting_rules` (`id`, `rule_code`, `rule_name`, `transaction_type`, `debit_account_code`, `credit_account_code`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (6, 'RULE006', 'Reimbursement', 'reimbursement', '5100', '1110', NULL, 1, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
COMMIT;

-- ----------------------------
-- Table structure for accounts_payable
-- ----------------------------
DROP TABLE IF EXISTS `accounts_payable`;
CREATE TABLE `accounts_payable` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ap_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `outstanding_amount` decimal(15,2) NOT NULL,
  `status` enum('unpaid','paid') COLLATE utf8mb4_unicode_ci DEFAULT 'unpaid',
  `po_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ap_code` (`ap_code`),
  UNIQUE KEY `invoice_number` (`invoice_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of accounts_payable
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for accounts_receivable
-- ----------------------------
DROP TABLE IF EXISTS `accounts_receivable`;
CREATE TABLE `accounts_receivable` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ar_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `outstanding_amount` decimal(15,2) NOT NULL,
  `status` enum('unpaid','paid') COLLATE utf8mb4_unicode_ci DEFAULT 'unpaid',
  `so_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ar_code` (`ar_code`),
  UNIQUE KEY `invoice_number` (`invoice_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of accounts_receivable
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for ap_payments
-- ----------------------------
DROP TABLE IF EXISTS `ap_payments`;
CREATE TABLE `ap_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ap_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_code` (`payment_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of ap_payments
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for ar_payments
-- ----------------------------
DROP TABLE IF EXISTS `ar_payments`;
CREATE TABLE `ar_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ar_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_code` (`payment_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of ar_payments
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for audit_logs
-- ----------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `audit_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` enum('create','update','delete','assign','revoke','approve','reject','pay','reconcile','post_journal','close_period') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_type` enum('sales_order','purchase_order','payment','delivery_order','journal_entry','accounting_period','ar_invoice','ap_invoice') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resource_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `audit_code` (`audit_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of audit_logs
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for bank_accounts
-- ----------------------------
DROP TABLE IF EXISTS `bank_accounts`;
CREATE TABLE `bank_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_holder` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'IDR',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_code` (`account_code`),
  UNIQUE KEY `account_number` (`account_number`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of bank_accounts
-- ----------------------------
BEGIN;
INSERT INTO `bank_accounts` (`id`, `account_code`, `bank_name`, `account_number`, `account_holder`, `branch`, `currency`, `description`, `is_active`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`) VALUES (1, 'BNK439', 'BCA', '4360135611111111', 'DAEROBI ', '', 'IDR', 'BANK BCA', 1, 0, NULL, '2025-10-29 23:01:01', '2025-10-29 23:01:01');
INSERT INTO `bank_accounts` (`id`, `account_code`, `bank_name`, `account_number`, `account_holder`, `branch`, `currency`, `description`, `is_active`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`) VALUES (2, 'BNK600', 'BNI', '11111', 'DAEROBI', '', 'IDR', 'BANK BNI', 1, 0, NULL, '2025-10-29 23:06:28', '2025-10-29 23:06:28');
INSERT INTO `bank_accounts` (`id`, `account_code`, `bank_name`, `account_number`, `account_holder`, `branch`, `currency`, `description`, `is_active`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`) VALUES (3, 'BNK565', 'MANDIRI', '43601355555611', 'MANDIRI ME', '', 'IDR', 'BANK MANDIRI', 1, 0, NULL, '2025-10-29 23:07:25', '2025-10-29 23:07:25');
COMMIT;

-- ----------------------------
-- Table structure for bank_reconciliations
-- ----------------------------
DROP TABLE IF EXISTS `bank_reconciliations`;
CREATE TABLE `bank_reconciliations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reconciliation_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_account_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `statement_date` date NOT NULL,
  `ending_balance` decimal(15,2) NOT NULL,
  `reconciled_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reconciled_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('draft','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reconciliation_code` (`reconciliation_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of bank_reconciliations
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for ca_settlements
-- ----------------------------
DROP TABLE IF EXISTS `ca_settlements`;
CREATE TABLE `ca_settlements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `settlement_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ca_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_ca_amount` decimal(15,2) NOT NULL,
  `total_used_amount` decimal(15,2) NOT NULL,
  `remaining_amount` decimal(15,2) NOT NULL,
  `refund_proof_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refund_proof_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `settlement_date` date NOT NULL,
  `status` enum('submitted','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'submitted',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settlement_code` (`settlement_code`),
  UNIQUE KEY `ca_code` (`ca_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of ca_settlements
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for ca_transactions
-- ----------------------------
DROP TABLE IF EXISTS `ca_transactions`;
CREATE TABLE `ca_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ca_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `transaction_date` date NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('transportation','accommodation','meals','entertainment','office_supplies','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `receipt_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receipt_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_code` (`transaction_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of ca_transactions
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for cash_advances
-- ----------------------------
DROP TABLE IF EXISTS `cash_advances`;
CREATE TABLE `cash_advances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ca_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `used_amount` decimal(15,2) DEFAULT '0.00',
  `remaining_amount` decimal(15,2) DEFAULT '0.00',
  `status` enum('submitted','approved','rejected','active','in_settlement','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'submitted',
  `request_date` date NOT NULL,
  `project_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by_spv` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by_finance` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_date_spv` date DEFAULT NULL,
  `rejection_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `approved_date_finance` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `submitted_date` datetime DEFAULT NULL,
  `submitted_time` datetime DEFAULT NULL,
  `journal_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accounting_status` enum('not_posted','posted','reconciled') COLLATE utf8mb4_unicode_ci DEFAULT 'not_posted',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ca_code` (`ca_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of cash_advances
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for chart_of_accounts
-- ----------------------------
DROP TABLE IF EXISTS `chart_of_accounts`;
CREATE TABLE `chart_of_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_type` enum('asset','liability','equity','revenue','expense') COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_account_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `normal_balance` enum('debit','credit') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_code` (`account_code`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of chart_of_accounts
-- ----------------------------
BEGIN;
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (1, '1000', 'Aset', 'asset', NULL, 'debit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (2, '1100', 'Aset Lancar', 'asset', NULL, 'debit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (3, '1110', 'Kas', 'asset', NULL, 'debit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (4, '1120', 'Bank', 'asset', NULL, 'debit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (5, '1130', 'Piutang Usaha', 'asset', NULL, 'debit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (6, '1200', 'Aset Tetap', 'asset', NULL, 'debit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (7, '1210', 'Peralatan', 'asset', NULL, 'debit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (8, '2000', 'Kewajiban', 'liability', NULL, 'credit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (9, '2100', 'Kewajiban Lancar', 'liability', NULL, 'credit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (10, '2110', 'Hutang Usaha', 'liability', NULL, 'credit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (11, '3000', 'Ekuitas', 'equity', NULL, 'credit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (12, '3100', 'Modal', 'equity', NULL, 'credit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (13, '3200', 'Laba Ditahan', 'equity', NULL, 'credit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (14, '4000', 'Pendapatan', 'revenue', NULL, 'credit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (15, '4100', 'Pendapatan Penjualan', 'revenue', NULL, 'credit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (16, '5000', 'Beban', 'expense', NULL, 'debit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (17, '5100', 'Beban Operasional', 'expense', NULL, 'debit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (18, '5110', 'Beban Gaji', 'expense', NULL, 'debit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (19, '5120', 'Beban Sewa', 'expense', NULL, 'debit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (20, '5130', 'Beban Transportasi', 'expense', NULL, 'debit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (21, '5140', 'Beban Akomodasi', 'expense', NULL, 'debit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (22, '5150', 'Beban Makanan', 'expense', NULL, 'debit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (23, '5160', 'Beban Entertainment', 'expense', NULL, 'debit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
INSERT INTO `chart_of_accounts` (`id`, `account_code`, `account_name`, `account_type`, `parent_account_code`, `normal_balance`, `is_active`, `description`, `created_at`, `updated_at`) VALUES (24, '5170', 'Beban Perlengkapan Kantor', 'expense', NULL, 'debit', 1, NULL, '2025-10-29 16:34:36', '2025-10-29 16:34:36');
COMMIT;

-- ----------------------------
-- Table structure for companies
-- ----------------------------
DROP TABLE IF EXISTS `companies`;
CREATE TABLE `companies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `legal_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `industry` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Indonesia',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_code` (`company_code`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of companies
-- ----------------------------
BEGIN;
INSERT INTO `companies` (`id`, `company_code`, `name`, `legal_name`, `description`, `industry`, `address`, `city`, `state`, `postal_code`, `country`, `phone`, `email`, `website`, `tax_id`, `logo`, `status`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`, `is_active`) VALUES (1, 'COMP24VQ74', 'PT DIVA SINERGI ADIPRADANA', NULL, '', NULL, '', '', '', '', 'Indonesia', '0895327069923', 'daerobbi14@gmail.com', '', '43134141', NULL, 'active', 0, NULL, '2025-10-30 00:11:43', '2025-10-30 00:11:43', 1);
COMMIT;

-- ----------------------------
-- Table structure for customer_payments
-- ----------------------------
DROP TABLE IF EXISTS `customer_payments`;
CREATE TABLE `customer_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `so_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('transfer','cash','credit_card','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_proof` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','paid','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'paid',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_code` (`payment_code`),
  UNIQUE KEY `invoice_number` (`invoice_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of customer_payments
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for customers
-- ----------------------------
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_type` enum('individual','company') COLLATE utf8mb4_unicode_ci DEFAULT 'company',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_address` text COLLATE utf8mb4_unicode_ci,
  `shipping_address` text COLLATE utf8mb4_unicode_ci,
  `tax_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `credit_limit` decimal(15,2) DEFAULT '0.00',
  `payment_terms` int DEFAULT '30',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_code` (`customer_code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of customers
-- ----------------------------
BEGIN;
INSERT INTO `customers` (`id`, `customer_code`, `customer_name`, `customer_type`, `phone`, `email`, `billing_address`, `shipping_address`, `tax_id`, `credit_limit`, `payment_terms`, `status`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`) VALUES (1, 'CUST001', 'PT Customer Contoh', 'company', '021-123456', 'customer@example.com', NULL, NULL, NULL, 0.00, 30, 'active', 0, NULL, '2025-10-29 16:58:25', '2025-10-29 16:58:25');
COMMIT;

-- ----------------------------
-- Table structure for delivery_orders
-- ----------------------------
DROP TABLE IF EXISTS `delivery_orders`;
CREATE TABLE `delivery_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `do_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `so_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_order_codes` json DEFAULT NULL,
  `courier` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tracking_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_date` date DEFAULT NULL,
  `shipping_cost` decimal(15,2) DEFAULT '0.00',
  `shipping_proof` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('shipping','delivered') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'shipping',
  `proof_of_delivery` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `received_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `confirmation_method` enum('whatsapp','email','call','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `do_code` (`do_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of delivery_orders
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for financial_reports
-- ----------------------------
DROP TABLE IF EXISTS `financial_reports`;
CREATE TABLE `financial_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `report_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_type` enum('balance_sheet','income_statement','cash_flow','trial_balance') COLLATE utf8mb4_unicode_ci NOT NULL,
  `period_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `statement_data` json NOT NULL,
  `generated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `generated_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `report_code` (`report_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of financial_reports
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for journal_entries
-- ----------------------------
DROP TABLE IF EXISTS `journal_entries`;
CREATE TABLE `journal_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `journal_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `transaction_date` date NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_type` enum('sales_order','purchase_order','cash_advance','reimbursement','payment','receipt','adjustment') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `period_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_debit` decimal(15,2) NOT NULL,
  `total_credit` decimal(15,2) NOT NULL,
  `status` enum('draft','posted','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `posted_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `posted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `journal_code` (`journal_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of journal_entries
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for journal_items
-- ----------------------------
DROP TABLE IF EXISTS `journal_items`;
CREATE TABLE `journal_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `journal_item_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `journal_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `debit_amount` decimal(15,2) DEFAULT '0.00',
  `credit_amount` decimal(15,2) DEFAULT '0.00',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `journal_item_code` (`journal_item_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of journal_items
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for numbering_sequences
-- ----------------------------
DROP TABLE IF EXISTS `numbering_sequences`;
CREATE TABLE `numbering_sequences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sequence_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prefix` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `next_number` int DEFAULT '1',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sequence_code` (`sequence_code`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of numbering_sequences
-- ----------------------------
BEGIN;
INSERT INTO `numbering_sequences` (`id`, `sequence_code`, `prefix`, `next_number`, `description`, `created_at`, `updated_at`) VALUES (1, 'SO', 'SO', 1001, 'Sales Order', '2025-10-29 16:58:25', '2025-10-29 16:58:25');
INSERT INTO `numbering_sequences` (`id`, `sequence_code`, `prefix`, `next_number`, `description`, `created_at`, `updated_at`) VALUES (2, 'PO', 'PO', 1001, 'Purchase Order', '2025-10-29 16:58:25', '2025-10-29 16:58:25');
INSERT INTO `numbering_sequences` (`id`, `sequence_code`, `prefix`, `next_number`, `description`, `created_at`, `updated_at`) VALUES (3, 'INV', 'INV', 1001, 'Invoice', '2025-10-29 16:58:25', '2025-10-29 16:58:25');
INSERT INTO `numbering_sequences` (`id`, `sequence_code`, `prefix`, `next_number`, `description`, `created_at`, `updated_at`) VALUES (4, 'PAY', 'PAY', 1001, 'Payment', '2025-10-29 16:58:25', '2025-10-29 16:58:25');
INSERT INTO `numbering_sequences` (`id`, `sequence_code`, `prefix`, `next_number`, `description`, `created_at`, `updated_at`) VALUES (5, 'CA', 'CA', 1001, 'Cash Advance', '2025-10-29 16:58:25', '2025-10-29 16:58:25');
INSERT INTO `numbering_sequences` (`id`, `sequence_code`, `prefix`, `next_number`, `description`, `created_at`, `updated_at`) VALUES (6, 'REIMB', 'REIMB', 1001, 'Reimbursement', '2025-10-29 16:58:25', '2025-10-29 16:58:25');
INSERT INTO `numbering_sequences` (`id`, `sequence_code`, `prefix`, `next_number`, `description`, `created_at`, `updated_at`) VALUES (7, 'AR', 'AR', 1001, 'Accounts Receivable', '2025-10-29 16:58:25', '2025-10-29 16:58:25');
INSERT INTO `numbering_sequences` (`id`, `sequence_code`, `prefix`, `next_number`, `description`, `created_at`, `updated_at`) VALUES (8, 'AP', 'AP', 1001, 'Accounts Payable', '2025-10-29 16:58:25', '2025-10-29 16:58:25');
INSERT INTO `numbering_sequences` (`id`, `sequence_code`, `prefix`, `next_number`, `description`, `created_at`, `updated_at`) VALUES (9, 'JNL', 'JNL', 1001, 'Journal Entry', '2025-10-29 16:58:25', '2025-10-29 16:58:25');
COMMIT;

-- ----------------------------
-- Table structure for permissions
-- ----------------------------
DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `permission_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `category` enum('transactions','cash_advance','reimburse','projects','settings','reports','delivery','accounting') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` enum('create','view','update','delete','approve','approve_spv','approve_finance','pay','reconcile','manage','post_journal','close_period') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permission_code` (`permission_code`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of permissions
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for products
-- ----------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_price` decimal(15,2) DEFAULT '0.00',
  `cost_price` decimal(15,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_code` (`product_code`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of products
-- ----------------------------
BEGIN;
INSERT INTO `products` (`id`, `product_code`, `product_name`, `description`, `category`, `unit_price`, `cost_price`, `is_active`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`) VALUES (1, 'PROD001', 'Product Contoh 1', NULL, NULL, 100000.00, 80000.00, 1, 0, NULL, '2025-10-29 16:58:25', '2025-10-29 16:58:25');
INSERT INTO `products` (`id`, `product_code`, `product_name`, `description`, `category`, `unit_price`, `cost_price`, `is_active`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`) VALUES (2, 'PROD002', 'Product Contoh 2', NULL, NULL, 150000.00, 120000.00, 1, 0, NULL, '2025-10-29 16:58:25', '2025-10-29 16:58:25');
COMMIT;

-- ----------------------------
-- Table structure for projects
-- ----------------------------
DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `client_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `budget` decimal(15,2) DEFAULT NULL,
  `status` enum('active','completed','on_hold','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_code` (`project_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of projects
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for purchase_order_attachments
-- ----------------------------
DROP TABLE IF EXISTS `purchase_order_attachments`;
CREATE TABLE `purchase_order_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_doc_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('invoice','proof') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'proof',
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_doc_code` (`payment_doc_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of purchase_order_attachments
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for purchase_order_items
-- ----------------------------
DROP TABLE IF EXISTS `purchase_order_items`;
CREATE TABLE `purchase_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `po_item_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `po_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_data` json DEFAULT NULL,
  `quantity` int NOT NULL,
  `supplier` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_price` decimal(15,2) NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `po_item_code` (`po_item_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of purchase_order_items
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for purchase_order_payments
-- ----------------------------
DROP TABLE IF EXISTS `purchase_order_payments`;
CREATE TABLE `purchase_order_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `po_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `po_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `so_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `so_reference` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('transfer','cash','credit_card','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','paid','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_code` (`payment_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of purchase_order_payments
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for purchase_orders
-- ----------------------------
DROP TABLE IF EXISTS `purchase_orders`;
CREATE TABLE `purchase_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `po_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_data` json DEFAULT NULL,
  `so_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_contact` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_bank` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `status` enum('submitted','approved_spv','approved_finance','paid','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'submitted',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `date` date DEFAULT (curdate()),
  `so_reference` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitted_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitted_date` date DEFAULT NULL,
  `submitted_time` time DEFAULT NULL,
  `priority` enum('low','medium','high') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `days_waiting` int DEFAULT '0',
  `customer_ref` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `do_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `do_status` enum('not_created','created','shipped','delivered') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'not_created',
  `delivery_date` date DEFAULT NULL,
  `is_split_po` tinyint(1) DEFAULT '0',
  `original_so_quantity` int DEFAULT NULL,
  `split_sequence` int DEFAULT NULL,
  `approval_level` enum('spv','finance') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'spv',
  `approved_by_spv` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by_finance` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_date_spv` date DEFAULT NULL,
  `approved_date_finance` date DEFAULT NULL,
  `approval_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rejection_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `payment_proof` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ap_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_invoice_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_invoice_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `journal_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accounting_status` enum('not_posted','posted','reconciled') COLLATE utf8mb4_unicode_ci DEFAULT 'not_posted',
  PRIMARY KEY (`id`),
  UNIQUE KEY `po_code` (`po_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of purchase_orders
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for recurring_entries
-- ----------------------------
DROP TABLE IF EXISTS `recurring_entries`;
CREATE TABLE `recurring_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entry_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `frequency` enum('monthly','quarterly','yearly') COLLATE utf8mb4_unicode_ci NOT NULL,
  `next_date` date NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `debit_account` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `credit_account` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `entry_code` (`entry_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of recurring_entries
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for reimbursement_categories
-- ----------------------------
DROP TABLE IF EXISTS `reimbursement_categories`;
CREATE TABLE `reimbursement_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_code` (`category_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Records of reimbursement_categories
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for reimbursement_items
-- ----------------------------
DROP TABLE IF EXISTS `reimbursement_items`;
CREATE TABLE `reimbursement_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_code` varchar(100) NOT NULL,
  `reimbursement_code` varchar(100) NOT NULL,
  `item_date` date NOT NULL,
  `description` text NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `attachment_path` varchar(500) DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_code` (`item_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Records of reimbursement_items
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for reimbursements
-- ----------------------------
DROP TABLE IF EXISTS `reimbursements`;
CREATE TABLE `reimbursements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reimbursement_code` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `notes` text,
  `submitted_by_user_name` varchar(255) NOT NULL,
  `created_by_user_code` varchar(50) NOT NULL,
  `created_by_user_name` varchar(255) NOT NULL,
  `category_code` varchar(50) NOT NULL,
  `project_code` varchar(50) DEFAULT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `status` enum('submitted','approved','rejected') DEFAULT 'submitted',
  `payment_proof_path` varchar(500) DEFAULT NULL,
  `submitted_date` date DEFAULT NULL,
  `submitted_time` time DEFAULT NULL,
  `approved_by_user_code` varchar(50) DEFAULT NULL,
  `approved_by_user_name` varchar(255) DEFAULT NULL,
  `approved_date` timestamp NULL DEFAULT NULL,
  `bank_account_code` varchar(50) DEFAULT NULL,
  `rejection_reason` text,
  `is_deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `journal_code` varchar(50) DEFAULT NULL,
  `accounting_status` enum('not_posted','posted','reconciled') DEFAULT 'not_posted',
  PRIMARY KEY (`id`),
  UNIQUE KEY `reimbursement_code` (`reimbursement_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Records of reimbursements
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for role_permissions
-- ----------------------------
DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_permission_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permission_code` (`role_permission_code`),
  UNIQUE KEY `unique_role_permission` (`role_code`,`permission_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of role_permissions
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for roles
-- ----------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_system_role` tinyint(1) DEFAULT '0',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_code` (`role_code`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of roles
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for sales_order_attachments
-- ----------------------------
DROP TABLE IF EXISTS `sales_order_attachments`;
CREATE TABLE `sales_order_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `attachment_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `so_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attachment_code` (`attachment_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of sales_order_attachments
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for sales_order_items
-- ----------------------------
DROP TABLE IF EXISTS `sales_order_items`;
CREATE TABLE `sales_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `so_item_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `so_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_data` json DEFAULT NULL,
  `quantity` int DEFAULT '0',
  `unit_price` decimal(15,2) NOT NULL,
  `subtotal` decimal(15,2) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `so_item_code` (`so_item_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of sales_order_items
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for sales_order_taxes
-- ----------------------------
DROP TABLE IF EXISTS `sales_order_taxes`;
CREATE TABLE `sales_order_taxes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `so_tax_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `so_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tax_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tax_rate` decimal(10,2) NOT NULL,
  `tax_amount` decimal(15,2) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `so_tax_code` (`so_tax_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of sales_order_taxes
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for sales_orders
-- ----------------------------
DROP TABLE IF EXISTS `sales_orders`;
CREATE TABLE `sales_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `so_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_data` json DEFAULT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `shipping_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `sales_rep` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sales_rep_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sales_order_doc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  `shipping_cost` decimal(15,2) DEFAULT '0.00',
  `status` enum('submitted','processing','shipped','delivered','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'submitted',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ar_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `journal_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accounting_status` enum('not_posted','posted','reconciled') COLLATE utf8mb4_unicode_ci DEFAULT 'not_posted',
  PRIMARY KEY (`id`),
  UNIQUE KEY `so_code` (`so_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of sales_orders
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for suppliers
-- ----------------------------
DROP TABLE IF EXISTS `suppliers`;
CREATE TABLE `suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `supplier_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_person` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `tax_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_terms` int DEFAULT '30',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_code` (`supplier_code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of suppliers
-- ----------------------------
BEGIN;
INSERT INTO `suppliers` (`id`, `supplier_code`, `supplier_name`, `contact_person`, `phone`, `email`, `address`, `tax_id`, `bank_name`, `account_number`, `payment_terms`, `status`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`) VALUES (1, 'SUPP001', 'PT Supplier Contoh', NULL, '021-654321', 'supplier@example.com', NULL, NULL, NULL, NULL, 30, 'active', 0, NULL, '2025-10-29 16:58:25', '2025-10-29 16:58:25');
COMMIT;

-- ----------------------------
-- Table structure for tax_types
-- ----------------------------
DROP TABLE IF EXISTS `tax_types`;
CREATE TABLE `tax_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tax_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `tax_rate` decimal(5,2) NOT NULL,
  `tax_type` enum('vat','pph','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_code` (`tax_code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of tax_types
-- ----------------------------
BEGIN;
INSERT INTO `tax_types` (`id`, `tax_code`, `name`, `description`, `tax_rate`, `tax_type`, `is_active`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`) VALUES (1, 'PPN', 'PPN 11%', 'Pajak Pertambahan Nilai', 11.00, 'vat', 1, 0, NULL, '2025-10-29 16:59:27', '2025-10-29 16:59:27');
INSERT INTO `tax_types` (`id`, `tax_code`, `name`, `description`, `tax_rate`, `tax_type`, `is_active`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`) VALUES (2, 'PPH23', 'PPh 23%', 'Pajak Penghasilan Pasal 23', 23.00, 'pph', 1, 0, NULL, '2025-10-29 16:59:27', '2025-10-29 16:59:27');
INSERT INTO `tax_types` (`id`, `tax_code`, `name`, `description`, `tax_rate`, `tax_type`, `is_active`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`) VALUES (3, 'PPH4', 'PPh 4(2)%', 'Pajak Penghasilan Pasal 4 ayat 2', 4.00, 'pph', 1, 0, NULL, '2025-10-29 16:59:27', '2025-10-29 16:59:27');
INSERT INTO `tax_types` (`id`, `tax_code`, `name`, `description`, `tax_rate`, `tax_type`, `is_active`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`) VALUES (4, 'TAX001', 'TAX001', '', 11.00, 'other', 1, 0, NULL, '2025-10-29 23:50:32', '2025-10-29 23:50:32');
COMMIT;

-- ----------------------------
-- Table structure for trial_balance
-- ----------------------------
DROP TABLE IF EXISTS `trial_balance`;
CREATE TABLE `trial_balance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `period_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `opening_debit` decimal(15,2) DEFAULT '0.00',
  `opening_credit` decimal(15,2) DEFAULT '0.00',
  `transaction_debit` decimal(15,2) DEFAULT '0.00',
  `transaction_credit` decimal(15,2) DEFAULT '0.00',
  `closing_debit` decimal(15,2) DEFAULT '0.00',
  `closing_credit` decimal(15,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_account_period` (`period_code`,`account_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of trial_balance
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for user_roles
-- ----------------------------
DROP TABLE IF EXISTS `user_roles`;
CREATE TABLE `user_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_role_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_role_code` (`user_role_code`),
  UNIQUE KEY `unique_user_role` (`user_code`,`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of user_roles
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `last_login` timestamp NULL DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_code` (`user_code`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of users
-- ----------------------------
BEGIN;
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;