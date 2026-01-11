"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomDialogContent } from "@/components/custom-dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Plus,
  FileText,
  Eye,
  Upload,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  Building,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  Package,
  Filter,
  Calculator,
  DollarSign,
  Percent,
  Package2,
  MapPin,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// Type definitions
interface Customer {
  customer_code: string;
  customer_name: string;
  customer_type: "individual" | "company" | "government";
  phone: string;
  email: string;
  billing_address?: string;
  shipping_address?: string;
  tax_id?: string;
}

interface Product {
  product_code: string;
  product_name: string;
  description?: string;
  unit_price?: number;
}

interface SalesOrder {
  so_code: string;
  customer_code?: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_type?: "individual" | "company" | "government";
  billing_address?: string;
  shipping_address?: string;
  sales_rep?: string;
  sales_rep_email?: string;
  sales_order_doc?: string;
  project_code?: string;
  total_amount: number;
  tax_amount: number;
  shipping_cost: number;
  status: string;
  notes?: string;
  ar_code?: string;
  invoice_number?: string;
  tax_configuration?: "excluded" | "included";
  items: SalesOrderItem[];
  taxes: SalesOrderTax[];
  attachments: Attachment[];
  created_at: string;
}

interface SalesOrderItem {
  so_item_code: string;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface SalesOrderTax {
  so_tax_code: string;
  tax_name: string;
  tax_rate: number;
  tax_amount: number;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  upload_date: string;
  size: number;
}

interface Project {
  project_code: string;
  name: string;
  company_name?: string;
}

interface TaxType {
  id: number;
  tax_code: string;
  name: string;
  description?: string;
  tax_rate: number;
  tax_type: string;
  is_active: boolean;
}

interface User {
  user_code: string;
  name: string;
  email: string;
  department?: string;
  position?: string;
  status: string;
}

interface CreateSalesOrderRequest {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_code?: string;
  sales_rep_code?: string;
  customer_type?: "individual" | "company" | "government";
  billing_address?: string;
  shipping_address?: string;
  sales_rep?: string;
  sales_rep_email?: string;
  sales_order_doc?: string;
  project_code?: string;
  total_amount: number;
  tax_amount: number;
  shipping_cost: number;
  notes?: string;
  tax_configuration: "excluded" | "included";
  items: {
    product_name: string;
    product_code: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
  taxes: {
    tax_code: string;
    tax_name: string;
    tax_rate: number;
    tax_amount: number;
  }[];
}

// Format Rupiah function
const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function SalesOrderPage() {
  // Refs
  const salesOrderFileRef = useRef<HTMLInputElement>(null);
  const otherFilesRef = useRef<HTMLInputElement>(null);

  // State untuk UI
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // State untuk data
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // State untuk filter
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // State untuk form SO baru
  const [newSO, setNewSO] = useState<CreateSalesOrderRequest>({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_code: "",
    customer_type: "company",
    sales_rep_code: "",
    billing_address: "",
    shipping_address: "",
    sales_rep: "",
    sales_rep_email: "",
    sales_order_doc: "",
    project_code: "",
    total_amount: 0,
    tax_amount: 0,
    shipping_cost: 0,
    notes: "",
    tax_configuration: "included",
    items: [],
    taxes: [],
  });

  // State untuk tax configuration
  const [taxConfig, setTaxConfig] = useState<"included" | "excluded">("included");

  // State untuk items
  const [itemForms, setItemForms] = useState([
    {
      id: "1",
      product_name: "",
      product_code: "",
      quantity: 1,
      unit_price: 0,
      subtotal: 0,
    },
  ]);

  // State untuk master data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);

  // State untuk selected taxes
  const [selectedTaxIds, setSelectedTaxIds] = useState<number[]>([]);

  // State untuk summary values
  const [summary, setSummary] = useState({
    subtotal: 0,
    taxAmount: 0,
    grandTotal: 0,
    taxDetails: [] as { name: string; rate: number; amount: number }[],
  });

  // State untuk loading
  const [loadingTaxTypes, setLoadingTaxTypes] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // State untuk file names
  const [salesOrderFileName, setSalesOrderFileName] = useState("");
  const [otherFileNames, setOtherFileNames] = useState<string[]>([]);

  // ===============================
  // 🧮 FUNGSI PERHITUNGAN PAJAK
  // ===============================

  // Fungsi untuk menghitung semua nilai
  const calculateAllValues = () => {
    // 1. Hitung subtotal dari items
    const subtotal = itemForms.reduce((sum, form) => {
      const formSubtotal = form.quantity * form.unit_price;
      return sum + (isNaN(formSubtotal) ? 0 : formSubtotal);
    }, 0);

    // 2. Hitung detail pajak yang dipilih
    const taxDetails = selectedTaxIds.map(taxId => {
      const taxType = taxTypes.find(t => t.id === taxId);
      if (taxType) {
        const taxAmount = (taxType.tax_rate * subtotal) / 100;
        return {
          name: taxType.name,
          rate: taxType.tax_rate,
          amount: taxAmount
        };
      }
      return { name: "", rate: 0, amount: 0 };
    }).filter(tax => tax.name); // Hapus yang kosong

    // 3. Hitung total tax amount
    const taxAmount = taxDetails.reduce((sum, tax) => sum + tax.amount, 0);

    // 4. Hitung grand total
    const grandTotal = taxConfig === 'excluded' 
      ? subtotal + taxAmount 
      : subtotal; // Tax sudah termasuk

    return { subtotal, taxAmount, grandTotal, taxDetails };
  };

  // Fungsi untuk update semua perhitungan
  const updateAllCalculations = () => {
    const calculations = calculateAllValues();
    
    // Update summary state
    setSummary(calculations);

    // Update subtotal untuk item forms
    const updatedItemForms = itemForms.map(form => ({
      ...form,
      subtotal: form.quantity * form.unit_price
    }));
    
    if (JSON.stringify(updatedItemForms) !== JSON.stringify(itemForms)) {
      setItemForms(updatedItemForms);
    }

    // Update newSO dengan hasil kalkulasi
    const updatedTaxes = selectedTaxIds.map(taxId => {
      const taxType = taxTypes.find(t => t.id === taxId);
      const taxAmount = taxType ? (taxType.tax_rate * calculations.subtotal) / 100 : 0;
      return {
        tax_code: taxType?.tax_code || "",
        tax_name: taxType?.name || "",
        tax_rate: taxType?.tax_rate || 0,
        tax_amount: taxAmount
      };
    });

    setNewSO(prev => ({
      ...prev,
      total_amount: calculations.grandTotal,
      tax_amount: calculations.taxAmount,
      tax_configuration: taxConfig,
      items: updatedItemForms.map(form => ({
        product_name: form.product_name,
        product_code: form.product_code,
        quantity: form.quantity,
        unit_price: form.unit_price,
        subtotal: form.subtotal
      })),
      taxes: updatedTaxes
    }));
  };

  // Effect untuk auto-update semua perhitungan
  useEffect(() => {
    updateAllCalculations();
  }, [itemForms, selectedTaxIds, taxConfig, taxTypes]);

  // ===============================
  // 📞 API CALLS
  // ===============================


  const downloadAttachment = async (attachment: Attachment) => {
    try {
      window.open(`/api/attachments/${attachment.id}`, "_blank");
    } catch (error) {
      toast.error("Failed to download file");
    }
  };
  // Fetch tax types
  const fetchTaxTypes = async () => {
    try {
      setLoadingTaxTypes(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/sales-orders?action=get-tax-types", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTaxTypes(data.data);
          // Auto-select aktif taxes
          const activeTaxIds = data.data
            .filter((tax: TaxType) => tax.is_active)
            .map((tax: TaxType) => tax.id);
          setSelectedTaxIds(activeTaxIds);
        }
      }
    } catch (error) {
      console.error("Error fetching tax types:", error);
      toast.error("❌ Gagal memuat jenis pajak");
    } finally {
      setLoadingTaxTypes(false);
    }
  };

