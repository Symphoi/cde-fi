"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Hash,
  RotateCcw,
  Loader2,
  FileDigit,
  HelpCircle,
  ChevronDown,
  Building,
  User,
  Folder,
  Truck,
  Calendar,
  Type,
} from "lucide-react";
import { toast } from "sonner";

// Types
interface NumberingSequence {
  id: number;
  sequence_code: string;
  prefix: string;
  next_number: number;
  description: string;
  created_at: string;
  updated_at: string;
}

interface SequenceFormData {
  sequence_code: string;
  prefix: string;
  next_number: string;
  description: string;
}

// Template Options
const templateOptions = [
  { 
    value: '', 
    label: 'Custom Template (Free Input)',
    description: 'Create your own template format'
  },
  // SALES & CUSTOMER RELATED
  { 
    value: '{customer_code}/{project_code}/{company_code}/{sales_rep}/', 
    label: 'Sales Order Format',
    description: 'CUST001/PRJ001/COMP001/SR001/',
    category: 'sales'
  },
  { 
    value: '{customer_code}/{project_code}/', 
    label: 'Project Customer Format',
    description: 'CUST001/PRJ001/',
    category: 'sales'
  },
  { 
    value: '{customer_code}/{year}/{month}/', 
    label: 'Customer Monthly',
    description: 'CUST001/2024/12/',
    category: 'sales'
  },
  // PURCHASE & VENDOR RELATED  
  { 
    value: '{vendor_code}/{project_code}/{company_code}/', 
    label: 'Purchase Order Format',
    description: 'VEND001/PRJ001/COMP001/',
    category: 'purchase'
  },
  { 
    value: '{vendor_code}/{year}/{month}/', 
    label: 'Vendor Monthly',
    description: 'VEND001/2024/12/',
    category: 'purchase'
  },
  // INVOICE & PAYMENTS
  { 
    value: '{customer_code}/INV/{year}/{month}/', 
    label: 'Invoice Format',
    description: 'CUST001/INV/2024/12/',
    category: 'accounting'
  },
  { 
    value: '{customer_code}/PAY/{year}/{month}/', 
    label: 'Payment Format',
    description: 'CUST001/PAY/2024/12/',
    category: 'accounting'
  },
  // EMPLOYEE RELATED
  { 
    value: '{user_code}/{year}/{month}/', 
    label: 'Employee Monthly',
    description: 'USR001/2024/12/',
    category: 'hr'
  },
  { 
    value: '{user_code}/CA/{year}/', 
    label: 'Cash Advance Format',
    description: 'USR001/CA/2024/',
    category: 'hr'
  },
  // COMPANY & PROJECT
  { 
    value: '{company_code}/{project_code}/', 
    label: 'Company Project',
    description: 'COMP001/PRJ001/',
    category: 'project'
  },
  { 
    value: '{company_code}-{year}-', 
    label: 'Company Year Format',
    description: 'COMP001-2024-',
    category: 'company'
  },
  // SIMPLE FORMATS
  { 
    value: '{year}/{month}/', 
    label: 'Monthly Format',
    description: '2024/12/',
    category: 'general'
  },
  { 
    value: '{year}/', 
    label: 'Yearly Format',
    description: '2024/',
    category: 'general'
  }
];

