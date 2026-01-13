// app/approval/page.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, CheckCircle, XCircle, FileText, ChevronLeft, ChevronRight, 
  Download, RefreshCw, UserCheck, Users, Phone, MapPin, Mail, Eye, 
  ExternalLink, FileIcon 
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

// Type definitions
interface PurchaseOrder {
  po_code: string
  so_code: string
  so_reference: string
  supplier_name: string
  supplier_contact: string
  supplier_bank: string
  total_amount: number
  status: 'submitted' | 'approved_spv' | 'approved_finance' | 'paid' | 'rejected'
  notes?: string
  date: string
  priority: 'low' | 'medium' | 'high'
  days_waiting: number
  customer_ref: string
  approval_level: 'spv' | 'finance'
  approved_by_spv?: string
  approved_by_finance?: string
  approved_date_spv?: string
  approved_date_finance?: string
  approval_notes?: string
  rejection_reason?: string
  created_at: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_address: string
  sales_rep: string
  sales_rep_email: string
  so_total_amount: number
  items_count: number
  items?: POItem[]
  documents?: Document[]
  is_split_po?: boolean
  original_so_quantity?: number
  split_sequence?: number
  attachment_url?: string
  attachment_filename?: string
  attachment_notes?: string
}

interface POItem {
  po_item_code: string
  product_name: string
  product_code: string
  quantity: number
  purchase_price: number
  notes: string
  so_unit_price: number
  margin: number
  margin_percentage: number
  unique_key: string
}

interface Document {
  id: string
  name: string
  type: string
  filename: string
  upload_date: string
  source: 'PO' | 'SO'
  document_type?: 'submission' | 'invoice' | 'proof' | 'other'
  notes?: string
  file_path?: string
}

