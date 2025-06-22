'use client'

import React, { useState, useEffect } from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FileIcon, 
  Search, 
  DatabaseIcon, 
  RefreshCw, 
  Filter, 
  ArrowDownAZ, 
  ArrowUpAZ,
  DownloadCloud,
  Bot
} from 'lucide-react'
import { useAgentDataAccess } from '@/lib/hooks/useAgentDataAccess'
import { useToast } from "@/components/ui/use-toast"
import { UploadedFile } from '@/lib/services/supabase-storage-service'

interface AgentDataBrowserProps {
  agentId: string
  onDataSelect?: (data: any) => void
}

export const AgentDataBrowser: React.FC<AgentDataBrowserProps> = ({
  agentId,
  onDataSelect
}) => {
  const { toast } = useToast()
  const { 
    loading, 
    accessibleFiles, 
    currentFileData, 
    currentFileId,
    fetchAccessibleFiles, 
    fetchFileContent,
    queryFile 
  } = useAgentDataAccess(agentId)
  
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterField, setFilterField] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [sortField, setSortField] = useState('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [availableFields, setAvailableFields] = useState<string[]>([])
  const [dataPreview, setDataPreview] = useState<any[] | null>(null)
  
  // Set selected file and fetch its content
  const handleSelectFile = async (file: UploadedFile) => {
    setSelectedFile(file)
    
    // Fetch file content
    const content = await fetchFileContent(file.id)
    if (content) {
      // Determine available fields for filtering/sorting
      if (Array.isArray(content) && content.length > 0) {
        const fields = Object.keys(content[0])
        setAvailableFields(fields)
        
        // Set data preview
        setDataPreview(content.slice(0, 10))
      } else if (typeof content === 'object' && content !== null) {
        setAvailableFields(Object.keys(content))
        setDataPreview([content])
      } else {
        setAvailableFields([])
        setDataPreview(null)
      }
    }
  }
  
  // Refresh the list of accessible files
  const handleRefresh = () => {
    fetchAccessibleFiles()
    toast({
      title: "Data refreshed",
      description: "The list of accessible files has been updated"
    })
  }
  
  // Search for files based on filename or description
  const filteredFiles = accessibleFiles.filter(file => {
    if (!searchQuery) return true
    
    const searchLower = searchQuery.toLowerCase()
    return (
      file.filename.toLowerCase().includes(searchLower) ||
      (file.description && file.description.toLowerCase().includes(searchLower))
    )
  })
  
  // Query data with filters and sorting
  const handleQueryData = async () => {
    if (!selectedFile) return
    
    const query: any = {}
    
    // Add filter if specified
    if (filterField && filterValue) {
      query.filter = { [filterField]: filterValue }
    }
    
    // Add sort if specified
    if (sortField) {
      query.sort = { field: sortField, direction: sortDirection }
    }
    
    // Execute query
    const result = await queryFile(selectedFile.id, query)
    
    if (result && Array.isArray(result)) {
      setDataPreview(result.slice(0, 100))
      
      toast({
        title: "Query successful",
        description: `Found ${result.length} records matching your criteria`
      })
      
      // Notify parent component if callback provided
      if (onDataSelect) {
        onDataSelect(result)
      }
    } else if (result) {
      setDataPreview([result])
      
      // Notify parent component if callback provided
      if (onDataSelect) {
        onDataSelect(result)
      }
    }
  }
  
  // Reset filters and sorting
  const handleResetQuery = () => {
    setFilterField('')
    setFilterValue('')
    setSortField('')
    setSortDirection('asc')
    
    // Reset preview to initial state
    if (currentFileData) {
      if (Array.isArray(currentFileData)) {
        setDataPreview(currentFileData.slice(0, 10))
      } else {
        setDataPreview([currentFileData])
      }
    }
  }
  
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Agent Data Browser</CardTitle>
            <CardDescription>
              Browse and query data files available to agent {agentId}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="files">
          <TabsList className="mb-4">
            <TabsTrigger value="files">
              <FileIcon className="h-4 w-4 mr-2" />
              Available Files
            </TabsTrigger>
            <TabsTrigger value="data" disabled={!selectedFile}>
              <DatabaseIcon className="h-4 w-4 mr-2" />
              Data Explorer
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="files">
            <div className="space-y-4">
              {/* Search bar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search files..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Badge variant="outline" className="self-center">
                  {filteredFiles.length} files
                </Badge>
              </div>
              
              {/* File list */}
              {loading ? (
                <div className="py-8 text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading files...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="py-12 text-center border rounded-lg">
                  <FileIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium">No files available</h3>
                  <p className="text-gray-500 mt-1">
                    {searchQuery 
                      ? "No files match your search criteria" 
                      : "This agent doesn't have access to any files yet"}
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={handleRefresh}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFiles.map(file => (
                        <TableRow 
                          key={file.id}
                          className={selectedFile?.id === file.id ? "bg-muted/50" : ""}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <FileIcon className="h-4 w-4 text-gray-500" />
                              <div>
                                <div className="font-medium">{file.filename}</div>
                                {file.description && (
                                  <div className="text-xs text-gray-500">{file.description}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {file.data_format || file.file_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(file.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant={selectedFile?.id === file.id ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleSelectFile(file)}
                            >
                              {selectedFile?.id === file.id ? "Selected" : "Select"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="data">
            {selectedFile && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {selectedFile.filename}
                  </h3>
                  <Badge variant="outline">
                    {selectedFile.data_format || selectedFile.file_type}
                  </Badge>
                </div>
                
                {/* Query controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md bg-muted/10">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Filter</label>
                    <div className="flex gap-2">
                      <Select value={filterField} onValueChange={setFilterField}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No filter</SelectItem>
                          {availableFields.map(field => (
                            <SelectItem key={field} value={field}>{field}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Input
                        placeholder="Filter value"
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        disabled={!filterField}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort</label>
                    <div className="flex gap-2">
                      <Select value={sortField} onValueChange={setSortField}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No sorting</SelectItem>
                          {availableFields.map(field => (
                            <SelectItem key={field} value={field}>{field}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleSortDirection}
                        disabled={!sortField}
                      >
                        {sortDirection === 'asc' ? (
                          <ArrowDownAZ className="h-4 w-4" />
                        ) : (
                          <ArrowUpAZ className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleResetQuery}
                    >
                      Reset
                    </Button>
                    <Button 
                      onClick={handleQueryData}
                      disabled={loading}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Query Data
                    </Button>
                  </div>
                </div>
                
                {/* Data preview */}
                {dataPreview ? (
                  <div className="border rounded-md">
                    <ScrollArea className="h-[400px]">
                      {Array.isArray(dataPreview) && dataPreview.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {Object.keys(dataPreview[0]).map(key => (
                                <TableHead key={key}>{key}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dataPreview.map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {Object.entries(row).map(([key, value]) => (
                                  <TableCell key={key}>
                                    {typeof value === 'object' 
                                      ? JSON.stringify(value) 
                                      : String(value)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="p-4">
                          <pre className="text-sm whitespace-pre-wrap">
                            {JSON.stringify(dataPreview, null, 2)}
                          </pre>
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="py-8 text-center border rounded-md">
                    <DatabaseIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">Select a file to view its data</p>
                  </div>
                )}
                
                {/* Usage instructions */}
                <div className="p-4 border rounded-md bg-muted/10">
                  <div className="flex items-start gap-2">
                    <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium">Agent Data Access</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        This interface allows agents to autonomously browse and query data files.
                        Use the filter and sort options to find specific data, then use the Query button
                        to retrieve matching records.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default AgentDataBrowser