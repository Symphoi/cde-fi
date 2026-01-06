// app/invoice-payment/page.tsx - VERSI FINAL
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Search,
  FileText,
  Download,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Printer,
  Send,
  Eye,
  RefreshCw,
  AlertCircle,
  Mail,
  DollarSign,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ============================ JWT API SERVICE ============================
class InvoiceService {
  private static getAuthHeaders() {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No authentication token found");
    }
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  private static async handleResponse(response: Response) {
    const text = await response.text();

    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      console.error("Invalid JSON response:", text);
      throw new Error(
        `Invalid response from server: ${text.substring(0, 100)}`
      );
    }

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  // Get sales orders ready for invoice
  static async getReadySalesOrders(search = "", page = 1, limit = 10) {
    try {
      const params = new URLSearchParams({
        type: "ready",
        search: search,
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/invoice-payment?${params}`, {
        headers: this.getAuthHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Service error in getReadySalesOrders:", error);
      throw error;
    }
  }

  // Get invoice drafts
  static async getInvoiceDrafts(search = "", page = 1, limit = 10) {
    try {
      const params = new URLSearchParams({
        type: "drafts",
        search: search,
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/invoice-payment?${params}`, {
        headers: this.getAuthHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Service error in getInvoiceDrafts:", error);
      throw error;
    }
  }

  // Create invoice
  static async createInvoice(data: {
    so_code: string;
    invoice_date: string;
    due_date: string;
    notes?: string;
    terms?: string;
  }) {
    try {
      const response = await fetch("/api/invoice-payment", {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: "create",
          ...data,
        }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Service error in createInvoice:", error);
      throw error;
    }
  }

  // Generate PDF
  static async generatePDF(
    invoiceId: string,
    action: "preview" | "download" | "email"
  ) {
    try {
      const response = await fetch("/api/invoice-payment", {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: "generate",
          invoice_id: invoiceId,
          type: action,
        }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Service error in generatePDF:", error);
      throw error;
    }
  }

  // Send email
  static async sendEmail(invoiceId: string, emailData: any) {
    try {
      const response = await fetch("/api/invoice-payment", {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: "send",
          invoice_id: invoiceId,
          email_data: emailData,
        }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Service error in sendEmail:", error);
      throw error;
    }
  }

  // Mark as paid
  static async markAsPaid(invoiceId: string, paymentData: any) {
    try {
      const response = await fetch("/api/invoice-payment", {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: "pay",
          invoice_id: invoiceId,
          payment_data: paymentData,
        }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Service error in markAsPaid:", error);
      throw error;
    }
  }

  // Delete invoice
  static async deleteInvoice(invoiceId: string) {
    try {
      const response = await fetch("/api/invoice-payment", {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: "delete",
          invoice_id: invoiceId,
        }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Service error in deleteInvoice:", error);
      throw error;
    }
  }
}

// ============================ TYPES ============================
interface SalesOrder {
  id: string;
  so_code: string;
  date: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  company_name?: string;
  billing_address: string;
  shipping_address: string;
  total_amount: number;
  tax_amount: number;
  shipping_cost: number;
  discount_amount: number;
  grand_total: number;
  status: string;
  items: OrderItem[];
  invoice_number?: string;
  po_count?: number;
  do_count?: number;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  description?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  so_code: string;
  invoice_date: string;
  due_date: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  shipping_cost: number;
  grand_total: number;
  notes?: string;
  terms?: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  company_name?: string;
}

// ============================ MAIN COMPONENT ============================
export default function InvoiceModulePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [soData, setSoData] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"so" | "invoices">("so");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "",
    message: "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    notes: "",
    terms: "Payment due within 7 days from invoice date.",
  });

  // ============================ DATA FETCHING ============================
  useEffect(() => {
    fetchData();
  }, [activeTab, currentPage, searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === "so") {
        const response = await InvoiceService.getReadySalesOrders(
          searchTerm,
          currentPage,
          itemsPerPage
        );
        if (response.success) {
          setSoData(response.data);
          setTotalPages(response.pagination?.totalPages || 1);
          setTotalItems(response.pagination?.total || 0);
        }
      } else {
        const response = await InvoiceService.getInvoiceDrafts(
          searchTerm,
          currentPage,
          itemsPerPage
        );
        if (response.success) {
          setInvoices(response.data);
          setTotalPages(response.pagination?.totalPages || 1);
          setTotalItems(response.pagination?.total || 0);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
      toast.error(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // ============================ HANDLERS ============================
  const handleCreateInvoice = async () => {
    if (!selectedSO) return;

    try {
      setLoading(true);

      const result = await InvoiceService.createInvoice({
        so_code: selectedSO.so_code,
        invoice_date: invoiceForm.invoice_date,
        due_date: invoiceForm.due_date,
        notes: invoiceForm.notes,
        terms: invoiceForm.terms,
      });

      if (result.success) {
        toast.success(`Invoice created: ${result.data.invoice_number}`);
        setShowInvoiceForm(false);
        setSelectedSO(null);
        setActiveTab("invoices");
        setCurrentPage(1); // Reset ke halaman pertama
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async (
    invoice: Invoice,
    action: "preview" | "download" | "email"
  ) => {
    try {
      setLoading(true);

      const result = await InvoiceService.generatePDF(invoice.id, action);

      if (result.success) {
        if (action === "download") {
          // Download PDF
          const byteCharacters = atob(result.data.pdf_base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "application/pdf" });

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${invoice.invoice_number}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          toast.success("PDF downloaded successfully!");
        } else if (action === "preview") {
          // Preview PDF
          const printWindow = window.open("", "_blank");
          if (printWindow) {
            printWindow.document.write(`
              <html>
                <head>
                  <title>${invoice.invoice_number}</title>
                  <style>
                    body { margin: 0; padding: 0; }
                    iframe { width: 100%; height: 100vh; border: none; }
                  </style>
                </head>
                <body>
                  <iframe src="data:application/pdf;base64,${result.data.pdf_base64}"></iframe>
                </body>
              </html>
            `);
            printWindow.document.close();
          }
        } else if (action === "email") {
          // Open email dialog
          setSelectedInvoice(invoice);
          setEmailData({
            to: invoice.customer_email,
            subject: `Invoice ${invoice.invoice_number} - ${
              invoice.company_name || invoice.customer_name
            }`,
            message: `Dear ${
              invoice.customer_name
            },\n\nPlease find attached your invoice ${
              invoice.invoice_number
            }.\n\nInvoice Details:\n- Invoice Number: ${
              invoice.invoice_number
            }\n- Invoice Date: ${formatDate(
              invoice.invoice_date
            )}\n- Due Date: ${formatDate(
              invoice.due_date
            )}\n- Total Amount: Rp ${formatCurrency(
              invoice.grand_total
            )}\n\nPayment Terms: ${
              invoice.terms || "Payment due within 7 days."
            }\n\nPlease let us know if you have any questions.\n\nBest regards,\nFinance Department`,
          });
          setShowEmailDialog(true);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedInvoice) return;

    try {
      setLoading(true);

      const result = await InvoiceService.sendEmail(
        selectedInvoice.id,
        emailData
      );

      if (result.success) {
        toast.success("Email sent successfully!");
        setShowEmailDialog(false);
        fetchData(); // Refresh data untuk update status
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    if (!confirm("Mark this invoice as paid?")) return;

    try {
      const paymentDate = prompt(
        "Payment date (YYYY-MM-DD):",
        new Date().toISOString().split("T")[0]
      );
      const paymentMethod = prompt(
        "Payment method (Transfer/Cash/Card):",
        "Transfer"
      );
      const reference = prompt(
        "Payment reference:",
        `PAY-${invoice.invoice_number}`
      );

      if (!paymentDate || !paymentMethod || !reference) return;

      const result = await InvoiceService.markAsPaid(invoice.id, {
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: reference,
        notes: "Marked as paid via system",
      });

      if (result.success) {
        toast.success("Invoice marked as paid!");
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to mark as paid");
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      const result = await InvoiceService.deleteInvoice(invoiceId);

      if (result.success) {
        toast.success("Invoice deleted!");
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete invoice");
    }
  };

  // ============================ HELPER FUNCTIONS ============================
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
      delivered: "bg-green-100 text-green-800",
      completed: "bg-purple-100 text-purple-800",
    };
    return colors[status] || colors.draft;
  };

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  const generateInvoiceNumber = (soCode: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `INV/${soCode}/${year}/${month}/${random}`;
  };

  // ============================ PAGINATION COMPONENT ============================
  const Pagination = () => (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-gray-600">
        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to{" "}
        {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
        results
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="px-3 py-1 text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );

  // ============================ RENDER ============================
  if (loading && soData.length === 0 && invoices.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Invoice Module</h1>
        <p className="text-gray-600 mt-2">
          Create and manage invoices with flexible dating
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <div className="font-medium text-red-800">Error</div>
            <div className="text-red-600 text-sm">{error}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setError(null)}
            className="ml-auto"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "so"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => {
            setActiveTab("so");
            setCurrentPage(1);
            setSearchTerm("");
          }}
        >
          Sales Orders ({totalItems})
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "invoices"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => {
            setActiveTab("invoices");
            setCurrentPage(1);
            setSearchTerm("");
          }}
        >
          Invoices ({totalItems})
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={`Search ${
              activeTab === "so" ? "sales orders" : "invoices"
            }...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Sales Orders Tab */}
      {activeTab === "so" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sales Orders Ready for Invoice
              </div>
              <Button
                onClick={fetchData}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {soData.map((so) => (
                    <TableRow key={so.id}>
                      <TableCell className="font-semibold">
                        {so.so_code}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{so.customer_name}</div>
                          <div className="text-sm text-gray-500">
                            {so.customer_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(so.date)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(so.grand_total)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(so.status)}>
                          {so.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => {
                            setSelectedSO(so);
                            setInvoiceForm({
                              invoice_date: new Date()
                                .toISOString()
                                .split("T")[0],
                              due_date: new Date(
                                Date.now() + 7 * 24 * 60 * 60 * 1000
                              )
                                .toISOString()
                                .split("T")[0],
                              notes: "",
                              terms:
                                "Payment due within 7 days from invoice date.",
                            });
                            setShowInvoiceForm(true);
                          }}
                          size="sm"
                          disabled={!!so.invoice_number} // PERBAIKAN: !! untuk konversi ke boolean
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {so.invoice_number
                            ? "Already Invoiced"
                            : "Create Invoice"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {soData.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No sales orders ready for invoice
              </div>
            )}
            {soData.length > 0 && <Pagination />}
          </CardContent>
        </Card>
      )}

      {/* Invoices Tab */}
      {activeTab === "invoices" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice List
              </div>
              <Button
                onClick={fetchData}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          {invoice.invoice_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {invoice.customer_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {invoice.customer_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(invoice.invoice_date)}
                        <div className="text-xs text-gray-500">
                          {new Date(invoice.invoice_date) > new Date()
                            ? "Future dated"
                            : new Date(invoice.invoice_date) <
                              new Date(invoice.created_at)
                            ? "Back dated"
                            : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(invoice.due_date)}
                        <div
                          className={`text-xs ${
                            new Date(invoice.due_date) < new Date() &&
                            invoice.status !== "paid"
                              ? "text-red-600"
                              : "text-gray-500"
                          }`}
                        >
                          {new Date(invoice.due_date) < new Date() &&
                          invoice.status !== "paid"
                            ? "Overdue"
                            : ""}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(invoice.grand_total)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            onClick={() =>
                              handleGeneratePDF(invoice, "preview")
                            }
                            size="sm"
                            variant="ghost"
                            title="Preview"
                            disabled={loading}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() =>
                              handleGeneratePDF(invoice, "download")
                            }
                            size="sm"
                            variant="ghost"
                            title="Download"
                            disabled={loading}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleGeneratePDF(invoice, "email")}
                            size="sm"
                            variant="ghost"
                            title="Send Email"
                            disabled={
                              invoice.status === "sent" ||
                              invoice.status === "paid" ||
                              loading
                            }
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          {invoice.status === "sent" && (
                            <Button
                              onClick={() => handleMarkAsPaid(invoice)}
                              size="sm"
                              variant="ghost"
                              title="Mark as Paid"
                              className="text-green-600"
                              disabled={loading}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {invoice.status === "draft" && (
                            <Button
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              size="sm"
                              variant="ghost"
                              title="Delete"
                              className="text-red-600"
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {invoices.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No invoices found
              </div>
            )}
            {invoices.length > 0 && <Pagination />}
          </CardContent>
        </Card>
      )}

      {/* Create Invoice Dialog */}
      {showInvoiceForm && selectedSO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Create Invoice - {selectedSO.so_code}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInvoiceForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Invoice Header */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Invoice Date *</Label>
                    <Input
                      type="date"
                      value={invoiceForm.invoice_date}
                      onChange={(e) =>
                        setInvoiceForm((prev) => ({
                          ...prev,
                          invoice_date: e.target.value,
                        }))
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Can be backdated or forward dated
                    </p>
                  </div>
                  <div>
                    <Label>Due Date *</Label>
                    <Input
                      type="date"
                      value={invoiceForm.due_date}
                      onChange={(e) =>
                        setInvoiceForm((prev) => ({
                          ...prev,
                          due_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="bg-blue-50 p-4 rounded">
                    <Label>Invoice Number</Label>
                    <div className="font-mono font-bold text-lg">
                      {generateInvoiceNumber(selectedSO.so_code)}
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold mb-2">Bill To:</h3>
                  <p className="font-medium">{selectedSO.customer_name}</p>
                  {selectedSO.company_name && <p>{selectedSO.company_name}</p>}
                  <p className="text-sm">{selectedSO.customer_email}</p>
                  <p className="text-sm">{selectedSO.customer_phone}</p>
                  <p className="text-sm mt-2 whitespace-pre-line">
                    {selectedSO.billing_address}
                  </p>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold mb-3">Order Items</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSO.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {item.product_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {item.product_code}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              {formatCurrency(item.unit_price)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.subtotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-blue-50 p-4 rounded">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold">
                        {formatCurrency(selectedSO.total_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>+ {formatCurrency(selectedSO.tax_amount)}</span>
                    </div>
                    {selectedSO.discount_amount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount:</span>
                        <span>
                          - {formatCurrency(selectedSO.discount_amount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span>+ {formatCurrency(selectedSO.shipping_cost)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold text-lg">Grand Total:</span>
                      <span className="font-bold text-lg text-blue-600">
                        {formatCurrency(selectedSO.grand_total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes & Terms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={invoiceForm.notes}
                      onChange={(e) =>
                        setInvoiceForm((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Payment Terms</Label>
                    <Textarea
                      value={invoiceForm.terms}
                      onChange={(e) =>
                        setInvoiceForm((prev) => ({
                          ...prev,
                          terms: e.target.value,
                        }))
                      }
                      placeholder="Payment terms..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowInvoiceForm(false)}
                    variant="outline"
                    className="flex-1"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateInvoice}
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Create Invoice
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Invoice via Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>To *</Label>
              <Input
                value={emailData.to}
                onChange={(e) =>
                  setEmailData((prev) => ({ ...prev, to: e.target.value }))
                }
                type="email"
                disabled={loading}
              />
            </div>
            <div>
              <Label>Subject *</Label>
              <Input
                value={emailData.subject}
                onChange={(e) =>
                  setEmailData((prev) => ({ ...prev, subject: e.target.value }))
                }
                disabled={loading}
              />
            </div>
            <div>
              <Label>Message *</Label>
              <Textarea
                value={emailData.message}
                onChange={(e) =>
                  setEmailData((prev) => ({ ...prev, message: e.target.value }))
                }
                rows={6}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEmailDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={loading}>
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