export default function ApprovalPage() {
  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [poToAction, setPoToAction] = useState<PurchaseOrder | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [approvalNote, setApprovalNote] = useState('')
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null)
  const [previewingDocId, setPreviewingDocId] = useState<string | null>(null)

  const itemsPerPage = 8

  // Fetch data dari API
  useEffect(() => {
    fetchApprovalData()
  }, [])

  const fetchApprovalData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/approval-transactions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('📥 API Response:', data)
        if (data.success) {
          setPurchaseOrders(data.data)
        }
      } else {
        console.error('Failed to fetch approval data')
        showNotification('Gagal memuat data approval', 'error')
      }
    } catch (error) {
      console.error('Error fetching approval data:', error)
      showNotification('Error loading approval data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Fetch PO detail
  const fetchPODetail = async (po_code: string) => {
    try {
      const token = localStorage.getItem('token')
      
      console.log('🔍 Fetching PO detail for:', po_code)
      
      const response = await fetch(`/api/approval-transactions?po_code=${po_code}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('📦 PO Detail Response:', data)
        
        if (data.success) {
          // Log dokumen yang diterima
          console.log('📄 Documents in response:', data.data.documents)
          
          return data.data
        }
      } else {
        console.error('Failed to fetch PO detail:', response.status)
      }
      return null
    } catch (error) {
      console.error('Error fetching PO detail:', error)
      return null
    }
  }

  // Filter POs
  const filteredPOs = purchaseOrders.filter(po => {
    const searchLower = searchTerm.toLowerCase()
    return (
      po.po_code.toLowerCase().includes(searchLower) ||
      po.supplier_name.toLowerCase().includes(searchLower) ||
      po.so_reference.toLowerCase().includes(searchLower) ||
      po.customer_name.toLowerCase().includes(searchLower)
    )
  })

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredPOs.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredPOs.length / itemsPerPage)

  // Handler untuk row click
  const handleRowClick = async (po: PurchaseOrder) => {
    if (selectedPO && selectedPO.po_code === po.po_code) {
      setSelectedPO(null)
    } else {
      setIsRefreshing(true)
      const poDetail = await fetchPODetail(po.po_code)
      if (poDetail) {
        setSelectedPO(poDetail)
      }
      setIsRefreshing(false)
      setApprovalNote('')
    }
  }

  // Function untuk refresh detail PO
  const refreshPODetail = async () => {
    if (!selectedPO) return
    setIsRefreshing(true)
    const updatedPO = await fetchPODetail(selectedPO.po_code)
    if (updatedPO) setSelectedPO(updatedPO)
    setIsRefreshing(false)
  }

  // Handlers untuk modal backdrop
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowApproveModal(false)
      setShowRejectModal(false)
    }
  }

  // ======================================
  // PREVIEW & DOWNLOAD FUNCTIONS - VERSI DIPERBAIKI
  // ======================================



  // Preview PDF dari server
  const previewPDFFromServer = async (doc: Document) => {
    try {
      const token = localStorage.getItem('token')
      
      // Fetch file dari server
      const response = await fetch(`/api/documents/download?file_path=${encodeURIComponent(doc.file_path!)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        
        // Buka di tab baru
        const pdfWindow = window.open('', '_blank')
        if (pdfWindow) {
          pdfWindow.document.write(`
            <html>
            <head>
              <title>${doc.name}</title>
              <style>
                body { margin: 0; padding: 0; height: 100vh; }
                iframe { width: 100%; height: 100%; border: none; }
                .header { 
                  background: white; 
                  padding: 10px 20px; 
                  border-bottom: 1px solid #e5e7eb;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                }
                .title { font-weight: 600; font-size: 14px; }
                .close-btn { 
                  background: #ef4444; 
                  color: white; 
                  border: none; 
                  padding: 5px 10px; 
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="title">${doc.name}</div>
                <button class="close-btn" onclick="window.close()">Tutup</button>
              </div>
              <iframe src="${url}"></iframe>
            </body>
            </html>
          `)
        }
      } else {
        throw new Error('Failed to fetch file')
      }
    } catch (error) {
      console.error('PDF preview error:', error)
      throw error
    }
  }

  // Preview image dari server
  const previewImageFromServer = async (doc: Document) => {
    try {
      const token = localStorage.getItem('token')
      
      // Fetch image dari server
      const response = await fetch(`/api/documents/download?file_path=${encodeURIComponent(doc.file_path!)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        
        // Buka di tab baru
        const imageWindow = window.open('', '_blank')
        if (imageWindow) {
          imageWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${doc.name}</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 100vh;
                  background: #f5f5f5;
                }
                .image-container {
                  max-width: 90vw;
                  max-height: 90vh;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                  border-radius: 8px;
                  overflow: hidden;
                }
                img { 
                  width: 100%; 
                  height: auto; 
                  display: block;
                }
                .info {
                  position: fixed;
                  bottom: 20px;
                  left: 20px;
                  background: rgba(0,0,0,0.7);
                  color: white;
                  padding: 8px 12px;
                  border-radius: 4px;
                  font-family: Arial, sans-serif;
                  font-size: 12px;
                }
                .close-btn {
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  background: #ef4444;
                  color: white;
                  border: none;
                  padding: 8px 16px;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                }
              </style>
            </head>
            <body>
              <div class="image-container">
                <img src="${url}" alt="${doc.name}" />
              </div>
              <div class="info">
                ${doc.name} • ${new Date(doc.upload_date).toLocaleDateString('id-ID')}
              </div>
              <button class="close-btn" onclick="window.close()">Tutup Preview</button>
              <script>
                // Cleanup URL ketika window ditutup
                window.onbeforeunload = function() {
                  URL.revokeObjectURL("${url}");
                };
              </script>
            </body>
            </html>
          `)
        }
      }
    } catch (error) {
      console.error('Image preview error:', error)
      throw error
    }
  }

  // Preview khusus untuk PO submission
  const previewPOSubmission = async (doc: Document) => {
    try {
      const token = localStorage.getItem('token')
      
      console.log('📄 Getting PO PDF from API for:', selectedPO?.po_code)
      
      const response = await fetch(`/api/purchase-orders?endpoint=pdf&po_code=${selectedPO?.po_code}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('📦 PO PDF API response:', data)
        
        if (data.success && data.data.pdf_base64) {
          // Open PDF in new tab
          const pdfWindow = window.open('', '_blank')
          if (pdfWindow) {
            const base64String = data.data.pdf_base64.startsWith('data:') 
              ? data.data.pdf_base64 
              : `data:application/pdf;base64,${data.data.pdf_base64}`
            
            pdfWindow.document.write(`
              <html>
              <head>
                <title>${selectedPO?.po_code} - Document Preview</title>
                <style>
                  body { margin: 0; padding: 0; height: 100vh; }
                  iframe { width: 100%; height: 100%; border: none; }
                  .header { 
                    background: white; 
                    padding: 10px 20px; 
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                  }
                  .title { font-weight: 600; }
                  .close-btn { 
                    background: #ef4444; 
                    color: white; 
                    border: none; 
                    padding: 5px 10px; 
                    border-radius: 4px;
                    cursor: pointer;
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <div class="title">${doc.name} - ${selectedPO?.po_code}</div>
                  <button class="close-btn" onclick="window.close()">Tutup</button>
                </div>
                <iframe src="${base64String}"></iframe>
              </body>
              </html>
            `)
          }
        } else {
          console.warn('No PDF data in response')
          showNotification('Dokumen tidak tersedia untuk preview', 'warning')
        }
      } else {
        console.error('Failed to fetch PDF:', response.status)
        showNotification('Gagal mengambil dokumen', 'error')
      }
    } catch (error) {
      console.error('PO submission preview error:', error)
      throw error
    }
  }

  // Fungsi download document yang lebih sederhana// Di fungsi downloadDocument - perbaikan baris 556
const downloadDocument = async (doc: Document) => {
  try {
    setDownloadingDocId(doc.id);
    console.log('📥 Downloading:', doc.name);
    
    // PERBAIKAN: Validasi file_path
    if (!doc.file_path) {
      console.error('❌ File path is undefined:', doc);
      showNotification('❌ File tidak tersedia untuk diunduh', 'error');
      return;
    }
    
    const token = localStorage.getItem('token');
    
    // Pastikan file_path adalah string valid
    const filePath = String(doc.file_path).trim();
    if (!filePath) {
      throw new Error('Invalid file path');
    }
    
    console.log('📁 File path:', filePath);
    
    // OPTION 1: Coba dengan GET request (encode dengan benar)
    try {
      const encodedPath = encodeURIComponent(filePath);
      console.log('🔗 GET request to:', `/api/approval-transactions?file_path=${encodedPath}`);
      
      const response = await fetch(
        `/api/approval-transactions?file_path=${encodedPath}`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        }
      );
      
      console.log('📥 GET Response status:', response.status);
      
      if (response.ok) {
        // Get filename from response headers atau gunakan doc.name
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = doc.name || 'document';
        
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?(.+?)"?$/);
          if (match) filename = match[1];
        }
        
        const blob = await response.blob();
        
        if (blob.size === 0) {
          throw new Error('Empty file received');
        }
        
        // Create download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        showNotification(`✅ ${doc.name || 'File'} berhasil diunduh`, 'success');
        return;
      }
    } catch (getError) {
      console.log('GET method failed, trying POST:', getError);
    }
    
    // OPTION 2: Coba dengan POST request
    try {
      console.log('🔗 POST request dengan file_path:', filePath);
      
      const response = await fetch('/api/approval-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'download',
          file_path: filePath
        })
      });
      
      console.log('📥 POST Response status:', response.status);
      
      if (response.ok) {
        const blob = await response.blob();
        
        if (blob.size === 0) {
          throw new Error('Empty file received from POST');
        }
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.name || 'document';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        showNotification(`✅ ${doc.name || 'File'} berhasil diunduh (via POST)`, 'success');
        return;
      }
    } catch (postError) {
      console.log('POST method failed:', postError);
    }
    
    // OPTION 3: Coba buka langsung jika itu URL yang valid
    if (filePath.startsWith('http') || filePath.startsWith('/')) {
      console.log('🔗 Opening direct URL:', filePath);
      window.open(filePath, '_blank');
      showNotification('🔗 Membuka file di tab baru...', 'info');
      return;
    }
    
    // FALLBACK: Generate placeholder file
    generatePlaceholderFile(doc);
    
  } catch (error) {
    console.error('❌ Download error:', error);
  } finally {
    setDownloadingDocId(null);
  }
};

// Fungsi generate placeholder jika file tidak ditemukan
const generatePlaceholderFile = (doc: Document) => {
  const content = `Document Information\n====================\nName: ${doc.name}\nType: ${doc.document_type || 'unknown'}\nPO Code: ${selectedPO?.po_code || 'N/A'}\nDate: ${new Date().toLocaleString('id-ID')}\n\nNote: Original file could not be retrieved.`;
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${doc.name || 'document'}_info.txt`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
  
  showNotification('📝 File info telah dibuat', 'warning');
};

// Fungsi previewDocument yang lebih aman
const previewDocument = async (doc: Document) => {
  try {
    setPreviewingDocId(doc.id);
    console.log('👁️ Previewing document:', doc);
    
    // Validasi file_path
    if (!doc.file_path) {
      console.error('❌ Cannot preview: file_path is undefined');
      showNotification('❌ File tidak tersedia untuk preview', 'error');
      return;
    }
    
    const filePath = String(doc.file_path);
    
    // Cek tipe file berdasarkan ekstensi
    const extension = doc.name?.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension);
    const isPDF = extension === 'pdf';
    
    if (isImage) {
      // Untuk gambar, buka di tab baru
      window.open(filePath, '_blank');
      showNotification('🖼️ Membuka gambar di tab baru', 'info');
      return;
    }
    
    if (isPDF) {
      // Untuk PDF, coba preview dulu
      const token = localStorage.getItem('token');
      const encodedPath = encodeURIComponent(filePath);
      
      const response = await fetch(
        `/api/approval-transactions?file_path=${encodedPath}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Buka PDF di tab baru
        const pdfWindow = window.open('', '_blank');
        if (pdfWindow) {
          pdfWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${doc.name} - Preview</title>
              <style>
                body, html { margin: 0; padding: 0; height: 100%; }
                .container { height: 100vh; }
                .header { 
                  background: white; 
                  padding: 10px 20px; 
                  border-bottom: 1px solid #e5e7eb;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  position: sticky;
                  top: 0;
                  z-index: 10;
                }
                .title { font-weight: 600; }
                .close-btn { 
                  background: #ef4444; 
                  color: white; 
                  border: none; 
                  padding: 5px 15px; 
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                }
                iframe { 
                  width: 100%; 
                  height: calc(100vh - 50px); 
                  border: none; 
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="title">${doc.name}</div>
                <button class="close-btn" onclick="window.close()">Tutup</button>
              </div>
              <iframe src="${url}"></iframe>
            </body>
            </html>
          `);
          pdfWindow.document.close();
        }
        return;
      }
    }
    
    // Untuk file lain, download saja
    showNotification('File akan diunduh untuk dilihat', 'info');
    await downloadDocument(doc);
    
  } catch (error) {
    console.error('Preview error:', error);
    showNotification('Gagal membuka preview', 'error');
  } finally {
    setPreviewingDocId(null);
  }
};

  // Download dari server
  const downloadFromServer = async (doc: Document) => {
    try {
      const token = localStorage.getItem('token')
      
      // Construct URL
      const fileUrl = `/api/documents/download?file_path=${encodeURIComponent(doc.file_path!)}`
      console.log('🌐 Download URL:', fileUrl)
      
      const response = await fetch(fileUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      // Get blob
      const blob = await response.blob()
      console.log('📦 Blob size:', blob.size, 'bytes')
      
      if (blob.size === 0) {
        throw new Error('Empty file received')
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = doc.name || 'document'
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      console.log('✅ File downloaded successfully')
      showNotification(`✅ ${doc.name} berhasil diunduh`, 'success')
      
    } catch (error) {
      console.error('❌ Server download error:', error)
      throw error
    }
  }

  // Download PO submission khusus
  const downloadPOSubmission = async (doc: Document) => {
    try {
      const token = localStorage.getItem('token')
      
      console.log('📄 Fetching PDF for PO:', selectedPO?.po_code)
      
      const response = await fetch(`/api/purchase-orders?endpoint=pdf&po_code=${selectedPO?.po_code}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('📦 PDF API response:', data)
        
        if (data.success && data.data.pdf_base64) {
          // Prepare base64 string
          let base64String = data.data.pdf_base64
          if (!base64String.startsWith('data:')) {
            base64String = `data:application/pdf;base64,${base64String}`
          }
          
          // Download
          const link = document.createElement('a')
          link.href = base64String
          link.download = `${selectedPO?.po_code}_document.pdf`
          link.style.display = 'none'
          
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          
          showNotification(`✅ ${selectedPO?.po_code}_document.pdf berhasil diunduh`, 'success')
        } else {
          throw new Error('No PDF data in response')
        }
      } else {
        throw new Error(`API returned ${response.status}`)
      }
      
    } catch (error) {
      console.error('PO submission download error:', error)
      throw error
    }
  }

  // Fungsi fallback
  const generateFallbackFile = (doc: Document) => {
    const content = `
      DOCUMENT INFORMATION
      ====================
      Name: ${doc.name}
      Type: ${doc.document_type || doc.type}
      Upload Date: ${new Date(doc.upload_date).toLocaleString('id-ID')}
      Source: ${doc.source}
      PO Code: ${selectedPO?.po_code || 'N/A'}
      
      ${doc.notes ? `Notes: ${doc.notes}` : ''}
      
      This is a placeholder document.
      The original file could not be retrieved.
      
      Generated on: ${new Date().toLocaleString('id-ID')}
    `

    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${doc.name || 'document'}_placeholder.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    showNotification('⚠️ File placeholder telah dibuat', 'warning')
  }

  // Helper untuk show notification
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const notification = document.createElement('div')
    const bgColor = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    }[type]
    
    notification.className = `fixed bottom-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-4 z-50 max-w-md`
    notification.innerHTML = `
      <div class="flex items-center gap-2">
        ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
        <span>${message}</span>
      </div>
    `
    
    document.body.appendChild(notification)
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.classList.add('animate-out', 'slide-out-to-bottom-4')
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification)
          }
        }, 300)
      }
    }, 3000)
  }

  // Handle approve
  const handleApprove = async () => {
    if (!poToAction) return
    
    try {
      const token = localStorage.getItem('token')
      const action = poToAction.approval_level === 'spv' ? 'approve_spv' : 'approve_finance'
      
      console.log('✅ Approving PO:', poToAction.po_code, 'action:', action)
      
      const response = await fetch('/api/approval-transactions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          po_code: poToAction.po_code,
          action: action,
          notes: approvalNote
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        let message = `PO ${poToAction.po_code} approved by ${poToAction.approval_level.toUpperCase()}!`
        if (poToAction.approval_level === 'spv') {
          message += ' Menunggu approval Finance.'
        } else {
          message += ' DO & AP Invoice created automatically.'
        }

        if (poToAction.is_split_po) {
          message += ` (Part ${poToAction.split_sequence} of ${poToAction.original_so_quantity})`
        }

        showNotification(message, 'success')
        
        setShowApproveModal(false)
        setApprovalNote('')

        // Refresh data
        fetchApprovalData()
        if (selectedPO && selectedPO.po_code === poToAction.po_code) {
          const updatedPO = await fetchPODetail(poToAction.po_code)
          if (updatedPO) setSelectedPO(updatedPO)
        }
      } else {
        const error = await response.json()
        showNotification(`Error: ${error.error}`, 'error')
      }
    } catch (error) {
      console.error('Error approving PO:', error)
      showNotification('Error approving purchase order', 'error')
    }
  }

  const handleReject = async () => {
    if (!poToAction) return
    
    try {
      const token = localStorage.getItem('token')
      
      console.log('❌ Rejecting PO:', poToAction.po_code)
      
      const response = await fetch('/api/approval-transactions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          po_code: poToAction.po_code,
          action: 'reject',
          notes: approvalNote
        })
      })

      if (response.ok) {
        showNotification(`PO ${poToAction.po_code} rejected!`, 'success')
        setShowRejectModal(false)
        setApprovalNote('')

        // Refresh data
        fetchApprovalData()
        if (selectedPO && selectedPO.po_code === poToAction.po_code) {
          const updatedPO = await fetchPODetail(poToAction.po_code)
          if (updatedPO) setSelectedPO(updatedPO)
        }
      } else {
        const error = await response.json()
        showNotification(`Error: ${error.error}`, 'error')
      }
    } catch (error) {
      console.error('Error rejecting PO:', error)
      showNotification('Error rejecting purchase order', 'error')
    }
  }

  // Status color untuk 2 level approval
  const getStatusColor = (status: string) => {
    const colors = {
      submitted: 'bg-blue-100 text-blue-800',
      approved_spv: 'bg-yellow-100 text-yellow-800',
      approved_finance: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-purple-100 text-purple-800'
    }
    return colors[status as keyof typeof colors] || colors.submitted
  }

  // Get approval badge berdasarkan level
  const getApprovalBadge = (po: PurchaseOrder) => {
    if (po.status === 'submitted') {
      return <Badge className="bg-blue-100 text-blue-800">Waiting SPV</Badge>
    } else if (po.status === 'approved_spv') {
      return <Badge className="bg-yellow-100 text-yellow-800">Waiting Finance</Badge>
    } else if (po.status === 'approved_finance') {
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>
    }
    return null
  }

  // Check if user can approve based on actual user data from token
  const canApprove = (po: PurchaseOrder) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return false
      
      const payload = JSON.parse(atob(token.split('.')[1]))
      const userDepartment = payload.department
      
      console.log('👤 User Department:', userDepartment)
      console.log('📋 PO:', { status: po.status, approval_level: po.approval_level })
      
      // Finance department bisa approve kedua level
      if (userDepartment === 'Finance') {
        const canApproveFinance = po.status === 'approved_spv'
        const canApproveSpv = po.status === 'submitted' && po.approval_level === 'spv'
        console.log('💰 Finance can approve:', { spv: canApproveSpv, finance: canApproveFinance })
        return canApproveSpv || canApproveFinance
      }
      
      // Admin/IT bisa approve semua
      if (userDepartment === 'IT') {
        const canApprove = po.status === 'submitted' || po.status === 'approved_spv'
        console.log('✅ Admin can approve:', canApprove)
        return canApprove
      }
      
      // Other departments hanya bisa approve SPV level
      const canApprove = po.status === 'submitted' && po.approval_level === 'spv'
      console.log('👥 Other can only approve SPV:', canApprove)
      return canApprove
      
    } catch (error) {
      console.error('Error checking approval permission:', error)
      // Fallback
      return po.status === 'submitted' || po.status === 'approved_spv'
    }
  }

  // Pagination component
  const Pagination = () => (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-gray-600">
        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredPOs.length)} of {filteredPOs.length} results
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const pageNum = i + 1
          return (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(pageNum)}
            >
              {pageNum}
            </Button>
          )
        })}
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading approval data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* PO Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search PO number, supplier, or SO reference..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10"
                />
              </div>
              
              <Button 
                variant="outline" 
                onClick={fetchApprovalData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>SO Reference</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Approval Level</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((po) => (
                    <TableRow 
                      key={po.po_code} 
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedPO?.po_code === po.po_code ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleRowClick(po)}
                    >
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          {po.po_code}
                          {po.is_split_po && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                              PART {po.split_sequence}
                            </Badge>
                          )}
                          {po.priority === 'high' && (
                            <Badge variant="destructive" className="text-xs">
                              URGENT
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{po.supplier_name}</div>
                        <div className="text-sm text-gray-500">{po.sales_rep}</div>
                      </TableCell>
                      <TableCell className="font-medium text-blue-600">{po.so_reference}</TableCell>
                      <TableCell className="font-semibold">
                        Rp {po.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getApprovalBadge(po)}
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm font-medium ${
                          po.days_waiting > 2 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {po.days_waiting}d
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(po.status)} variant="outline">
                          {po.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredPOs.length > 0 && <Pagination />}
          </CardContent>
        </Card>

        {/* PO Details */}
        {selectedPO && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="sticky top-0 bg-white z-10 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  PO Details - {selectedPO.po_code}
                  {getApprovalBadge(selectedPO)}
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refreshPODetail}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedPO(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Basic Information & Approval History */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information & Approval History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-gray-500">PO Date</Label>
                      <p className="font-medium">{selectedPO.date}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">SO Reference</Label>
                      <p className="font-medium text-blue-600">{selectedPO.so_reference}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Customer</Label>
                      <p className="font-medium">{selectedPO.customer_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Current Level</Label>
                      <p className="font-medium capitalize">{selectedPO.approval_level}</p>
                    </div>
                    
                    {/* Approval History */}
                    {selectedPO.approved_by_spv && (
                      <div className="md:col-span-2">
                        <Label className="text-xs text-gray-500">Approved by SPV</Label>
                        <p className="font-medium">{selectedPO.approved_by_spv} - {selectedPO.approved_date_spv}</p>
                      </div>
                    )}
                    {selectedPO.approved_by_finance && (
                      <div className="md:col-span-2">
                        <Label className="text-xs text-gray-500">Approved by Finance</Label>
                        <p className="font-medium">{selectedPO.approved_by_finance} - {selectedPO.approved_date_finance}</p>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs text-gray-500">Supplier</Label>
                      <p className="font-medium">{selectedPO.supplier_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Supplier Bank</Label>
                      <p className="font-medium font-mono">{selectedPO.supplier_bank}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Sales Rep</Label>
                      <p className="font-medium">{selectedPO.sales_rep}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Total Amount</Label>
                      <p className="font-medium text-lg">Rp {selectedPO.total_amount.toLocaleString()}</p>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Supplier Contact
                      </Label>
                      <p className="font-medium">{selectedPO.supplier_contact}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Customer Contact
                      </Label>
                      <p className="font-medium">{selectedPO.customer_phone}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Sales Email
                      </Label>
                      <p className="font-medium">{selectedPO.sales_rep_email}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Submitted Time</Label>
                      <p className="font-medium">{new Date(selectedPO.created_at).toLocaleTimeString()}</p>
                    </div>
                    <div className="md:col-span-2 lg:col-span-4">
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Customer Address
                      </Label>
                      <p className="font-medium text-sm">{selectedPO.customer_address}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Price Comparison */}
              {selectedPO.items && selectedPO.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Price Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead className="text-right">SO Price</TableHead>
                          <TableHead className="text-right">PO Price</TableHead>
                          <TableHead className="text-right">Margin</TableHead>
                          <TableHead className="text-right">Margin %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPO.items.map((item) => (
                          <TableRow key={item.unique_key}>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell className="font-mono text-sm">{item.product_code}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {item.quantity}
                                {selectedPO.is_split_po && (
                                  <Badge variant="outline" className="text-xs bg-gray-100">
                                    of {selectedPO.original_so_quantity}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              Rp {item.so_unit_price.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              Rp {item.purchase_price.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-semibold">
                              Rp {item.margin.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-semibold">
                              {item.margin_percentage.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Documents Section */}
              {selectedPO.documents && selectedPO.documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Documents
                      <Badge variant="outline" className="ml-2">
                        {selectedPO.documents.length} file{selectedPO.documents.length > 1 ? 's' : ''}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      
                      {/* Dokumen Pengajuan PO */}
                      {selectedPO.documents.some(doc => doc.document_type === 'submission') && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                            <h4 className="text-sm font-semibold text-gray-700">Dokumen Pengajuan PO</h4>
                            <Badge className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100">
                              Main Document
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {selectedPO.documents
                              .filter(doc => doc.document_type === 'submission')
                              .map((doc) => (
                                <div key={doc.id} className="flex flex-col p-4 border-2 border-blue-300 rounded-lg hover:shadow-md transition-shadow bg-blue-50">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-blue-100 rounded-lg">
                                        <FileText className="h-6 w-6 text-blue-600" />
                                      </div>
                                      <div>
                                        <Badge className="bg-blue-600 text-white">
                                          Pengajuan
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          previewDocument(doc)
                                        }}
                                        className="h-8 w-8 p-0 border-blue-300 hover:bg-blue-100"
                                        disabled={previewingDocId === doc.id}
                                        title="Preview PDF"
                                      >
                                        {previewingDocId === doc.id ? (
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        ) : (
                                          <Eye className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          downloadDocument(doc)
                                        }}
                                        className="h-8 w-8 p-0 border-blue-300 hover:bg-blue-100"
                                        disabled={downloadingDocId === doc.id}
                                        title="Download"
                                        data-doc-id={doc.id}
                                      >
                                        {downloadingDocId === doc.id ? (
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        ) : (
                                          <Download className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-sm mb-2 truncate">{doc.name}</div>
                                    {doc.notes && (
                                      <div className="text-xs text-gray-600 mb-2 p-2 bg-blue-100/50 rounded">
                                        📝 {doc.notes}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-500 mb-1">
                                      Uploaded: {new Date(doc.upload_date).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </div>
                                    {doc.file_path && (
                                      <div className="text-xs text-blue-400 font-medium truncate" title={doc.file_path}>
                                        📁 {doc.file_path.split('/').pop()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Dokumen Pembayaran (jika ada) */}
                      {selectedPO.documents.some(doc => 
                        doc.document_type === 'invoice' || doc.document_type === 'proof'
                      ) && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <h4 className="text-sm font-semibold text-gray-700">Dokumen Pembayaran</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {selectedPO.documents
                              .filter(doc => doc.document_type === 'invoice' || doc.document_type === 'proof')
                              .map((doc) => (
                                <div key={doc.id} className="flex flex-col p-4 border rounded-lg hover:shadow-md transition-shadow bg-green-50/50">
                                  <div className="flex items-start justify-between mb-2">
                                    <FileText className="h-8 w-8 text-green-500 flex-shrink-0 mt-1" />
                                    <div className="flex gap-1">
                                      <Badge className={`text-xs ${
                                        doc.document_type === 'invoice' 
                                          ? 'bg-purple-100 text-purple-700' 
                                          : 'bg-green-100 text-green-700'
                                      }`}>
                                        {doc.document_type === 'invoice' ? 'Invoice' : 'Bukti Bayar'}
                                      </Badge>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          previewDocument(doc)
                                        }}
                                        className="h-8 w-8 p-0"
                                        disabled={previewingDocId === doc.id}
                                        title="Preview"
                                      >
                                        {previewingDocId === doc.id ? (
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                        ) : (
                                          <Eye className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          downloadDocument(doc)
                                        }}
                                        className="h-8 w-8 p-0"
                                        disabled={downloadingDocId === doc.id}
                                        title="Download"
                                        data-doc-id={doc.id}
                                      >
                                        {downloadingDocId === doc.id ? (
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                        ) : (
                                          <Download className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-sm mb-1 truncate">{doc.name}</div>
                                    {doc.file_path && (
                                      <div className="text-xs text-gray-500 mb-1 truncate" title={doc.file_path}>
                                        📁 {doc.file_path.split('/').pop()}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-500 mb-1">
                                      {new Date(doc.upload_date).toLocaleDateString('id-ID')}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Approval Section */}
              <div className="space-y-6">
                {/* Approval Notes */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Approval Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add notes for this approval..."
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Approval Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setPoToAction(selectedPO)
                      setShowRejectModal(true)
                    }}
                    disabled={selectedPO.status === 'rejected' || selectedPO.status === 'approved_finance' || selectedPO.status === 'paid'}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject PO
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setPoToAction(selectedPO)
                      setShowApproveModal(true)
                    }}
                    disabled={
                      selectedPO.status === 'rejected' || 
                      selectedPO.status === 'approved_finance' ||
                      selectedPO.status === 'paid' ||
                      !canApprove(selectedPO)
                    }
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {selectedPO.approval_level === 'spv' ? 'Approve (SPV)' : 'Approve (Finance)'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modals */}
        {showApproveModal && poToAction && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all duration-200"
            onClick={handleBackdropClick}
          >
            <div className="bg-white rounded-lg max-w-md w-full p-6 animate-in fade-in-zoom-in-95">
              <h3 className="text-lg font-semibold mb-4">
                Confirm {poToAction.approval_level.toUpperCase()} Approval
              </h3>
              <div className="text-gray-600 mb-6">
                Apakah anda yakin untuk approve PO <strong>{poToAction.po_code}</strong> 
                {poToAction.approval_level === 'spv' ? ' sebagai Supervisor?' : ' sebagai Finance?'}
                {poToAction.is_split_po && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <strong>Split Information:</strong><br/>
                    Part {poToAction.split_sequence} of {poToAction.original_so_quantity}<br/>
                    Quantity: {poToAction.items?.[0]?.quantity || 0} pcs
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowApproveModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                >
                  Yes, Approve
                </Button>
              </div>
            </div>
          </div>
        )}

        {showRejectModal && poToAction && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all duration-200"
            onClick={handleBackdropClick}
          >
            <div className="bg-white rounded-lg max-w-md w-full p-6 animate-in fade-in-zoom-in-95">
              <h3 className="text-lg font-semibold mb-4">Confirm Rejection</h3>
              <div className="text-gray-600 mb-6">
                Apakah anda yakin untuk reject PO <strong>{poToAction.po_code}</strong>?
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReject}
                >
                  Yes, Reject
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}