import React, { useState, useEffect } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Download, 
  MoreVertical, 
  Trash2, 
  Edit, 
  Eye, 
  FileText, 
  Database, 
  Tag, 
  Calendar, 
  CheckCircle2, 
  Bot 
} from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"
import { useFileStorage } from '@/lib/hooks/useFileStorage'
import { UploadedFile } from '@/lib/services/supabase-storage-service'
import { useAgentTradingPermissions } from '@/lib/hooks/useSupabase'
import { FileDropzone } from './FileDropzone'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export const FileManager: React.FC = () => {
  const { toast } = useToast()
  const { 
    files, 
    loading, 
    error, 
    fetchFiles, 
    downloadFile, 
    deleteFile, 
    updateFileMetadata,
    grantAgentAccess,
    revokeAgentAccess
  } = useFileStorage()
  
  const { permissions: agentPermissions, loading: loadingAgents } = useAgentTradingPermissions()
  
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showAgentAccessDialog, setShowAgentAccessDialog] = useState(false)
  const [editDescription, setEditDescription] = useState('')
  const [editTags, setEditTags] = useState('')
  const [agentAccessMap, setAgentAccessMap] = useState<Record<string, boolean>>({})
  
  // Format file size for display
  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
  }
  
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  // Handle file download
  const handleDownload = async (file: UploadedFile) => {
    try {
      await downloadFile(file)
      toast({
        title: "Download started",
        description: `${file.filename} is being downloaded.`,
      })
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    }
  }
  
  // Handle file deletion
  const handleDelete = async () => {
    if (!selectedFile) return
    
    try {
      await deleteFile(selectedFile.id)
      setShowDeleteDialog(false)
      setSelectedFile(null)
      toast({
        title: "File deleted",
        description: `${selectedFile.filename} has been deleted.`,
      })
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    }
  }
  
  // Handle file metadata update
  const handleUpdateMetadata = async () => {
    if (!selectedFile) return
    
    try {
      await updateFileMetadata(selectedFile.id, {
        description: editDescription,
        tags: editTags.split(',').map(tag => tag.trim()).filter(Boolean)
      })
      
      setShowEditDialog(false)
      toast({
        title: "File updated",
        description: `${selectedFile.filename} metadata has been updated.`,
      })
      
      // Refresh file list
      fetchFiles()
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    }
  }
  
  // Handle agent access update
  const handleUpdateAgentAccess = async () => {
    if (!selectedFile) return
    
    try {
      const promises = []
      
      // Process all agent access changes
      for (const [agentId, hasAccess] of Object.entries(agentAccessMap)) {
        if (hasAccess) {
          promises.push(grantAgentAccess(agentId, selectedFile.id, 'read'))
        } else {
          promises.push(revokeAgentAccess(agentId, selectedFile.id))
        }
      }
      
      await Promise.all(promises)
      
      setShowAgentAccessDialog(false)
      toast({
        title: "Agent access updated",
        description: `Agent access for ${selectedFile.filename} has been updated.`,
      })
      
      // Refresh file list
      fetchFiles()
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    }
  }
  
  // Set up edit dialogs when a file is selected
  useEffect(() => {
    if (selectedFile) {
      setEditDescription(selectedFile.description || '')
      setEditTags((selectedFile.tags || []).join(', '))
      
      // Initialize agent access map (this would need to be populated from the actual agent access data)
      const accessMap: Record<string, boolean> = {}
      agentPermissions.forEach(agent => {
        // In a real implementation, you would check if this agent has access to the file
        accessMap[agent.agent_id] = false
      })
      setAgentAccessMap(accessMap)
    }
  }, [selectedFile, agentPermissions])
  
  // Handle upload success
  const handleUploadSuccess = () => {
    fetchFiles()
  }
  
  if (error) {
    return (
      <div className="p-4 border rounded bg-red-50 text-red-600">
        <h3 className="text-lg font-semibold">Error loading files</h3>
        <p>{error.message}</p>
        <Button className="mt-2" variant="outline" onClick={() => fetchFiles()}>
          Retry
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <FileDropzone onUploadSuccess={handleUploadSuccess} />
      
      <Card>
        <CardHeader>
          <CardTitle>Data Files</CardTitle>
          <CardDescription>
            Manage your uploaded files and control agent access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="py-12 text-center border rounded-lg">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">No files uploaded yet</h3>
              <p className="text-gray-500 mt-1">
                Upload files using the dropzone above.
              </p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map(file => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <div>
                            <div className="font-medium truncate max-w-xs">
                              {file.filename}
                            </div>
                            {file.description && (
                              <div className="text-xs text-gray-500 truncate max-w-xs">
                                {file.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatFileSize(file.file_size)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {file.data_format || file.file_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(file.created_at)}</TableCell>
                      <TableCell>
                        {file.is_processed ? (
                          <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Processed
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Unprocessed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDownload(file)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedFile(file)
                                setShowEditDialog(true)
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Metadata
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedFile(file)
                                setShowAgentAccessDialog(true)
                              }}
                            >
                              <Bot className="h-4 w-4 mr-2" />
                              Agent Access
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => {
                                setSelectedFile(file)
                                setShowDeleteDialog(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedFile?.filename}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Metadata Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit File Metadata</DialogTitle>
            <DialogDescription>
              Update metadata for {selectedFile?.filename}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter a description for this file"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tags">Tags</Label>
              <Input
                id="edit-tags"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="Enter comma-separated tags"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateMetadata}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agent Access Dialog */}
      <Dialog open={showAgentAccessDialog} onOpenChange={setShowAgentAccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Agent Access</DialogTitle>
            <DialogDescription>
              Control which agents can access {selectedFile?.filename}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto py-4">
            {loadingAgents ? (
              <div className="py-4 text-center">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading agents...</p>
              </div>
            ) : agentPermissions.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm text-gray-500">No agents available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {agentPermissions.map(agent => (
                  <div key={agent.agent_id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{agent.agent_id}</p>
                        <p className="text-xs text-gray-500">{agent.risk_level} risk level</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={agentAccessMap[agent.agent_id] || false}
                        onChange={(e) => {
                          setAgentAccessMap(prev => ({
                            ...prev,
                            [agent.agent_id]: e.target.checked
                          }))
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgentAccessDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateAgentAccess}>Save Access</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FileManager