// Variable categories for template builder
const variableCategories = [
  {
    name: 'Customer',
    icon: User,
    variables: [
      { code: '{customer_code}', name: 'Customer Code', example: 'CUST001' },
      { code: '{customer_name}', name: 'Customer Name', example: 'PT Customer' },
      { code: '{customer_type}', name: 'Customer Type', example: 'company' }
    ]
  },
  {
    name: 'Project',
    icon: Folder,
    variables: [
      { code: '{project_code}', name: 'Project Code', example: 'PRJ001' },
      { code: '{project_name}', name: 'Project Name', example: 'Website Development' }
    ]
  },
  {
    name: 'Company',
    icon: Building,
    variables: [
      { code: '{company_code}', name: 'Company Code', example: 'COMP001' },
      { code: '{company_name}', name: 'Company Name', example: 'PT Perusahaan' }
    ]
  },
  {
    name: 'Vendor',
    icon: Truck,
    variables: [
      { code: '{vendor_code}', name: 'Vendor Code', example: 'VEND001' },
      { code: '{vendor_name}', name: 'Vendor Name', example: 'PT Supplier' }
    ]
  },
  {
    name: 'User',
    icon: User,
    variables: [
      { code: '{user_code}', name: 'User Code', example: 'USR001' },
      { code: '{user_name}', name: 'User Name', example: 'John Doe' },
      { code: '{department}', name: 'Department', example: 'Sales' },
      { code: '{position}', name: 'Position', example: 'Manager' },
      { code: '{sales_rep}', name: 'Sales Rep Code', example: 'SR001' }
    ]
  },
  {
    name: 'Date',
    icon: Calendar,
    variables: [
      { code: '{year}', name: 'Year', example: '2024' },
      { code: '{month}', name: 'Month', example: '12' },
      { code: '{day}', name: 'Day', example: '31' }
    ]
  },
  {
    name: 'Static',
    icon: Type,
    variables: [
      { code: 'INV', name: 'INV (Invoice)', example: 'INV' },
      { code: 'SO', name: 'SO (Sales Order)', example: 'SO' },
      { code: 'PO', name: 'PO (Purchase Order)', example: 'PO' },
      { code: '/', name: 'Slash Separator', example: '/' },
      { code: '-', name: 'Dash Separator', example: '-' }
    ]
  }
];

// API Service
class NumberingSequenceService {
  private static async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Session expired. Please login again.");
      window.location.href = "/login";
      throw new Error("No authentication token");
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      } catch (jsonError) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }
    }

    return response.json();
  }

  static async getSequences(search?: string) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    return this.fetchWithAuth(`/api/numbering-sequences?${params}`);
  }

  static async createSequence(data: SequenceFormData) {
    return this.fetchWithAuth("/api/numbering-sequences", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        next_number: parseInt(data.next_number) || 1,
      }),
    });
  }

  static async updateSequence(data: SequenceFormData & { id: number }) {
    return this.fetchWithAuth("/api/numbering-sequences", {
      method: "PUT",
      body: JSON.stringify({
        ...data,
        next_number: parseInt(data.next_number) || 1,
      }),
    });
  }

  static async deleteSequence(id: number) {
    return this.fetchWithAuth(`/api/numbering-sequences?id=${id}`, {
      method: "DELETE",
    });
  }

  static async resetSequence(id: number, newNumber: number) {
    return this.fetchWithAuth(
      `/api/numbering-sequences?id=${id}&new_number=${newNumber}`,
      {
        method: "PATCH",
      }
    );
  }
}