  // Fetch sales orders
  const fetchSalesOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Silakan login terlebih dahulu");
        window.location.href = "/login";
        return;
      }

      let url = `/api/sales-orders?page=${currentPage}&limit=${itemsPerPage}`;
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        toast.error("Sesi telah berakhir, silakan login kembali");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) throw new Error("Failed to fetch sales orders");

      const data = await response.json();
      if (data.success) {
        setSalesOrders(data.data);
      } else {
        throw new Error("Failed to load sales orders");
      }
    } catch (error) {
      console.error("Error fetching sales orders:", error);
      toast.error("❌ Gagal memuat sales orders");
    } finally {
      setLoading(false);
    }
  };

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/customers", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) setCustomers(data.data);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/products", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) setProducts(data.data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/projects", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) setProjects(data.data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/sales-orders?action=get-users", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) setUsers(data.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("❌ Gagal memuat pengguna");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSalesOrders();
    fetchCustomers();
    fetchProducts();
    fetchProjects();
    fetchTaxTypes();
    fetchUsers();
  }, [currentPage, itemsPerPage, statusFilter, searchTerm]);

  // ===============================
  // 🎛️ HANDLERS
  // ===============================

  // Update item form dengan auto-update
  const updateItemForm = (
    id: string,
    field: keyof (typeof itemForms)[0],
    value: string | number
  ) => {
    setItemForms((prev) =>
      prev.map((form) => {
        if (form.id === id) {
          const updatedForm = { ...form, [field]: value };
          if (field === "quantity" || field === "unit_price") {
            updatedForm.subtotal = Number(updatedForm.quantity) * Number(updatedForm.unit_price);
          }
          return updatedForm;
        }
        return form;
      })
    );
  };

  // Add/remove item form dengan auto-update
  const addItemForm = () => {
    const newId = (itemForms.length + 1).toString();
    setItemForms((prev) => [
      ...prev,
      {
        id: newId,
        product_name: "",
        product_code: "",
        quantity: 1,
        unit_price: 0,
        subtotal: 0,
      },
    ]);
  };

  const removeItemForm = (id: string) => {
    if (itemForms.length > 1) {
      setItemForms((prev) => prev.filter((form) => form.id !== id));
    }
  };

  // Tax selection handler dengan auto-update
  const toggleTaxSelection = (taxId: number) => {
    setSelectedTaxIds(prev => {
      if (prev.includes(taxId)) {
        return prev.filter(id => id !== taxId);
      } else {
        return [...prev, taxId];
      }
    });
  };

  // Handle tax configuration change
  const handleTaxConfigChange = (value: boolean) => {
    setTaxConfig(value ? "excluded" : "included");
  };

  // Handle customer selection
  const handleCustomerSelect = (customerCode: string) => {
    const customer = customers.find((c) => c.customer_code === customerCode);
    if (customer) {
      setNewSO((prev) => ({
        ...prev,
        customer_code: customer.customer_code,
        customer_name: customer.customer_name,
        customer_phone: customer.phone,
        customer_email: customer.email,
        customer_type: customer.customer_type,
        billing_address: customer.billing_address || "",
        shipping_address: customer.shipping_address || "",
      }));
    }
  };

  // Handle product selection
  const handleProductSelect = (itemId: string, productCode: string) => {
    const product = products.find((p) => p.product_code === productCode);
    if (product) {
      updateItemForm(itemId, "product_name", product.product_name);
      updateItemForm(itemId, "product_code", product.product_code);
      if (product.unit_price && product.unit_price > 0) {
        updateItemForm(itemId, "unit_price", product.unit_price);
      }
    }
  };

  // Handle sales rep selection
  const handleSalesRepSelect = (userCode: string) => {
    const selectedUser = users.find((user) => user.user_code === userCode);
    if (selectedUser) {
      setNewSO((prev) => ({
        ...prev,
        sales_rep: selectedUser.name,
        sales_rep_email: selectedUser.email,
        sales_rep_code: selectedUser.user_code,
      }));
    }
  };

  // Handle shipping address change
  const handleShippingAddressChange = (value: string) => {
    setNewSO(prev => ({
      ...prev,
      shipping_address: value
    }));
  };

  // File handlers
  const handleFileUpload = (type: "sales_order" | "other") => {
    if (type === "sales_order") {
      salesOrderFileRef.current?.click();
    } else {
      otherFilesRef.current?.click();
    }
  };

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "sales_order" | "other"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (type === "sales_order") {
      setSalesOrderFileName(files[0].name);
    } else {
      const names = Array.from(files).map((file) => file.name);
      setOtherFileNames(names);
    }
  };

  // Form validation
  const validateForm = () => {
    const errors: string[] = [];

    if (!newSO.customer_name.trim()) errors.push("Nama customer wajib diisi");
    if (!newSO.customer_phone.trim()) errors.push("Nomor telepon customer wajib diisi");
    
    const validItems = itemForms.filter(
      (form) => form.product_name && form.product_code && form.quantity > 0 && form.unit_price > 0
    );

    if (validItems.length === 0) {
      errors.push("Minimal satu item produk wajib diisi");
    }

    if (!salesOrderFileName) {
      errors.push("Dokumen Sales Order wajib diupload");
    }

    return errors;
  };

  // Submit SO
  const submitSO = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
      return;
    }

    // Prepare items data
    const itemsData = itemForms
      .filter(
        (form) => form.product_name && form.product_code && form.quantity > 0 && form.unit_price > 0
      )
      .map((form) => ({
        product_name: form.product_name,
        product_code: form.product_code,
        quantity: form.quantity,
        unit_price: form.unit_price,
        subtotal: form.subtotal,
      }));

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Silakan login terlebih dahulu");
        window.location.href = "/login";
        return;
      }

      // Prepare form data
      const formData = new FormData();
      const requestData: CreateSalesOrderRequest = {
        ...newSO,
        project_code: newSO.project_code || undefined,
        items: itemsData,
        tax_amount: summary.taxAmount,
        shipping_cost: 0,
        total_amount: summary.grandTotal,
        tax_configuration: taxConfig,
      };

      formData.append("data", JSON.stringify(requestData));

      if (salesOrderFileRef.current?.files?.[0]) {
        formData.append("sales_order_doc", salesOrderFileRef.current.files[0]);
      }

      if (otherFilesRef.current?.files) {
        for (let file of otherFilesRef.current.files) {
          formData.append("other_docs", file);
        }
      }

      // Submit
      const response = await fetch("/api/sales-orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`Sales Order ${result.so_code} berhasil dibuat!`);

        // Reset form
        setNewSO({
          customer_name: "",
          customer_phone: "",
          customer_email: "",
          customer_code: "",
          customer_type: "company",
          billing_address: "",
          shipping_address: "",
          sales_rep: "",
          sales_rep_email: "",
          sales_order_doc: "",
          project_code: "",
          total_amount: 0,
          tax_amount: 0,
          shipping_cost: 0,
          notes: "",
          tax_configuration: "included",
          items: [],
          taxes: [],
        });
        setItemForms([{
          id: "1",
          product_name: "",
          product_code: "",
          quantity: 1,
          unit_price: 0,
          subtotal: 0,
        }]);
        setTaxConfig("included");
        setSelectedTaxIds([]);
        setSummary({
          subtotal: 0,
          taxAmount: 0,
          grandTotal: 0,
          taxDetails: [],
        });
        setShowCreateForm(false);
        setSalesOrderFileName("");
        setOtherFileNames([]);

        // Refresh list
        fetchSalesOrders();
      } else {
        throw new Error(result.error || "Gagal membuat sales order");
      }
    } catch (error) {
      console.error("Create SO error:", error);
      toast.error("Gagal membuat sales order");
    } finally {
      setSubmitting(false);
    }
  };

  // View detail
  const viewDetail = async (soCode: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/sales-orders?so_code=${encodeURIComponent(soCode)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedSO(data.data);
          setShowDetailModal(true);
        }
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Gagal memuat detail order");
    }
  };

  // ===============================
  // 🎨 RENDER
  // ===============================

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="max-w-[99vw] mx-auto p-4 space-y-6">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Sales Order</h1>
          <p className="text-gray-600 mt-2">Proses Sales Order Customer</p>
        </div>

        {/* Sales Orders Table */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sales Orders
              </CardTitle>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Cari order..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border rounded px-3 py-2 text-sm"
                >
                  <option value="all">Semua Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                {/* Create Button */}
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Sales Order Baru
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2">Memuat sales orders...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>SO Number</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesOrders.map((so, index) => (
                      <TableRow key={so.so_code}>
                        <TableCell className="font-medium">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="font-medium">{so.so_code}</TableCell>
                        <TableCell>
                          {new Date(so.created_at).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell>{so.customer_name}</TableCell>
                        <TableCell>
                          <Badge variant={
                            so.status === 'completed' ? 'default' :
                            so.status === 'processing' ? 'secondary' :
                            so.status === 'cancelled' ? 'destructive' : 'outline'
                          }>
                            {so.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatRupiah(so.total_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewDetail(so.so_code)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Lihat
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Menampilkan {(currentPage - 1) * itemsPerPage + 1} sampai {Math.min(currentPage * itemsPerPage, salesOrders.length)} dari {salesOrders.length} data
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Sebelumnya
                    </Button>
                    <span className="text-sm">
                      Halaman {currentPage} dari {Math.ceil(salesOrders.length / itemsPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={currentPage >= Math.ceil(salesOrders.length / itemsPerPage)}
                    >
                      Berikutnya
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Form */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Buat Sales Order Baru</CardTitle>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                {showCreateForm ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {showCreateForm ? "Sembunyikan Form" : "Tampilkan Form"}
              </Button>
            </div>
          </CardHeader>

          {showCreateForm && (
            <CardContent>
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Pilih Customer *</Label>
                    <select
                      value={newSO.customer_code || ""}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="">Pilih Customer</option>
                      {customers.map((customer) => (
                        <option
                          key={customer.customer_code}
                          value={customer.customer_code}
                        >
                          {customer.customer_name} - {customer.phone}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sales Rep */}
                  <div className="space-y-2">
                    <Label>Sales Representative</Label>
                    <select
                      value={users.find((user) => user.name === newSO.sales_rep)?.user_code || ""}
                      onChange={(e) => handleSalesRepSelect(e.target.value)}
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="">Pilih Sales Rep</option>
                      {users.map((user) => (
                        <option key={user.user_code} value={user.user_code}>
                          {user.name} - {user.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Project */}
                  <div className="space-y-2">
                    <Label>Proyek</Label>
                    <select
                      value={newSO.project_code || ""}
                      onChange={(e) =>
                        setNewSO((prev) => ({
                          ...prev,
                          project_code: e.target.value,
                        }))
                      }
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="">Pilih Proyek</option>
                      {projects.map((project) => (
                        <option key={project.project_code} value={project.project_code}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SO Document */}
                  <div className="space-y-2">
                    <Label>No SO (Dari Klien)</Label>
                    <Input
                      value={newSO.sales_order_doc}
                      onChange={(e) =>
                        setNewSO((prev) => ({
                          ...prev,
                          sales_order_doc: e.target.value,
                        }))
                      }
                      placeholder="Nomor dokumen SO"
                    />
                  </div>

                  {/* Shipping Address */}
                  <div className="space-y-2 md:col-span-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Alamat Pengiriman
                    </Label>
                    <textarea
                      value={newSO.shipping_address || ""}
                      onChange={(e) => handleShippingAddressChange(e.target.value)}
                      placeholder="Masukkan alamat pengiriman..."
                      rows={3}
                      className="w-full border rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                {/* Product Items */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Produk Items</CardTitle>
                      <Button onClick={addItemForm} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Item
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {itemForms.map((form, index) => (
                        <div
                          key={form.id}
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4 border rounded-lg relative"
                        >
                          {itemForms.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => removeItemForm(form.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}

                          <div className="space-y-1 md:col-span-2">
                            <Label>Pilih Produk *</Label>
                            <select
                              value={form.product_code}
                              onChange={(e) =>
                                handleProductSelect(form.id, e.target.value)
                              }
                              className="w-full border rounded px-2 py-1"
                            >
                              <option value="">Pilih Produk</option>
                              {products.map((product) => (
                                <option
                                  key={product.product_code}
                                  value={product.product_code}
                                >
                                  {product.product_name} - {product.product_code}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <Label>Quantity *</Label>
                            <Input
                              type="number"
                              min="1"
                              value={form.quantity || ""}
                              onChange={(e) =>
                                updateItemForm(form.id, "quantity", parseInt(e.target.value) || 0)
                              }
                              placeholder="Qty"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label>Harga Satuan *</Label>
                            <Input
                              type="number"
                              min="0"
                              value={form.unit_price || ""}
                              onChange={(e) =>
                                updateItemForm(form.id, "unit_price", parseInt(e.target.value) || 0)
                              }
                              placeholder="Harga"
                            />
                          </div>

                          <div className="md:col-span-2 space-y-1">
                            <Label>Subtotal</Label>
                            <Input
                              type="text"
                              value={formatRupiah(form.subtotal)}
                              readOnly
                              className="bg-gray-50 font-semibold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* SIMPLE TAX CONFIGURATION */}
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      Konfigurasi Pajak
                    </h3>
                  </div>

                  {/* Tax Toggle - Simple */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={taxConfig === 'excluded'}
                        onCheckedChange={handleTaxConfigChange}
                        className="data-[state=checked]:bg-green-600"
                      />
                      <div>
                        <Label className="font-medium">Metode Perhitungan Pajak</Label>
                        <p className="text-sm text-gray-600">
                          {taxConfig === 'included' 
                            ? 'Pajak sudah termasuk dalam harga' 
                            : 'Pajak ditambahkan ke total'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={taxConfig === 'included' ? 'default' : 'secondary'}>
                      {taxConfig === 'included' ? 'Tax Included' : 'Tax Excluded'}
                    </Badge>
                  </div>

                  {/* SIMPLIFIED TAX SELECTION */}
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="font-medium">Pilih Pajak</Label>
                      <Badge variant="outline" className="text-xs">
                        {selectedTaxIds.length} dipilih
                      </Badge>
                    </div>
                    
                    {loadingTaxTypes ? (
                      <div className="flex justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Memuat pajak...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {taxTypes.map((tax) => (
                          <div
                            key={tax.id}
                            className={`flex items-center p-2 border rounded cursor-pointer transition-colors ${
                              selectedTaxIds.includes(tax.id)
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-white hover:bg-gray-50'
                            }`}
                            onClick={() => toggleTaxSelection(tax.id)}
                          >
                            <Checkbox
                              checked={selectedTaxIds.includes(tax.id)}
                              onCheckedChange={() => toggleTaxSelection(tax.id)}
                              className="h-4 w-4 mr-2"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium">{tax.name}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Percent className="h-3 w-3" />
                                {tax.tax_rate}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* SIMPLE SUMMARY CARD WITH TAX DETAILS */}
                <Card className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <Calculator className="h-5 w-5" />
                          Ringkasan Order
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          Pajak: {taxConfig === 'included' ? 'Termasuk' : 'Ditambahkan'}
                        </Badge>
                      </div>

                      {/* Summary Items */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Package2 className="h-4 w-4" />
                            <span>Subtotal Items</span>
                          </div>
                          <span className="font-semibold">{formatRupiah(summary.subtotal)}</span>
                        </div>


                        {/* Tax Details */}
                        {summary.taxDetails.length > 0 && (
                          <div className="space-y-2">
                            
                            {/* Total Tax */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Percent className="h-4 w-4" />
                            <span>Total Pajak</span>
                          </div>
                          <span className="font-semibold">{formatRupiah(summary.taxAmount)}</span>
                        </div>
                            <div className="pl-6 space-y-1">
                              {summary.taxDetails.map((tax, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600">{tax.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {tax.rate}%
                                    </Badge>
                                  </div>
                                  <span className="text-red-600 font-medium">
                                    {formatRupiah(tax.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Grand Total */}
                        <div className="border-t pt-3">
                          <div className="flex justify-between items-center">
                            <div className="font-bold text-lg">Grand Total</div>
                            <div className="text-2xl font-bold text-blue-700">
                              {formatRupiah(summary.grandTotal)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Document Upload */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sales Order Doc */}
                  <div className="space-y-3">
                    <Label className="font-semibold">
                      Dokumen Sales Order (Dari Klien) *
                    </Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="h-8 w-8 text-gray-400" />
                        <Button
                          variant="outline"
                          onClick={() => handleFileUpload("sales_order")}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Dokumen
                        </Button>
                        {salesOrderFileName && (
                          <Badge className="bg-green-100 text-green-800">
                            <FileText className="h-3 w-3 mr-1" />
                            {salesOrderFileName}
                          </Badge>
                        )}
                        <input
                          ref={salesOrderFileRef}
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileInputChange(e, "sales_order")}
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Other Docs */}
                  <div className="space-y-3">
                    <Label className="font-semibold">Dokumen Lainnya</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="h-8 w-8 text-gray-400" />
                        <Button
                          variant="outline"
                          onClick={() => handleFileUpload("other")}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload File
                        </Button>
                        {otherFileNames.length > 0 && (
                          <div className="text-center space-y-1">
                            {otherFileNames.map((fileName, idx) => (
                              <Badge key={idx} className="bg-blue-100 text-blue-800 mr-1">
                                {fileName}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <input
                          ref={otherFilesRef}
                          type="file"
                          className="hidden"
                          multiple
                          onChange={(e) => handleFileInputChange(e, "other")}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Catatan</Label>
                  <textarea
                    value={newSO.notes || ""}
                    onChange={(e) =>
                      setNewSO((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Catatan tambahan..."
                    rows={3}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>

                {/* Submit */}
                <Button
                  onClick={submitSO}
                  size="lg"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Membuat Sales Order...
                    </>
                  ) : (
                    "Buat Sales Order"
                  )}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* DETAIL MODAL */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <CustomDialogContent className="w-[95vw] max-w-5xl max-h-[95vh] overflow-y-auto p-0">
            {/* Header - dengan Accounting Status */}
            <DialogHeader className="bg-white sticky top-0 z-50 border-b shadow-sm">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                      <FileText className="h-6 w-6 text-blue-600" />
                      Sales Order - {selectedSO?.so_code}
                    </DialogTitle>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge
                        className={`text-xs px-2 py-1 rounded-md ${
                          selectedSO?.status === "completed"
                            ? "bg-green-100 text-green-700 border-green-200"
                            : selectedSO?.status === "processing"
                            ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                            : selectedSO?.status === "cancelled"
                            ? "bg-red-100 text-red-700 border-red-200"
                            : "bg-blue-100 text-blue-700 border-blue-200"
                        }`}
                      >
                        {selectedSO?.status}
                      </Badge>
                      
                        {/* Accounting Status di Header
                        {selectedSO?.accounting_status && (
                          <Badge 
                            variant="outline" 
                            className="text-xs capitalize border-gray-300"
                          >
                            Accounting: {selectedSO.accounting_status}
                          </Badge>
                        )} */}
                      
                      <span className="text-xs text-gray-500">
                        Created: {selectedSO && new Date(selectedSO.created_at).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                  </div>
                  
                  {/* AR Code di sebelah kanan */}
                  {selectedSO?.ar_code && (
                    <div className="text-right">
                      <Label className="text-xs text-gray-500 font-medium">AR Code</Label>
                      <p className="text-sm font-semibold text-gray-900">{selectedSO.ar_code}</p>
                    </div>
                  )}
                </div>
              </div>
            </DialogHeader>

            {selectedSO && (
              <div className="space-y-4 p-4 bg-gray-50/50">
                {/* Customer & Address */}
                <div className="gap-4">
                  
                  {/* Customer Info */}
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        <Building className="h12 w-4" />
                        Customer Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-500 font-medium">Customer Name</Label>
                          <p className="text-sm font-semibold mt-1">{selectedSO.customer_name}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 font-medium">Phone</Label>
                          <p className="text-sm mt-1">{selectedSO.customer_phone}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-500 font-medium">Sales Order Doc</Label>
                          <p className="text-sm mt-1">{selectedSO.sales_order_doc || "-"}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 font-medium">Project Code</Label>
                          <p className="text-sm mt-1">{selectedSO.project_code || "-"}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-500 font-medium flex items-center gap-2">
                            <Mail className="h-3 w-3 text-blue-500" />
                            Email
                          </Label>
                          <p className="text-sm mt-1">{selectedSO.customer_email}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 font-medium flex items-center gap-2">
                            <Phone className="h-3 w-3 text-blue-500" />
                            Phone
                          </Label>
                          <p className="text-sm mt-1">{selectedSO.customer_phone}</p>
                        </div>
                      </div>

                      {/* Customer Type & Tax */}
                      <div className="grid grid-cols-2 gap-3">
                        {selectedSO.customer_type && (
                          <div>
                            <Label className="text-xs text-gray-500 font-medium">Customer Type</Label>
                            <Badge className="bg-blue-100 text-blue-700 text-xs px-2 py-1 mt-1">
                              {selectedSO.customer_type}
                            </Badge>
                          </div>
                        )}
                        {selectedSO.tax_configuration && (
                          <div>
                            <Label className="text-xs text-gray-500 font-medium">Tax Configuration</Label>
                            <Badge
                              className={
                                selectedSO.tax_configuration === "included"
                                  ? "bg-green-100 text-green-700 text-xs px-2 py-1 mt-1"
                                  : "bg-orange-100 text-orange-700 text-xs px-2 py-1 mt-1"
                              }
                            >
                              {selectedSO.tax_configuration === "included" ? "Tax Included" : "Tax Excluded"}
                            </Badge>
                          </div>
                        )}
                      </div>
                    {/* Customer Type & Tax */}
                      <div className="grid grid-cols-2 gap-3">
                        {selectedSO.customer_type && (
                          <div>
                            <Label className="text-xs text-gray-500 font-medium">Alamat Pengiriman</Label>
                            <Badge className="bg-blue-100 text-blue-700 text-xs px-2 py-1 mt-1">
                              {selectedSO.shipping_address}
                            </Badge>
                          </div>
                        )}
                        
                      </div>
                      {/* Sales Rep */}
                      {selectedSO.sales_rep && (
                        <div className="pt-2 border-t">
                          <Label className="text-xs text-gray-500 font-medium">Sales Representative</Label>
                          <div className="flex items-center gap-2 mt-1 p-2 bg-blue-50 rounded-md">
                            <User className="h-4 w-4 text-blue-600" />
                            <div>
                              <span className="text-sm font-medium">{selectedSO.sales_rep}</span>
                              {selectedSO.sales_rep_email && (
                                <p className="text-xs text-gray-600">{selectedSO.sales_rep_email}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {selectedSO.notes && (
                        <div className="pt-2 border-t">
                          <Label className="text-xs text-gray-500 font-medium">Notes</Label>
                          <div className="mt-1 p-2 bg-amber-50 border border-amber-100 rounded-md">
                            <p className="text-sm text-gray-700">{selectedSO.notes}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Items & Summary */}
                <div className="space-y-4 ">
                  {/* Items Table */}
                  <div className="xl:col-span-3">
                    <Card className="border shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                          Order Items ({selectedSO.items.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-gray-50">
                              <TableRow>
                                <TableHead className="w-[40%] text-xs font-medium text-gray-500 py-3">Product</TableHead>
                                <TableHead className="w-[10%] text-xs font-medium text-gray-500 py-3">Qty</TableHead>
                                <TableHead className="w-[15%] text-xs font-medium text-gray-500 py-3">Unit Price</TableHead>
                                <TableHead className="w-[15%] text-xs font-medium text-gray-500 py-3 text-right">Subtotal</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedSO.items.map((item, index) => (
                                <TableRow key={item.so_item_code} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                  <TableCell className="py-3">
                                    <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                                  </TableCell>
                                  <TableCell className="py-3">
                                    <span className="text-sm font-medium">{item.quantity}</span>
                                  </TableCell>
                                  <TableCell className="py-3">
                                    <span className="text-sm">{formatRupiah(item.unit_price)}</span>
                                  </TableCell>
                                  <TableCell className="py-3 text-right">
                                    <span className="text-sm font-semibold text-blue-600">
                                      {formatRupiah(item.subtotal)}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Summary */}
                  <div className="space-y-4">
                    <Card className="border shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                          Order Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="font-medium">
                            {formatRupiah(selectedSO.items.reduce((sum, item) => sum + item.subtotal, 0))}
                          </span>
                        </div>

                        {selectedSO.taxes.map((tax) => (
                          <div key={tax.so_tax_code} className="flex justify-between items-center py-1">
                            <div>
                              <span className="text-gray-600">{tax.tax_name}</span>
                              <span className="text-xs text-gray-400 ml-1">({tax.tax_rate}%)</span>
                            </div>
                            <span className="font-medium text-red-600">{formatRupiah(tax.tax_amount)}</span>
                          </div>
                        ))}

                        {selectedSO.shipping_cost > 0 && (
                          <div className="flex justify-between items-center py-1">
                            <span className="text-gray-600">Shipping</span>
                            <span className="font-medium">{formatRupiah(selectedSO.shipping_cost)}</span>
                          </div>
                        )}

                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-900">Grand Total</span>
                            <span className="font-bold text-lg text-blue-600">
                              {formatRupiah(selectedSO.total_amount)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Attachments */}
                {selectedSO.attachments && selectedSO.attachments.length > 0 && (
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        <FileText className="h-4 w-4" />
                        Attachments ({selectedSO.attachments.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {selectedSO.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {attachment.name}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <span>{attachment.type}</span>
                                  <span>•</span>
                                  <span>{(attachment.size / 1024 / 1024).toFixed(1)}MB</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              onClick={() => downloadAttachment(attachment)}
                              size="sm"
                              variant="ghost"
                              className="flex-shrink-0"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CustomDialogContent>
        </Dialog>

    </div>
  );
}