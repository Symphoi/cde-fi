"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Edit, Trash2, RefreshCw, Folder, Calendar, DollarSign, Building, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Types
interface Company {
  company_code: string
  name: string
  legal_name?: string
  description?: string
}

interface Project {
  id: number
  project_code: string
  name: string
  description: string
  client_name: string
  company_code: string
  company_name: string
  start_date: string | null
  end_date: string | null
  budget: number | null
  status: 'active' | 'completed' | 'on_hold' | 'cancelled'
  created_at: string
  updated_at: string
}

interface ProjectFormData {
  project_code: string
  name: string
  description: string
  client_name: string
  company_code: string
  start_date: string
  end_date: string
  budget: string
  status: 'active' | 'completed' | 'on_hold' | 'cancelled'
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// API Service
class ProjectService {
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

  // Get all projects with pagination
  static async getProjects(filters: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    params.append('page', String(filters.page || 1));
    params.append('limit', String(filters.limit || 10));

    return this.fetchWithAuth(`/api/projects?${params}`);
  }

  // Create project
  static async createProject(data: ProjectFormData) {
    return this.fetchWithAuth('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        client_name: data.client_name,
        company_code: data.company_code,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        budget: data.budget ? parseFloat(data.budget) : null
      })
    });
  }

  // Update project
  static async updateProject(data: ProjectFormData) {
    return this.fetchWithAuth('/api/projects', {
      method: 'PUT',
      body: JSON.stringify({
        project_code: data.project_code,
        name: data.name,
        description: data.description,
        client_name: data.client_name,
        company_code: data.company_code,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        budget: data.budget ? parseFloat(data.budget) : null,
        status: data.status
      })
    });
  }

  // Delete project
  static async deleteProject(project_code: string) {
    return this.fetchWithAuth(`/api/projects?project_code=${project_code}`, {
      method: 'DELETE'
    });
  }
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState<ProjectFormData>({
    project_code: '',
    name: '',
    description: '',
    client_name: '',
    company_code: '',
    start_date: '',
    end_date: '',
    budget: '',
    status: 'active'
  })

  // Fetch companies
  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/companies', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCompanies(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  }

  // Fetch data dengan pagination
  const fetchProjects = async (page: number = pagination.page) => {
    try {
      setLoading(true)
      const response = await ProjectService.getProjects({
        search: searchTerm,
        status: statusFilter,
        page: page,
        limit: pagination.limit
      })

      if (response.success) {
        setProjects(response.data)
        setPagination(response.pagination)
      }
    } catch (error: any) {
      console.error('Error fetching projects:', error)
      toast.error(error.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects(1)
    fetchCompanies()
  }, [searchTerm, statusFilter])

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchProjects(newPage)
    }
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }))
    setTimeout(() => fetchProjects(1), 0)
  }

  // Form handlers
  const handleCreateNew = () => {
    setEditingProject(null)
    setFormData({
      project_code: '',
      name: '',
      description: '',
      client_name: '',
      company_code: '',
      start_date: '',
      end_date: '',
      budget: '',
      status: 'active'
    })
    setShowForm(true)
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({
      project_code: project.project_code,
      name: project.name,
      description: project.description || '',
      client_name: project.client_name || '',
      company_code: project.company_code || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      budget: project.budget ? project.budget.toString() : '',
      status: project.status
    })
    setShowForm(true)
  }

  const updateFormField = (field: keyof ProjectFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const submitForm = async () => {
    if (!formData.name.trim()) {
      toast.error('Project name is required')
      return
    }

    try {
      setSubmitting(true)
      
      if (editingProject) {
        const result = await ProjectService.updateProject(formData)
        toast.success(result.message || 'Project updated successfully')
      } else {
        const result = await ProjectService.createProject(formData)
        toast.success(result.message || 'Project created successfully')
      }

      setShowForm(false)
      setEditingProject(null)
      await fetchProjects()
    } catch (error: any) {
      console.error('Error saving project:', error)
      toast.error(error.message || 'Failed to save project')
    } finally {
      setSubmitting(false)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingProject(null)
    setSubmitting(false)
  }

  const handleDelete = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"?`)) {
      return
    }

    try {
      setLoading(true)
      const result = await ProjectService.deleteProject(project.project_code)
      toast.success(result.message || 'Project deleted successfully')
      fetchProjects()
    } catch (error: any) {
      console.error('Error deleting project:', error)
      toast.error(error.message || 'Failed to delete project')
    } finally {
      setLoading(false)
    }
  }

  // Status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', color: 'bg-green-100 text-green-800 border-green-200' },
      completed: { label: 'Completed', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      on_hold: { label: 'On Hold', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'bg-gray-100 text-gray-800 border-gray-200' }

    return (
      <Badge className={`${config.color} text-xs`}>
        {config.label}
      </Badge>
    )
  }

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Format date
  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('id-ID')
  }

  // Pagination component
  const PaginationControls = () => (
    <div className="flex items-center justify-between px-6 py-4 border-t">
      <div className="text-sm text-gray-600">
        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
        {pagination.total} entries
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rows per page:</span>
          <select
            value={pagination.limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
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
            disabled={pagination.page === 1}
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
            disabled={pagination.page === pagination.totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <Card className="bg-white border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Folder className="h-6 w-6 text-blue-600" />
                  </div>
                  Projects
                </CardTitle>
                <p className="text-gray-600 mt-2">Manage your projects</p>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => fetchProjects()}
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
                  placeholder="Search project code, name, client, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </CardHeader>
        </Card>

        {/* Projects Table */}
        <Card className="bg-white border shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading projects...</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-16 text-center">No</TableHead>
                      <TableHead>Project Code</TableHead>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <Folder className="h-12 w-12 mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">No projects found</p>
                            <Button onClick={handleCreateNew} size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Project
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      projects.map((project, index) => (
                        <TableRow key={project.id} className="hover:bg-gray-50/50">
                          <TableCell className="text-center font-medium">
                            {(pagination.page - 1) * pagination.limit + index + 1}
                          </TableCell>
                          <TableCell className="font-semibold text-blue-600">
                            {project.project_code}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div>
                              <div>{project.name}</div>
                              {project.description && (
                                <div className="text-sm text-gray-500 line-clamp-2 max-w-xs">
                                  {project.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {project.client_name || '-'}
                          </TableCell>
                          <TableCell>
                            {project.company_name || '-'}
                          </TableCell>
                          <TableCell>
                            {formatDate(project.start_date)}
                          </TableCell>
                          <TableCell>
                            {formatDate(project.end_date)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(project.budget)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(project.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-1 justify-center">
                              <Button
                                onClick={() => handleEdit(project)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50"
                                title="Edit"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => handleDelete(project)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 border-gray-300 hover:bg-gray-50"
                                title="Delete"
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
                
                {/* Pagination Controls */}
                {projects.length > 0 && <PaginationControls />}
              </>
            )}
          </CardContent>
        </Card>

        {/* Project Form - Below Table (Non Modal) */}
        {showForm && (
          <Card className="bg-white border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editingProject && (
                    <div className="space-y-2">
                      <Label htmlFor="project_code" className="text-sm font-medium">
                        Project Code
                      </Label>
                      <Input
                        id="project_code"
                        value={formData.project_code}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500">
                        Project code cannot be changed
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Project Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateFormField('name', e.target.value)}
                      placeholder="Website Development"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormField('description', e.target.value)}
                    placeholder="Project description and objectives..."
                    rows={3}
                    disabled={submitting}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_name" className="text-sm font-medium">
                      Client Name
                    </Label>
                    <Input
                      id="client_name"
                      value={formData.client_name}
                      onChange={(e) => updateFormField('client_name', e.target.value)}
                      placeholder="Client Company Name"
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_code" className="text-sm font-medium">
                      Company
                    </Label>
                    <select
                      id="company_code"
                      value={formData.company_code}
                      onChange={(e) => updateFormField('company_code', e.target.value)}
                      disabled={submitting}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select Company</option>
                      {companies.map(company => (
                        <option key={company.company_code} value={company.company_code}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date" className="text-sm font-medium">
                      Start Date
                    </Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => updateFormField('start_date', e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date" className="text-sm font-medium">
                      End Date
                    </Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => updateFormField('end_date', e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget" className="text-sm font-medium">
                      Budget
                    </Label>
                    <Input
                      id="budget"
                      type="number"
                      value={formData.budget}
                      onChange={(e) => updateFormField('budget', e.target.value)}
                      placeholder="0"
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium">
                      Status
                    </Label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => updateFormField('status', e.target.value as any)}
                      disabled={submitting}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
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
                        {editingProject ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingProject ? 'Update Project' : 'Create Project'
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
      </div>
    </div>
  )
}