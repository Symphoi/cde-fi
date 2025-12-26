"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Edit, Trash2, RefreshCw, Building, Check, X, Loader2, ChevronLeft, ChevronRight, Sparkles, Image as ImageIcon, Upload, XCircle } from 'lucide-react'
import { toast } from 'sonner'

// Types
interface Company {
  id: number
  company_code: string
  name: string
  description?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  phone?: string
  email?: string
  website?: string
  tax_id?: string
  logo_url?: string
  status: 'active' | 'inactive'
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CompanyFormData {
  company_code: string
  name: string
  description: string
  address: string
  city: string
  state: string
  postal_code: string
  country: string
  phone: string
  email: string
  website: string
  tax_id: string
}

interface LogoFile {
  file: File | null
  preview: string | null
  uploaded: boolean
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// API Service
class CompanyService {
  private static async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Session expired. Please login again.');
      window.location.href = '/login';
      throw new Error('No authentication token');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    return this.handleResponse(response);
  }

  private static async handleResponse(response: Response) {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('text/html')) {
      const text = await response.text();
      console.error('HTML Response received:', text.substring(0, 500));
      
      if (response.status === 401) {
        toast.error('Session expired. Please login again.');
        window.location.href = '/login';
        throw new Error('Unauthorized - Please login again');
      }
      
      if (response.status === 404) {
        throw new Error('API endpoint not found. Please check the URL.');
      }
      
      throw new Error(`Server error: Received HTML instead of JSON (Status: ${response.status})`);
    }
    
    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      } catch (jsonError) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }
    }
    
    return response.json();
  }

  // Get all companies with pagination
  static async getCompanies(filters: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    params.append('page', String(filters.page || 1));
    params.append('limit', String(filters.limit || 10));

    return this.fetchWithAuth(`/api/companies?${params}`);
  }

  // Create company (with logo)
  static async createCompany(formData: FormData): Promise<{success: boolean; message: string; data?: any}> {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Session expired. Please login again.');
      window.location.href = '/login';
      throw new Error('No authentication token');
    }

    const response = await fetch('/api/companies', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    });

    return this.handleResponse(response);
  }

  // Update company (with logo)
  static async updateCompany(formData: FormData): Promise<{success: boolean; message: string; data?: any}> {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Session expired. Please login again.');
      window.location.href = '/login';
      throw new Error('No authentication token');
    }

    const response = await fetch('/api/companies', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    });

    return this.handleResponse(response);
  }

  // Delete company
  static async deleteCompany(id: number): Promise<{success: boolean; message: string}> {
    return this.fetchWithAuth(`/api/companies?id=${id}`, {
      method: 'DELETE'
    });
  }

  // Generate company code
  static async generateCompanyCode(): Promise<{success: boolean; data: {code: string}}> {
    return this.fetchWithAuth('/api/companies/generate-code');
  }

  // Upload logo only
  static async uploadLogo(companyId: number, file: File): Promise<{success: boolean; message: string}> {
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('id', companyId.toString());

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Session expired. Please login again.');
      window.location.href = '/login';
      throw new Error('No authentication token');
    }

    const response = await fetch('/api/companies/logo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    });

    return this.handleResponse(response);
  }

  // Delete logo
  static async deleteLogo(companyId: number): Promise<{success: boolean; message: string}> {
    return this.fetchWithAuth(`/api/companies/logo?id=${companyId}`, {
      method: 'DELETE'
    });
  }
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  
  // Logo state
  const [logoFile, setLogoFile] = useState<LogoFile>({
    file: null,
    preview: null,
    uploaded: false
  })
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  // Form state
  const [showForm, setShowForm] = useState<boolean>(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [formData, setFormData] = useState<CompanyFormData>({
    company_code: '',
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Indonesia',
    phone: '',
    email: '',
    website: '',
    tax_id: ''
  })

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)

  // Fetch data dengan pagination
  const fetchCompanies = async (page: number = pagination.page) => {
    try {
      setLoading(true)
      const response = await CompanyService.getCompanies({
        search: searchTerm,
        status: statusFilter,
        page: page,
        limit: pagination.limit
      })

      if (response.success) {
        setCompanies(response.data)
        setPagination(response.pagination)
      }
    } catch (error: any) {
      console.error('Error fetching companies:', error)
      toast.error(error.message || 'Failed to load companies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies(1)
  }, [searchTerm, statusFilter])

  // Generate unique company code
  const generateCompanyCode = async () => {
    try {
      const response = await CompanyService.generateCompanyCode()
      if (response.success && response.data) {
        setFormData(prev => ({ ...prev, company_code: response.data.code }))
        toast.success('Company code generated successfully')
      }
    } catch (error: any) {
      console.error('Error generating company code:', error)
      // Fallback manual generation
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const companyCode = `COMP${randomSuffix}`;
      setFormData(prev => ({ ...prev, company_code: companyCode }))
      toast.success('Company code generated successfully')
    }
  }

  // Logo handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an image file (JPEG, PNG, GIF, WebP)')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size too large. Maximum 5MB allowed.')
      return
    }

    const preview = URL.createObjectURL(file)
    setLogoFile({
      file,
      preview,
      uploaded: false
    })
  }

  const removeLogo = () => {
    if (logoFile.preview) {
      URL.revokeObjectURL(logoFile.preview)
    }
    setLogoFile({
      file: null,
      preview: null,
      uploaded: false
    })
  }

  // Input validation functions
  const validateEmail = (email: string): boolean => {
    if (!email) return true // Empty email is allowed
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true // Empty phone is allowed
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,20}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  const validateWebsite = (website: string): boolean => {
    if (!website) return true // Empty website is allowed
    try {
      new URL(website);
      return true;
    } catch {
      return false;
    }
  }

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchCompanies(newPage)
    }
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }))
    setTimeout(() => fetchCompanies(1), 0)
  }

  // Form handlers
  const handleCreateNew = () => {
    setEditingCompany(null)
    setFormData({
      company_code: '',
      name: '',
      description: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'Indonesia',
      phone: '',
      email: '',
      website: '',
      tax_id: ''
    })
    setLogoFile({
      file: null,
      preview: null,
      uploaded: false
    })
    setShowForm(true)
  }

  const handleEdit = (company: Company) => {
    setEditingCompany(company)
    setFormData({
      company_code: company.company_code,
      name: company.name,
      description: company.description || '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      postal_code: company.postal_code || '',
      country: company.country || 'Indonesia',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
      tax_id: company.tax_id || ''
    })
    // Set logo preview if exists
    if (company.logo_url) {
      setLogoFile({
        file: null,
        preview: company.logo_url,
        uploaded: true
      })
    } else {
      setLogoFile({
        file: null,
        preview: null,
        uploaded: false
      })
    }
    setShowForm(true)
  }

  const updateFormField = (field: keyof CompanyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const submitForm = async () => {
    // Required field validation
    if (!formData.company_code.trim()) {
      toast.error('Company code is required')
      return
    }
    if (!formData.name.trim()) {
      toast.error('Company name is required')
      return
    }

    if (!formData.tax_id.trim()) {
      toast.error('Company name is required')
      return
    }
    // Format validation
    if (formData.email && !validateEmail(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      toast.error('Please enter a valid phone number')
      return
    }

    if (formData.website && !validateWebsite(formData.website)) {
      toast.error('Please enter a valid website URL')
      return
    }

    try {
      setSubmitting(true)
      
      // Create FormData object
      const formDataObj = new FormData();
      
      // Add company data
      formDataObj.append('data', JSON.stringify({
        ...formData,
        id: editingCompany?.id || 0,
        status: editingCompany?.status || 'active'
      }));
      
      // Add logo file if selected
      if (logoFile.file) {
        formDataObj.append('logo', logoFile.file);
      }

      let result;
      if (editingCompany) {
        result = await CompanyService.updateCompany(formDataObj);
        toast.success(result.message || 'Company updated successfully');
      } else {
        result = await CompanyService.createCompany(formDataObj);
        toast.success(result.message || 'Company created successfully');
      }

      setShowForm(false);
      setEditingCompany(null);
      setLogoFile({
        file: null,
        preview: null,
        uploaded: false
      });
      await fetchCompanies();
    } catch (error: any) {
      console.error('Error saving company:', error);
      toast.error(error.message || 'Failed to save company');
    } finally {
      setSubmitting(false);
    }
  }

  const closeForm = () => {
    setShowForm(false);
    setEditingCompany(null);
    setSubmitting(false);
    // Clean up logo preview URL
    if (logoFile.preview && !logoFile.uploaded) {
      URL.revokeObjectURL(logoFile.preview);
    }
    setLogoFile({
      file: null,
      preview: null,
      uploaded: false
    });
  }

  const handleDeleteClick = (company: Company) => {
    setCompanyToDelete(company);
    setShowDeleteModal(true);
  }

  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;

    try {
      setActionLoading(companyToDelete.company_code);
      const result = await CompanyService.deleteCompany(companyToDelete.id);
      toast.success(result.message || 'Company deleted successfully');
      setShowDeleteModal(false);
      setCompanyToDelete(null);
      await fetchCompanies();
    } catch (error: any) {
      console.error('Error deleting company:', error);
      toast.error(error.message || 'Failed to delete company');
    } finally {
      setActionLoading(null);
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setCompanyToDelete(null);
  }

  const toggleStatus = async (company: Company) => {
    try {
      setActionLoading(company.company_code);
      const newStatus = company.status === 'active' ? 'inactive' : 'active';
      
      // Create form data for update
      const formDataObj = new FormData();
      formDataObj.append('data', JSON.stringify({
        company_code: company.company_code,
        name: company.name,
        description: company.description || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '',
        postal_code: company.postal_code || '',
        country: company.country || 'Indonesia',
        phone: company.phone || '',
        email: company.email || '',
        website: company.website || '',
        tax_id: company.tax_id || '',
        id: company.id,
        status: newStatus
      }));

      await CompanyService.updateCompany(formDataObj);
      toast.success(`Company ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      await fetchCompanies();
    } catch (error: any) {
      console.error('Error updating company status:', error);
      toast.error(error.message || 'Failed to update company status');
    } finally {
      setActionLoading(null);
    }
  }

  // Status badge
  const getStatusBadge = (status: 'active' | 'inactive') => {
    return status === 'active' ? (
      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
        <Check className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 text-xs">
        <X className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    )
  }

  // Logo preview component
  const LogoPreview = () => {
    if (logoFile.preview) {
      return (
        <div className="relative">
          <img 
            src={logoFile.preview} 
            alt="Logo preview" 
            className="w-32 h-32 object-contain border rounded-md"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
            onClick={removeLogo}
          >
            <XCircle className="h-4 w-4" />
          </Button>
          <p className="text-xs text-gray-500 mt-1">
            Click remove to change logo
          </p>
        </div>
      );
    }

    return (
      <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
        <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600 mb-2">Upload company logo</p>
        <p className="text-xs text-gray-500 mb-3">
          PNG, JPG, GIF up to 5MB
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('logo-upload')?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Select Image
        </Button>
      </div>
    );
  };

  // Pagination component
  const PaginationControls = () => (
    <div className="flex items-center justify-between px-6 py-4 border-t">
      <div className="text-sm text-gray-600">
        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
        {pagination.total} companies
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rows per page:</span>
          <select
            value={pagination.limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
            disabled={loading}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1 || loading}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm text-gray-600 min-w-[80px] text-center">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages || loading}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Delete Confirmation Modal
  const DeleteConfirmationModal = () => {
    if (!showDeleteModal || !companyToDelete) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
          <div className="text-gray-600 mb-6">
            Are you sure you want to delete company <strong>{companyToDelete.name}</strong> ({companyToDelete.company_code})?
            This action cannot be undone.
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleDeleteCancel}
              disabled={actionLoading === companyToDelete.company_code}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteConfirm}
              disabled={actionLoading === companyToDelete.company_code}
            >
              {actionLoading === companyToDelete.company_code ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Yes, Delete'
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
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                  Companies
                </CardTitle>
                <p className="text-gray-600 mt-2">Manage your company profiles</p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateNew} 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => fetchCompanies()}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
                disabled={loading}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </CardHeader>
        </Card>

        {/* Companies Table */}
        <Card className="bg-white border shadow-sm rounded-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading companies...</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-12 text-center font-semibold text-gray-900">No</TableHead>
                      <TableHead className="w-24 text-center font-semibold text-gray-900">Logo</TableHead>
                      <TableHead className="w-32 font-semibold text-gray-900">Company Code</TableHead>
                      <TableHead className="min-w-40 font-semibold text-gray-900">Name</TableHead>
                      <TableHead className="min-w-48 font-semibold text-gray-900">Email</TableHead>
                      <TableHead className="min-w-32 font-semibold text-gray-900">Phone</TableHead>
                      <TableHead className="min-w-40 font-semibold text-gray-900">Tax ID</TableHead>
                      <TableHead className="w-24 text-center font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="w-28 text-center font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <Building className="h-12 w-12 mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">
                              {searchTerm || statusFilter ? 'No companies found' : 'No companies yet'}
                            </p>
                            <p className="text-sm text-gray-400 mb-4">
                              {searchTerm || statusFilter ? 'Try adjusting your search terms' : 'Get started by adding your first company'}
                            </p>
                            <Button onClick={handleCreateNew} size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Company
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      companies.map((company, index) => (
                        <TableRow key={company.id} className="hover:bg-gray-50/50">
                          <TableCell className="text-center text-gray-600 font-medium">
                            {(pagination.page - 1) * pagination.limit + index + 1}
                          </TableCell>
                          <TableCell className="text-center">
                            {company.logo_url ? (
                              <img 
                                src={company.logo_url} 
                                alt={`${company.name} logo`}
                                className="h-8 w-8 object-contain mx-auto rounded"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/default-logo.png'
                                }}
                              />
                            ) : (
                              <div className="h-8 w-8 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                                <Building className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">
                              {company.company_code}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-gray-900 max-w-[160px] truncate">
                            {company.name}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {company.email ? (
                              <span className="text-gray-600 text-sm">{company.email}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {company.phone ? (
                              <span className="text-gray-600 text-sm">{company.phone}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[160px] truncate">
                            {company.tax_id ? (
                              <span className="text-gray-600 text-sm">{company.tax_id}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(company.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-1 justify-center">
                              <Button
                                onClick={() => handleEdit(company)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50"
                                title="Edit"
                                disabled={actionLoading !== null}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => toggleStatus(company)}
                                size="sm"
                                variant="outline"
                                className={`h-8 w-8 p-0 border-gray-300 hover:bg-gray-50 ${
                                  company.status === 'active' ? 'text-orange-600' : 'text-green-600'
                                }`}
                                title={company.status === 'active' ? 'Deactivate' : 'Activate'}
                                disabled={actionLoading === company.company_code}
                              >
                                {actionLoading === company.company_code ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : company.status === 'active' ? (
                                  <X className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                onClick={() => handleDeleteClick(company)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-red-50 text-red-600"
                                title="Delete"
                                disabled={actionLoading === company.company_code}
                              >
                                {actionLoading === company.company_code ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                
                {/* Pagination Controls */}
                {companies.length > 0 && <PaginationControls />}
              </>
            )}
          </CardContent>
        </Card>

        {/* Company Form */}
        {showForm && (
          <Card className="bg-white border shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {editingCompany ? 'Edit Company' : 'Add New Company'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Hidden file input for logo */}
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />

                {/* Logo Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Company Logo
                  </Label>
                  <LogoPreview />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company Code */}
                  <div className="space-y-2">
                    <Label htmlFor="company_code" className="text-sm font-medium">
                      Company Code *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="company_code"
                        value={formData.company_code}
                        onChange={(e) => updateFormField('company_code', e.target.value.toUpperCase())}
                        placeholder="COMP001"
                        disabled={!!editingCompany || submitting}
                        className="flex-1"
                      />
                      {!editingCompany && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={generateCompanyCode}
                          disabled={submitting}
                          className="whitespace-nowrap"
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          Generate
                        </Button>
                      )}
                    </div>
                    {editingCompany && (
                      <p className="text-xs text-gray-500 mt-1">
                        Company code cannot be changed
                      </p>
                    )}
                  </div>

                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Company Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateFormField('name', e.target.value)}
                      placeholder="PT Example Company"
                      disabled={submitting}
                    />
                  </div>

                  {/* Tax ID */}
                  <div className="space-y-2">
                    <Label htmlFor="tax_id" className="text-sm font-medium">
                      Tax ID * 
                    </Label>
                    <Input
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) => updateFormField('tax_id', e.target.value)}
                      placeholder="12.345.678.9-012.345"
                      disabled={submitting}
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateFormField('phone', e.target.value)}
                      placeholder="+62 812-3456-7890"
                      disabled={submitting}
                      className={formData.phone && !validatePhone(formData.phone) ? 'border-red-500' : ''}
                    />
                    {formData.phone && !validatePhone(formData.phone) && (
                      <p className="text-xs text-red-500">Please enter a valid phone number</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormField('email', e.target.value)}
                      placeholder="company@example.com"
                      disabled={submitting}
                      className={formData.email && !validateEmail(formData.email) ? 'border-red-500' : ''}
                    />
                    {formData.email && !validateEmail(formData.email) && (
                      <p className="text-xs text-red-500">Please enter a valid email address</p>
                    )}
                  </div>

                  {/* Website */}
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-sm font-medium">
                      Website
                    </Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => updateFormField('website', e.target.value)}
                      placeholder="https://example.com"
                      disabled={submitting}
                      className={formData.website && !validateWebsite(formData.website) ? 'border-red-500' : ''}
                    />
                    {formData.website && !validateWebsite(formData.website) && (
                      <p className="text-xs text-red-500">Please enter a valid website URL</p>
                    )}
                  </div>

                  {/* Country */}
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-sm font-medium">
                      Country
                    </Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => updateFormField('country', e.target.value)}
                      placeholder="Indonesia"
                      disabled={submitting}
                    />
                  </div>

                  {/* City */}
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium">
                      City
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateFormField('city', e.target.value)}
                      placeholder="Jakarta"
                      disabled={submitting}
                    />
                  </div>

                  {/* State */}
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm font-medium">
                      State/Province
                    </Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => updateFormField('state', e.target.value)}
                      placeholder="DKI Jakarta"
                      disabled={submitting}
                    />
                  </div>

                  {/* Postal Code */}
                  <div className="space-y-2">
                    <Label htmlFor="postal_code" className="text-sm font-medium">
                      Postal Code
                    </Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => updateFormField('postal_code', e.target.value)}
                      placeholder="12345"
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">
                    Address
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateFormField('address', e.target.value)}
                    placeholder="Street address"
                    rows={2}
                    disabled={submitting}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormField('description', e.target.value)}
                    placeholder="Company description..."
                    rows={3}
                    disabled={submitting}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={submitForm} 
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingCompany ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingCompany ? 'Update Company' : 'Create Company'
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
      </div>
    </div>
  )
}