export default function NumberingSequencesPage() {
  const [sequences, setSequences] = useState<NumberingSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingSequence, setEditingSequence] =
    useState<NumberingSequence | null>(null);
  const [formData, setFormData] = useState<SequenceFormData>({
    sequence_code: "",
    prefix: "",
    next_number: "1",
    description: "",
  });

  // Template Builder state
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [templateParts, setTemplateParts] = useState<string[]>([]);

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sequenceToDelete, setSequenceToDelete] =
    useState<NumberingSequence | null>(null);

  // Reset confirmation modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [sequenceToReset, setSequenceToReset] =
    useState<NumberingSequence | null>(null);
  const [resetNumber, setResetNumber] = useState("1");

  // Fetch data
  const fetchSequences = async () => {
    try {
      setLoading(true);
      const response = await NumberingSequenceService.getSequences(searchTerm);

      if (response.success) {
        setSequences(response.data);
      }
    } catch (error: any) {
      console.error("Error fetching sequences:", error);
      toast.error(error.message || "Failed to load numbering sequences");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSequences();
  }, [searchTerm]);

  // Form handlers
  const handleCreateNew = () => {
    setEditingSequence(null);
    setFormData({
      sequence_code: "",
      prefix: "",
      next_number: "1",
      description: "",
    });
    setSelectedTemplate('');
    setTemplateParts([]);
    setShowTemplateBuilder(false);
    setShowForm(true);
  };

  const handleEdit = (sequence: NumberingSequence) => {
    setEditingSequence(sequence);
    setFormData({
      sequence_code: sequence.sequence_code,
      prefix: sequence.prefix || "",
      next_number: sequence.next_number.toString(),
      description: sequence.description || "",
    });
    setSelectedTemplate('');
    setTemplateParts([]);
    setShowTemplateBuilder(false);
    setShowForm(true);
  };

  const updateFormField = (field: keyof SequenceFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Template Builder functions
  const handleTemplateSelect = (template: string) => {
    setSelectedTemplate(template);
    if (template) {
      updateFormField('prefix', template);
      setShowTemplateBuilder(false);
    }
  };

  const addVariableToTemplate = (variable: string) => {
    const newParts = [...templateParts, variable];
    setTemplateParts(newParts);
    const newTemplate = newParts.join('');
    updateFormField('prefix', newTemplate);
    setSelectedTemplate('');
  };

  const addCustomText = () => {
    const text = prompt('Enter custom text:');
    if (text) {
      const newParts = [...templateParts, text];
      setTemplateParts(newParts);
      const newTemplate = newParts.join('');
      updateFormField('prefix', newTemplate);
      setSelectedTemplate('');
    }
  };

  const clearTemplateBuilder = () => {
    setTemplateParts([]);
    updateFormField('prefix', '');
    setSelectedTemplate('');
  };

  const removeLastPart = () => {
    if (templateParts.length > 0) {
      const newParts = templateParts.slice(0, -1);
      setTemplateParts(newParts);
      const newTemplate = newParts.join('');
      updateFormField('prefix', newTemplate);
    }
  };

  // Validate template variables
  const validateTemplate = (template: string): string[] => {
    const allowedVariables = [
      '{customer_code}', '{customer_name}', '{customer_type}',
      '{project_code}', '{project_name}', 
      '{company_code}', '{company_name}',
      '{vendor_code}', '{vendor_name}',
      '{user_code}', '{user_name}', '{department}', '{position}', '{sales_rep}',
      '{year}', '{month}', '{day}'
    ];
    const variablesInTemplate = template.match(/\{[\w]+\}/g) || [];
    return variablesInTemplate.filter(v => !allowedVariables.includes(v));
  };

  const submitForm = async () => {
    if (!formData.sequence_code.trim()) {
      toast.error("Sequence code is required");
      return;
    }

    if (
      formData.next_number &&
      (isNaN(parseInt(formData.next_number)) ||
        parseInt(formData.next_number) < 1)
    ) {
      toast.error("Next number must be a positive integer");
      return;
    }

    // Validate template variables
    if (formData.prefix) {
      const invalidVariables = validateTemplate(formData.prefix);
      if (invalidVariables.length > 0) {
        toast.error(`Invalid template variables: ${invalidVariables.join(', ')}`);
        return;
      }
    }

    try {
      setSubmitting(true);

      if (editingSequence) {
        const result = await NumberingSequenceService.updateSequence({
          ...formData,
          id: editingSequence.id,
        });
        toast.success(result.message || "Sequence updated successfully");
      } else {
        const result = await NumberingSequenceService.createSequence(formData);
        toast.success(result.message || "Sequence created successfully");
      }

      setShowForm(false);
      setEditingSequence(null);
      await fetchSequences();
    } catch (error: any) {
      console.error("Error saving sequence:", error);
      toast.error(error.message || "Failed to save sequence");
    } finally {
      setSubmitting(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingSequence(null);
    setSubmitting(false);
    setShowTemplateBuilder(false);
  };

  const handleDeleteClick = (sequence: NumberingSequence) => {
    setSequenceToDelete(sequence);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sequenceToDelete) return;

    try {
      setActionLoading(`delete-${sequenceToDelete.id}`);
      const result = await NumberingSequenceService.deleteSequence(
        sequenceToDelete.id
      );
      toast.success(result.message || "Sequence deleted successfully");
      setShowDeleteModal(false);
      setSequenceToDelete(null);
      await fetchSequences();
    } catch (error: any) {
      console.error("Error deleting sequence:", error);
      toast.error(error.message || "Failed to delete sequence");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setSequenceToDelete(null);
  };

  const handleResetClick = (sequence: NumberingSequence) => {
    setSequenceToReset(sequence);
    setResetNumber(sequence.next_number.toString());
    setShowResetModal(true);
  };

  const handleResetConfirm = async () => {
    if (!sequenceToReset) return;

    const newNumber = parseInt(resetNumber);
    if (isNaN(newNumber) || newNumber < 1) {
      toast.error("Please enter a valid positive number");
      return;
    }

    try {
      setActionLoading(`reset-${sequenceToReset.id}`);
      const result = await NumberingSequenceService.resetSequence(
        sequenceToReset.id,
        newNumber
      );
      toast.success(result.message || "Sequence number reset successfully");
      setShowResetModal(false);
      setSequenceToReset(null);
      await fetchSequences();
    } catch (error: any) {
      console.error("Error resetting sequence:", error);
      toast.error(error.message || "Failed to reset sequence number");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetCancel = () => {
    setShowResetModal(false);
    setSequenceToReset(null);
  };

  // Format preview dengan contoh values
  const formatPreview = (sequence: NumberingSequence) => {
    const paddedNumber = sequence.next_number.toString().padStart(4, "0");
    
    if (!sequence.prefix) {
      return paddedNumber;
    }
    
    // Contoh values untuk preview
    const previewTemplate = sequence.prefix
      .replace(/{company_code}/g, 'COMP24VQ74')
      .replace(/{company_name}/g, 'PT DIVA SINERGI')
      .replace(/{project_code}/g, 'PRJ001')
      .replace(/{project_name}/g, 'Website Development')
      .replace(/{customer_code}/g, 'CUST001')
      .replace(/{customer_name}/g, 'PT Customer')
      .replace(/{customer_type}/g, 'company')
      .replace(/{vendor_code}/g, 'VEND001')
      .replace(/{vendor_name}/g, 'PT Supplier')
      .replace(/{user_code}/g, 'USR001')
      .replace(/{user_name}/g, 'John Doe')
      .replace(/{department}/g, 'Sales')
      .replace(/{position}/g, 'Manager')
      .replace(/{sales_rep}/g, 'SR001')
      .replace(/{year}/g, new Date().getFullYear().toString())
      .replace(/{month}/g, (new Date().getMonth() + 1).toString().padStart(2, '0'))
      .replace(/{day}/g, new Date().getDate().toString().padStart(2, '0'));
    
    return `${previewTemplate}${paddedNumber}`;
  };

  // Delete Confirmation Modal
  const DeleteConfirmationModal = () => {
    if (!showDeleteModal || !sequenceToDelete) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
          <div className="text-gray-600 mb-6">
            Are you sure you want to delete sequence{" "}
            <strong>{sequenceToDelete.sequence_code}</strong>? This action
            cannot be undone.
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDeleteCancel}
              disabled={actionLoading === `delete-${sequenceToDelete.id}`}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteConfirm}
              disabled={actionLoading === `delete-${sequenceToDelete.id}`}
            >
              {actionLoading === `delete-${sequenceToDelete.id}` ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Yes, Delete"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Reset Confirmation Modal
  const ResetConfirmationModal = () => {
    if (!showResetModal || !sequenceToReset) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4">Reset Sequence Number</h3>
          <div className="text-gray-600 mb-4">
            Reset sequence <strong>{sequenceToReset.sequence_code}</strong> to:
          </div>
          <div className="mb-6">
            <Label
              htmlFor="resetNumber"
              className="text-sm font-medium mb-2 block"
            >
              New Starting Number
            </Label>
            <Input
              id="resetNumber"
              type="number"
              min="1"
              value={resetNumber}
              onChange={(e) => setResetNumber(e.target.value)}
              placeholder="1"
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleResetCancel}
              disabled={actionLoading === `reset-${sequenceToReset.id}`}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              onClick={handleResetConfirm}
              disabled={actionLoading === `reset-${sequenceToReset.id}`}
            >
              {actionLoading === `reset-${sequenceToReset.id}` ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Number"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <Card className="bg-white border shadow-sm rounded-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Hash className="h-6 w-6 text-blue-600" />
                  </div>
                  Numbering Sequences
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  Manage automatic numbering for documents with template variables
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateNew}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sequence
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fetchSequences()}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search sequences..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Sequences Table */}
        <Card className="bg-white border shadow-sm rounded-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading sequences...</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-12 text-center font-semibold text-gray-900">
                      No
                    </TableHead>
                    <TableHead className="w-32 font-semibold text-gray-900">
                      Sequence Code
                    </TableHead>
                    <TableHead className="min-w-32 font-semibold text-gray-900">
                      Prefix Template
                    </TableHead>
                    <TableHead className="min-w-32 font-semibold text-gray-900">
                      Next Number
                    </TableHead>
                    <TableHead className="min-w-48 font-semibold text-gray-900">
                      Format Preview
                    </TableHead>
                    <TableHead className="min-w-48 font-semibold text-gray-900">
                      Description
                    </TableHead>
                    <TableHead className="min-w-40 font-semibold text-gray-900">
                      Last Updated
                    </TableHead>
                    <TableHead className="w-32 text-center font-semibold text-gray-900">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sequences.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <FileDigit className="h-12 w-12 text-gray-300" />
                          <p className="text-gray-500">No numbering sequences found</p>
                          <Button 
                            onClick={handleCreateNew}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Sequence
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sequences.map((sequence, index) => (
                      <TableRow
                        key={sequence.id}
                        className="hover:bg-gray-50/50"
                      >
                        <TableCell className="text-center text-gray-600 font-medium w-12">
                          {index + 1}
                        </TableCell>

                        <TableCell>
                          <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">
                            {sequence.sequence_code}
                          </span>
                        </TableCell>

                        <TableCell>
                          {sequence.prefix ? (
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                              {sequence.prefix}
                            </code>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            {sequence.next_number}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {formatPreview(sequence)}
                          </span>
                        </TableCell>

                        <TableCell>
                          {sequence.description ? (
                            <span className="text-gray-600 text-sm">
                              {sequence.description}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <span className="text-gray-500 text-sm">
                            {new Date(sequence.updated_at).toLocaleDateString(
                              "id-ID"
                            )}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Button
                              onClick={() => handleEdit(sequence)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50"
                              title="Edit"
                              disabled={actionLoading !== null}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleResetClick(sequence)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-gray-300 hover:bg-orange-50 text-orange-600"
                              title="Reset Number"
                              disabled={actionLoading !== null}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteClick(sequence)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-gray-300 hover:bg-red-50 text-red-600"
                              title="Delete"
                              disabled={actionLoading !== null}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Sequence Form */}
        {showForm && (
          <Card className="bg-white border shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {editingSequence ? "Edit Sequence" : "Add New Sequence"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sequence Code */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="sequence_code"
                      className="text-sm font-medium"
                    >
                      Sequence Code *
                    </Label>
                    <Input
                      id="sequence_code"
                      value={formData.sequence_code}
                      onChange={(e) =>
                        updateFormField(
                          "sequence_code",
                          e.target.value.toUpperCase()
                        )
                      }
                      placeholder="SO, PO, INV, etc"
                      disabled={!!editingSequence || submitting}
                      className="flex-1 uppercase"
                    />
                    {editingSequence && (
                      <p className="text-xs text-gray-500 mt-1">
                        Sequence code cannot be changed
                      </p>
                    )}
                  </div>

                  {/* Next Number */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="next_number"
                      className="text-sm font-medium"
                    >
                      Next Number
                    </Label>
                    <Input
                      id="next_number"
                      type="number"
                      min="1"
                      value={formData.next_number}
                      onChange={(e) =>
                        updateFormField("next_number", e.target.value)
                      }
                      placeholder="1"
                      disabled={submitting}
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2 space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium"
                    >
                      Description
                    </Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        updateFormField("description", e.target.value)
                      }
                      placeholder="Description for this sequence..."
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Template Section */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">
                    Template Format
                  </Label>
                  
                  {/* Quick Template Selector */}
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">
                      Quick Templates:
                    </Label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      disabled={submitting}
                    >
                      {templateOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} - {option.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Template Builder Toggle */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-gray-600">
                      Or build your own template:
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTemplateBuilder(!showTemplateBuilder)}
                      disabled={submitting}
                    >
                      {showTemplateBuilder ? 'Hide Builder' : 'Show Template Builder'}
                    </Button>
                  </div>

                  {/* Template Builder */}
                  {showTemplateBuilder && (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-sm font-medium">
                          Template Builder
                        </Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addCustomText}
                            disabled={submitting}
                          >
                            Add Text
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={removeLastPart}
                            disabled={submitting || templateParts.length === 0}
                          >
                            Remove Last
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={clearTemplateBuilder}
                            disabled={submitting}
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>

                      {/* Current Template Preview */}
                      <div className="mb-4 p-3 bg-white rounded border">
                        <Label className="text-sm font-medium mb-2 block">
                          Current Template:
                        </Label>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                          {formData.prefix || '(empty)'}
                        </code>
                      </div>

                      {/* Variable Categories */}
                      <div className="space-y-4">
                        {variableCategories.map((category) => (
                          <div key={category.name} className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                              <category.icon className="h-4 w-4" />
                              {category.name}
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {category.variables.map((variable) => (
                                <Button
                                  key={variable.code}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addVariableToTemplate(variable.code)}
                                  disabled={submitting}
                                  className="justify-start h-auto py-2 px-3 text-left"
                                >
                                  <div>
                                    <div className="font-mono text-xs bg-blue-100 text-blue-700 px-1 rounded">
                                      {variable.code}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {variable.name}
                                    </div>
                                  </div>
                                </Button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manual Input */}
                  {!showTemplateBuilder && (
                    <div className="space-y-2">
                      <Label htmlFor="prefix" className="text-sm font-medium">
                        Manual Template Input:
                      </Label>
                      <Input
                        id="prefix"
                        value={formData.prefix}
                        onChange={(e) =>
                          updateFormField("prefix", e.target.value)
                        }
                        placeholder="{customer_code}/{project_code}/{company_code}/{sales_rep}/"
                        disabled={submitting}
                      />
                      <p className="text-xs text-gray-500">
                        Use variables like {'{customer_code}'}, {'{project_code}'}, {'{company_code}'}, etc.
                      </p>
                    </div>
                  )}
                </div>

                {/* Preview */}
                {formData.sequence_code && formData.prefix && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <Label className="text-sm font-medium mb-2 block">
                      Format Preview:
                    </Label>
                    <div className="font-mono text-lg bg-white px-3 py-2 rounded border">
                      {formatPreview({
                        ...formData,
                        next_number: parseInt(formData.next_number || "1")
                      } as NumberingSequence)}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Preview uses example values. Actual values will be replaced dynamically when generating numbers.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={submitForm}
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingSequence ? "Updating..." : "Creating..."}
                      </>
                    ) : editingSequence ? (
                      "Update Sequence"
                    ) : (
                      "Create Sequence"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={closeForm}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal />

        {/* Reset Confirmation Modal */}
        <ResetConfirmationModal />
      </div>
    </div>
  );
}