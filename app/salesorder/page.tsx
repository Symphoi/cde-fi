"use client";

import { useState, useRef, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  MapPin,
  Building,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  Package,
  BarChart3,
  Filter,
  Calendar,
  DollarSign,
  ShoppingCart,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CustomDialogContent } from "@/components/custom-dialog";

// Type definitions matching backend
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
  customer_data?: any;
  created_at: string;
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
  status:
    | "submitted"
    | "processing"
    | "shipped"
    | "delivered"
    | "completed"
    | "cancelled";
  notes?: string;
  ar_code?: string;
  invoice_number?: string;
  journal_code?: string;
  accounting_status?: "not_posted" | "posted" | "reconciled";
  tax_configuration?: "excluded" | "included";
  items: SalesOrderItem[];
  taxes: SalesOrderTax[];
  attachments: Attachment[];
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
  tax_configuration?: "excluded" | "included";
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

interface SalesOrderResponse {
  success: boolean;
  data: SalesOrder[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) => (
  <Card className={`border-l-4 ${color} hover:shadow-md transition-shadow`}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color.replace('border-l-', 'bg-').replace('-400', '-100')}`}>
          <Icon className={`h-6 w-6 ${color.replace('border-l-', 'text-').replace('-400', '-600')}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function SalesOrderPage() {
  // Refs untuk file input
  const salesOrderFileRef = useRef<HTMLInputElement>(null);
  const otherFilesRef = useRef<HTMLInputElement>(null);

  // State untuk toggle form
  const [showCreateForm, setShowCreateForm] = useState(false);

  // State untuk modal detail
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // State untuk data dari backend
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // State untuk pagination dan filter
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

  // State untuk multiple item forms
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

  // State untuk loading
  const [loadingTaxTypes, setLoadingTaxTypes] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // State untuk tax input mode (rate/amount)
  const [taxInputMode, setTaxInputMode] = useState<{
    [key: string]: "rate" | "amount";
  }>({});

  // State untuk file names
  const [salesOrderFileName, setSalesOrderFileName] = useState("");
  const [otherFileNames, setOtherFileNames] = useState<string[]>([]);

  // State untuk modal tambah baru
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Calculate stats
  const stats = {
    total: salesOrders.length,
    submitted: salesOrders.filter(so => so.status === 'submitted').length,
    processing: salesOrders.filter(so => so.status === 'processing').length,
    shipped: salesOrders.filter(so => so.status === 'shipped').length,
    delivered: salesOrders.filter(so => so.status === 'delivered').length,
    completed: salesOrders.filter(so => so.status === 'completed').length,
    cancelled: salesOrders.filter(so => so.status === 'cancelled').length,
    totalAmount: salesOrders.reduce((sum, so) => sum + so.total_amount, 0)
  };

  // Auto-set tax configuration berdasarkan customer type
  useEffect(() => {
    if (newSO.customer_type === "government") {
      setNewSO((prev) => ({ ...prev, tax_configuration: "excluded" }));
    } else {
      setNewSO((prev) => ({ ...prev, tax_configuration: "included" }));
    }
  }, [newSO.customer_type]);

  // Fetch users dari backend
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
        if (data.success) {
          setUsers(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("❌ Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch sales orders dari backend
  const fetchSalesOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Please login first");
        window.location.href = "/login";
        return;
      }

      let url = `/api/sales-orders?page=${currentPage}&limit=${itemsPerPage}`;

      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }

      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        toast.error("Session expired, please login again");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch sales orders");
      }

      const data: SalesOrderResponse = await response.json();

      if (data.success) {
        setSalesOrders(data.data);
      } else {
        throw new Error("Failed to load sales orders");
      }
    } catch (error) {
      console.error("Error fetching sales orders:", error);
      toast.error("❌ Failed to load sales orders");
    } finally {
      setLoading(false);
    }
  };

  // Fetch customers dari backend
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
        if (data.success) {
          setCustomers(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Fetch products dari backend
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
        if (data.success) {
          setProducts(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Fetch projects dari backend
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
        if (data.success) {
          setProjects(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
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
        }
      }
    } catch (error) {
      console.error("Error fetching tax types:", error);
      toast.error("❌ Failed to load tax types");
    } finally {
      setLoadingTaxTypes(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchSalesOrders();
    fetchCustomers();
    fetchProducts();
    fetchProjects();
    fetchTaxTypes();
    fetchUsers();
  }, [currentPage, itemsPerPage, statusFilter, searchTerm]);

  // Filter logic untuk client-side filtering tambahan
  const filteredSO = salesOrders.filter((so) => {
    const matchesSearch =
      so.so_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.customer_phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.sales_order_doc?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || so.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSO.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSO.length / itemsPerPage);

  // Pagination functions
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Update item form field
  const updateItemForm = (
    id: string,
    field: keyof (typeof itemForms)[0],
    value: string | number
  ) => {
    setItemForms((prev) =>
      prev.map((form) => {
        if (form.id === id) {
          const updatedForm = { ...form, [field]: value };

          // Auto-calculate subtotal if quantity or unit_price changes
          if (field === "quantity" || field === "unit_price") {
            updatedForm.subtotal =
              Number(updatedForm.quantity) * Number(updatedForm.unit_price);
          }

          return updatedForm;
        }
        return form;
      })
    );
  };

  // Add new item form
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

  // Remove item form
  const removeItemForm = (id: string) => {
    if (itemForms.length > 1) {
      setItemForms((prev) => prev.filter((form) => form.id !== id));
    }
  };

  // Toggle tax input mode
  const toggleTaxInputMode = (taxCode: string) => {
    setTaxInputMode((prev) => ({
      ...prev,
      [taxCode]: prev[taxCode] === "rate" ? "amount" : "rate",
    }));
  };

  // Update tax value
  const updateTaxValue = (taxCode: string, value: number) => {
    const mode = taxInputMode[taxCode] || "amount";

    setNewSO((prev) => {
      const updatedTaxes = prev.taxes.map((tax) => {
        if (tax.tax_code === taxCode) {
          if (mode === "rate") {
            // Input rate → calculate amount
            const tax_amount = (value * prev.total_amount) / 100;
            return { ...tax, tax_rate: value, tax_amount };
          } else {
            // Input amount → calculate rate
            const tax_rate =
              prev.total_amount > 0 ? (value / prev.total_amount) * 100 : 0;
            return { ...tax, tax_amount: value, tax_rate };
          }
        }
        return tax;
      });
      return { ...prev, taxes: updatedTaxes };
    });
  };

  // Update total amount
  const updateTotalAmount = (amount: number) => {
    setNewSO((prev) => {
      // Update taxes when total amount changes
      const updatedTaxes = prev.taxes.map((tax) => {
        if (taxInputMode[tax.tax_code] === "rate") {
          // Recalculate amount based on rate
          const tax_amount = (tax.tax_rate * amount) / 100;
          return { ...tax, tax_amount };
        }
        // If input mode is amount, keep the amount but recalculate rate
        const tax_rate = amount > 0 ? (tax.tax_amount / amount) * 100 : 0;
        return { ...tax, tax_rate };
      });

      return { ...prev, total_amount: amount, taxes: updatedTaxes };
    });
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

  // Handlers
  const toggleTax = (taxCode: string) => {
    const taxType = taxTypes.find((t) => t.tax_code === taxCode);
    if (!taxType) return;

    if (newSO.taxes.find((tax) => tax.tax_code === taxCode)) {
      setNewSO((prev) => ({
        ...prev,
        taxes: prev.taxes.filter((tax) => tax.tax_code !== taxCode),
      }));
      // Remove from input mode
      setTaxInputMode((prev) => {
        const newMode = { ...prev };
        delete newMode[taxCode];
        return newMode;
      });
    } else {
      setNewSO((prev) => ({
        ...prev,
        taxes: [
          ...prev.taxes,
          {
            tax_code: taxCode,
            tax_name: taxType.name,
            tax_rate: 0,
            tax_amount: 0,
          },
        ],
      }));
      // Default to amount input mode
      setTaxInputMode((prev) => ({
        ...prev,
        [taxCode]: "amount",
      }));
    }
  };

  // Select customer handler
  const handleCustomerSelect = (customerCode: string) => {
    if (customerCode === "new") {
      setShowAddCustomerModal(true);
      return;
    }

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
      }));
    }
  };

  // Select product handler untuk item form
  const handleProductSelect = (itemId: string, productCode: string) => {
    if (productCode === "new") {
      setShowAddProductModal(true);
      return;
    }

    const product = products.find((p) => p.product_code === productCode);
    if (product) {
      updateItemForm(itemId, "product_name", product.product_name);
      updateItemForm(itemId, "product_code", product.product_code);
      // Harga tetap input manual
    }
  };

  const handleFileUpload = (type: "sales_order" | "other") => {
    if (type === "sales_order") {
      salesOrderFileRef.current?.click();
    } else {
      otherFilesRef.current?.click();
    }
  };

  // Handle file input change
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

  // Clear file inputs
  const clearFileInputs = () => {
    setSalesOrderFileName("");
    setOtherFileNames([]);
    if (salesOrderFileRef.current) salesOrderFileRef.current.value = "";
    if (otherFilesRef.current) otherFilesRef.current.value = "";
  };

  // Form validation
  const validateForm = () => {
    const errors: string[] = [];

    // Required fields
    if (!newSO.customer_name.trim()) errors.push("Customer name is required");
    if (!newSO.customer_phone.trim()) errors.push("Customer phone is required");
    if (!newSO.total_amount || newSO.total_amount <= 0)
      errors.push("Total amount must be greater than 0");

    // Validate items
    const validItems = itemForms.filter(
      (form) =>
        form.product_name &&
        form.product_code &&
        form.quantity > 0 &&
        form.unit_price > 0
    );

    if (validItems.length === 0) {
      errors.push("At least one valid item is required");
    }

    // ✅ NEW: Document Validation
    if (!salesOrderFileName) {
      errors.push("Sales Order Document is required");
    }

    // ✅ NEW: File Type Validation
    if (salesOrderFileName) {
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
      const fileExt = salesOrderFileName.toLowerCase().substring(salesOrderFileName.lastIndexOf('.'));
      if (!allowedExtensions.includes(fileExt)) {
        errors.push("Sales Order Document must be PDF, Word, or Excel file");
      }
    }

    // ✅ NEW: File Size Validation (max 10MB)
    if (salesOrderFileRef.current?.files?.[0]) {
      const fileSize = salesOrderFileRef.current.files[0].size;
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileSize > maxSize) {
        errors.push("Sales Order Document must be less than 10MB");
      }
    }

    return errors;
  };

  const submitSO = async () => {
    // Validate form
    const errors = validateForm();
    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
      return;
    }

    // Prepare items data
    const itemsData = itemForms
      .filter(
        (form) =>
          form.product_name &&
          form.product_code &&
          form.quantity > 0 &&
          form.unit_price > 0
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
        toast.error("Please login first");
        window.location.href = "/login";
        return;
      }

      // PREPARE FORM DATA
      const formData = new FormData();

      // Append SO data sebagai JSON string
      const requestData: CreateSalesOrderRequest = {
        ...newSO,
        project_code: newSO.project_code || undefined,
        items: itemsData,
        tax_amount: newSO.taxes.reduce((sum, tax) => sum + tax.tax_amount, 0),
        shipping_cost: newSO.shipping_cost || 0,
      };

      formData.append("data", JSON.stringify(requestData));

      // APPEND FILES JIKA ADA
      if (salesOrderFileRef.current?.files?.[0]) {
        formData.append("sales_order_doc", salesOrderFileRef.current.files[0]);
      }

      if (otherFilesRef.current?.files) {
        for (let file of otherFilesRef.current.files) {
          formData.append("other_docs", file);
        }
      }

      // KIRIM SEBAGAI FORM DATA
      const response = await fetch("/api/sales-orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`Sales Order ${result.so_code} created successfully!`);

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
        setItemForms([
          {
            id: "1",
            product_name: "",
            product_code: "",
            quantity: 1,
            unit_price: 0,
            subtotal: 0,
          },
        ]);
        setShowCreateForm(false);
        setTaxInputMode({});

        // Clear file inputs
        clearFileInputs();

        // Refresh sales orders list
        fetchSalesOrders();
      } else {
        throw new Error(result.error || "Failed to create sales order");
      }
    } catch (error) {
      console.error("Create SO error:", error);
      toast.error("Failed to create sales order");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      submitted: "bg-blue-100 text-blue-800",
      processing: "bg-yellow-100 text-yellow-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || colors.submitted;
  };

  const viewDetail = async (soCode: string) => {
    try {
      const token = localStorage.getItem("token");

      // PAKAI QUERY PARAMETER
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
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch order details");
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to load order details");
    }
  };

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      window.open(`/api/attachments/${attachment.id}`, "_blank");
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  // Komponen Pagination
  const Pagination = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold">{indexOfFirstItem + 1}</span>{" "}
          to{" "}
          <span className="font-semibold">
            {Math.min(indexOfLastItem, filteredSO.length)}
          </span>{" "}
          of <span className="font-semibold">{filteredSO.length}</span> results
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevPage}
            disabled={currentPage === 1}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-1">
            {pageNumbers.map((number) => (
              <Button
                key={number}
                variant={currentPage === number ? "default" : "outline"}
                size="sm"
                onClick={() => paginate(number)}
                className="w-8 h-8 p-0 min-w-8"
              >
                {number}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="itemsPerPage" className="text-sm whitespace-nowrap">
            Items per page:
          </Label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    );
  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="max-w-[99vw] mx-auto p-4 space-y-6">
        
         <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Sales Order</h1>
          <p className="text-gray-600 mt-2">Process customer Sales Order </p>
        </div>

        {/* Status Breakdown */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Order Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
                <div className="text-sm text-blue-800">Submitted</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.processing}</div>
                <div className="text-sm text-yellow-800">Processing</div>
              </div>
              {/* <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.shipped}</div>
                <div className="text-sm text-purple-800">Shipped</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
                <div className="text-sm text-green-800">Delivered</div>
              </div> */}
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-sm text-green-800">Completed</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
                <div className="text-sm text-red-800">Cancelled</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Previous Sales Orders - Full Width Table */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sales Orders
              </CardTitle>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {/* Search Input */}
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search orders..."
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
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                {/* Reset Filters */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setCurrentPage(1);
                  }}
                  className="whitespace-nowrap"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Reset Filters
                </Button>

                {/* Create New SO Button */}
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Sales Order
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2">Loading sales orders...</span>
              </div>
            )}

            {!loading && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead>SO Number</TableHead>
                      <TableHead>SO From Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Customer Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.length > 0 ? (
                      currentItems.map((so, index) => (
                        <TableRow key={so.so_code} className="hover:bg-gray-50">
                          <TableCell className="text-center font-medium">
                            {indexOfFirstItem + index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            {so.so_code}
                          </TableCell>
                          <TableCell className="font-medium">
                            {so.sales_order_doc || "-"}
                          </TableCell>
                          <TableCell>
                            {new Date(so.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{so.customer_name}</TableCell>
                          <TableCell>{so.customer_phone}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(so.status)}>
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
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center py-8 text-gray-500"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="h-12 w-12 text-gray-300" />
                            <p>No sales orders found.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowCreateForm(true)}
                            >
                              Create First Sales Order
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {!loading && filteredSO.length > 0 && <Pagination />}
          </CardContent>
        </Card>

        {/* Create New Sales Order - Collapsible */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Create New Sales Order
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                {showCreateForm ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {showCreateForm ? "Hide Form" : "Show Form"}
              </Button>
            </div>
          </CardHeader>

          {showCreateForm && (
            <CardContent>
              <div className="space-y-6">
                {/* Customer and Transaction Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Dropdown */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="customerSelect">Select Customer *</Label>
                    <select
                      id="customerSelect"
                      value={newSO.customer_code || ""}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      className="w-full border rounded-md px-3 py-2"
                      disabled={loadingCustomers}
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
                      <option value="new" className="font-bold text-blue-600">
                        + Tambah Customer Baru
                      </option>
                    </select>
                    {loadingCustomers && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading customers...
                      </div>
                    )}
                  </div>

                  {/* Sales Representative Dropdown */}
                  <div className="space-y-2">
                    <Label htmlFor="salesRepSelect">Sales Representative</Label>
                    <select
                      id="salesRepSelect"
                      value={
                        users.find((user) => user.name === newSO.sales_rep)
                          ?.user_code || ""
                      }
                      onChange={(e) => handleSalesRepSelect(e.target.value)}
                      className="w-full border rounded-md px-3 py-2"
                      disabled={loadingUsers}
                    >
                      <option value="">Pilih Sales Representative</option>
                      {users.map((user) => (
                        <option key={user.user_code} value={user.user_code}>
                          {user.name} - {user.email}
                        </option>
                      ))}
                    </select>
                    {loadingUsers && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading sales representatives...
                      </div>
                    )}
                    {newSO.sales_rep && (
                      <div className="text-sm text-green-600">
                        Selected: {newSO.sales_rep}{" "}
                        {newSO.sales_rep_email && `(${newSO.sales_rep_email})`}
                      </div>
                    )}
                  </div>

                  {/* Customer Type Display */}
                  <div className="space-y-2">
                    <Label htmlFor="customerType">Customer Type</Label>
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="capitalize">{newSO.customer_type}</span>
                      <Badge
                        className={
                          newSO.customer_type === "government"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-blue-100 text-blue-800"
                        }
                      >
                        {newSO.customer_type === "government"
                          ? "Tax Excluded"
                          : "Tax Included"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">Total Amount *</Label>
                    <Input
                      id="totalAmount"
                      type="number"
                      value={newSO.total_amount || ""}
                      onChange={(e) =>
                        updateTotalAmount(parseInt(e.target.value) || 0)
                      }
                      placeholder="Enter total amount"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salesOrderDoc">No SO (From Client)</Label>
                    <Input
                      id="salesOrderDoc"
                      value={newSO.sales_order_doc}
                      onChange={(e) =>
                        setNewSO((prev) => ({
                          ...prev,
                          sales_order_doc: e.target.value,
                        }))
                      }
                      placeholder="No SO document"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="projectSelect">Project</Label>
                    <select
                      id="projectSelect"
                      value={newSO.project_code || ""}
                      onChange={(e) =>
                        setNewSO((prev) => ({
                          ...prev,
                          project_code: e.target.value,
                        }))
                      }
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="">Pilih Project</option>
                      {projects.map((project) => (
                        <option
                          key={project.project_code}
                          value={project.project_code}
                        >
                          {project.name}{" "}
                          {project.company_name
                            ? `(${project.company_name})`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shippingAddress">Shipping Address</Label>
                    <Input
                      id="shippingAddress"
                      value={newSO.shipping_address}
                      onChange={(e) =>
                        setNewSO((prev) => ({
                          ...prev,
                          shipping_address: e.target.value,
                        }))
                      }
                      placeholder="Shipping address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shippingCost">Shipping Cost</Label>
                    <Input
                      id="shippingCost"
                      type="number"
                      value={newSO.shipping_cost || ""}
                      onChange={(e) =>
                        setNewSO((prev) => ({
                          ...prev,
                          shipping_cost: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="Shipping cost"
                    />
                  </div>
                </div>

                {/* Tax Section */}
                {loadingTaxTypes ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading tax types...</span>
                  </div>
                ) : (
                  taxTypes.map((tax) => (
                    <div
                      key={tax.tax_code}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Switch
                          checked={
                            !!newSO.taxes.find(
                              (t) => t.tax_code === tax.tax_code
                            )
                          }
                          onCheckedChange={() => toggleTax(tax.tax_code)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{tax.name}</div>
                          {tax.description && (
                            <div className="text-sm text-gray-500">
                              {tax.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleTaxInputMode(tax.tax_code)}
                          className="text-xs"
                        >
                          {taxInputMode[tax.tax_code] === "rate"
                            ? "Rate"
                            : "Amount"}
                        </Button>

                        <div className="w-32">
                          {taxInputMode[tax.tax_code] === "rate" ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={
                                newSO.taxes.find(
                                  (t) => t.tax_code === tax.tax_code
                                )?.tax_rate || ""
                              }
                              onChange={(e) =>
                                updateTaxValue(
                                  tax.tax_code,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="Rate %"
                              disabled={
                                !newSO.taxes.find(
                                  (t) => t.tax_code === tax.tax_code
                                )
                              }
                            />
                          ) : (
                            <Input
                              type="number"
                              value={
                                newSO.taxes.find(
                                  (t) => t.tax_code === tax.tax_code
                                )?.tax_amount || ""
                              }
                              onChange={(e) =>
                                updateTaxValue(
                                  tax.tax_code,
                                  parseInt(e.target.value) || 0
                                )
                              }
                              placeholder="Amount"
                              disabled={
                                !newSO.taxes.find(
                                  (t) => t.tax_code === tax.tax_code
                                )
                              }
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Product Items Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Product Items</CardTitle>
                      <Button onClick={addItemForm} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item Form
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
                          <div className="absolute -top-2 -left-2">
                            <div className="w-6 h-6 bg-cyan-700 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                              {index + 1}
                            </div>
                          </div>

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

                          {/* Product Dropdown */}
                          <div className="space-y-1 md:col-span-2">
                            <Label className="text-sm">Select Product</Label>
                            <select
                              value={form.product_code}
                              onChange={(e) =>
                                handleProductSelect(form.id, e.target.value)
                              }
                              className="w-full border rounded px-2 py-1 text-sm"
                              disabled={loadingProducts}
                            >
                              <option value="">Pilih Product</option>
                              {products.map((product) => (
                                <option
                                  key={product.product_code}
                                  value={product.product_code}
                                >
                                  {product.product_name} -{" "}
                                  {product.product_code}
                                </option>
                              ))}
                              <option
                                value="new"
                                className="font-bold text-blue-600"
                              >
                                + Tambah Product Baru
                              </option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-sm">Quantity</Label>
                            <Input
                              type="number"
                              value={form.quantity || ""}
                              onChange={(e) =>
                                updateItemForm(
                                  form.id,
                                  "quantity",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              placeholder="Enter quantity"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-sm">Unit Price</Label>
                            <Input
                              type="number"
                              value={form.unit_price || ""}
                              onChange={(e) =>
                                updateItemForm(
                                  form.id,
                                  "unit_price",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              placeholder="Enter unit price"
                            />
                          </div>

                          <div className="space-y-1 md:col-span-2">
                            <Label className="text-sm">Subtotal</Label>
                            <Input
                              type="number"
                              value={form.subtotal || ""}
                              readOnly
                              className="bg-gray-50"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Document Upload Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sales Order Document Upload */}
                  <div className="space-y-3">
                    <Label className="font-semibold flex items-center gap-1">
                      Sales Order Document (From Client)
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="h-8 w-8 text-gray-400" />
                        
                        {/* Error State */}
                        {!salesOrderFileName && (
                          <div className="text-sm text-red-500 text-center">
                            Sales Order Document is required
                          </div>
                        )}
                        
                        <Button
                          variant="outline"
                          onClick={() => handleFileUpload("sales_order")}
                          className="cursor-pointer"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Sales Order Document
                        </Button>

                        {/* File Indicator */}
                        {salesOrderFileName && (
                          <div className="text-center">
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-800"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              {salesOrderFileName}
                            </Badge>
                          </div>
                        )}

                        <input
                          ref={salesOrderFileRef}
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileInputChange(e, "sales_order")}
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                        />
                        <p className="text-xs text-gray-500 text-center">
                          Only 1 file allowed • Max 10MB • PDF, Word, Excel only
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Other Documents Upload */}
                  <div className="space-y-3">
                    <Label className="font-semibold">Other Documents</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="h-8 w-8 text-gray-400" />
                        <Button
                          variant="outline"
                          onClick={() => handleFileUpload("other")}
                          className="cursor-pointer"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Other Documents
                        </Button>

                        {/* FILE INDICATOR */}
                        {otherFileNames.length > 0 && (
                          <div className="text-center space-y-1">
                            {otherFileNames.map((fileName, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="bg-blue-100 text-blue-800 mr-1 mb-1"
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                {fileName}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <input
                          ref={otherFilesRef}
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileInputChange(e, "other")}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                          multiple
                        />
                        <p className="text-xs text-gray-500 text-center">
                          Multiple files allowed
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={newSO.notes || ""}
                    onChange={(e) =>
                      setNewSO((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Additional notes..."
                    rows={3}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>

                {/* Submit Button */}
                <div className="w-full">
                  <Button
                    onClick={submitSO}
                    size="lg"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Sales Order...
                      </>
                    ) : (
                      "Create Sales Order"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Detail Modal - Tetap sama seperti sebelumnya */}
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
                      
                      {/* Accounting Status di Header */}
                      {selectedSO?.accounting_status && (
                        <Badge 
                          variant="outline" 
                          className="text-xs capitalize border-gray-300"
                        >
                          Accounting: {selectedSO.accounting_status}
                        </Badge>
                      )}
                      
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  
                  {/* Customer Info */}
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        <Building className="h-4 w-4" />
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

                  {/* Address Info */}
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        <MapPin className="h-4 w-4" />
                        Address Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <Label className="text-xs text-gray-500 font-medium">Billing Address</Label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-md border">
                          <p className="text-sm whitespace-pre-wrap">
                            {selectedSO.billing_address || "No billing address provided"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 font-medium">Shipping Address</Label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-md border">
                          <p className="text-sm whitespace-pre-wrap">
                            {selectedSO.shipping_address || "No shipping address provided"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Items & Summary */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
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
                                <TableHead className="w-[20%] text-xs font-medium text-gray-500 py-3">SKU</TableHead>
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
                                    <Badge variant="outline" className="text-xs font-mono">
                                      {item.product_code}
                                    </Badge>
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

        {/* Add Customer Modal */}
        <Dialog
          open={showAddCustomerModal}
          onOpenChange={setShowAddCustomerModal}
        >
          <DialogContent className="backdrop-blur-md bg-white/90">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Tambah Customer Baru
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Fitur tambah customer baru akan segera tersedia. Untuk
                sementara, silakan input manual di form.
              </p>
              <Button onClick={() => setShowAddCustomerModal(false)}>
                Tutup
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Product Modal */}
        <Dialog
          open={showAddProductModal}
          onOpenChange={setShowAddProductModal}
        >
          <DialogContent className="backdrop-blur-md bg-white/90">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Tambah Product Baru
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Fitur tambah product baru akan segera tersedia. Untuk sementara,
                silakan input manual di form items.
              </p>
              <Button onClick={() => setShowAddProductModal(false)}>
                Tutup
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}