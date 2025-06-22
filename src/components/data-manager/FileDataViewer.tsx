import React, { useState, useEffect } from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  FileSpreadsheet, 
  FileJson, 
  Code, 
  BarChart4, 
  Info, 
  AlertTriangle, 
  DownloadCloud, 
  Loader2,
  Keyboard
} from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { UploadedFile } from '@/lib/services/supabase-storage-service'
import supabaseStorageService from '@/lib/services/supabase-storage-service'

// Basic types for parsed data
type ParsedTableData = {
  headers: string[];
  rows: any[][];
  rowCount: number;
  columnCount: number;
}

type ParsedJsonData = {
  data: any;
  itemCount?: number;
  isArray: boolean;
  properties?: string[];
}

interface FileDataViewerProps {
  file: UploadedFile;
  onClose?: () => void;
}

export const FileDataViewer: React.FC<FileDataViewerProps> = ({ 
  file,
  onClose 
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [csvData, setCsvData] = useState<ParsedTableData | null>(null)
  const [jsonData, setJsonData] = useState<ParsedJsonData | null>(null)
  const [textData, setTextData] = useState<string | null>(null)
  const [metaInfo, setMetaInfo] = useState<Record<string, any>>({})
  
  useEffect(() => {
    const loadFileData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Download file from Supabase
        const blob = await supabaseStorageService.downloadFile(file.file_path)
        
        // Determine file type
        const fileType = file.data_format || file.file_type.toLowerCase()
        
        // Metadata for all file types
        setMetaInfo({
          filename: file.filename,
          size: file.file_size,
          type: file.content_type,
          uploaded: new Date(file.created_at || '').toLocaleString(),
          format: fileType
        })
        
        // Parse based on file type
        switch (fileType) {
          case 'csv':
            await parseCSV(blob)
            break
          case 'json':
            await parseJSON(blob)
            break
          case 'excel':
            setError('Excel file preview is not yet implemented')
            break
          case 'text':
          case 'txt':
            await parseText(blob)
            break
          case 'xml':
            await parseText(blob) // Simple text view for XML
            break
          default:
            setError(`Unsupported file type: ${fileType}`)
        }
      } catch (err) {
        console.error('Error loading file data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load file data')
      } finally {
        setLoading(false)
      }
    }
    
    loadFileData()
  }, [file])
  
  // Parse CSV file
  const parseCSV = async (blob: Blob) => {
    try {
      const text = await blob.text()
      
      // Basic CSV parsing (in a real app, use a library like Papa Parse)
      const lines = text.split(/\\r?\\n/)
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty')
      }
      
      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim())
      
      // Parse rows (limit to 100 for performance)
      const rows = lines.slice(1, 101).map(line => 
        line.split(',').map(cell => cell.trim())
      ).filter(row => row.some(cell => cell.length > 0)) // Skip empty rows
      
      setCsvData({
        headers,
        rows,
        rowCount: lines.length - 1, // Excluding header
        columnCount: headers.length
      })
      
      // Add metadata
      setMetaInfo(prev => ({
        ...prev,
        totalRows: lines.length - 1,
        columns: headers,
        previewRows: rows.length
      }))
    } catch (err) {
      console.error('Error parsing CSV:', err)
      setError(err instanceof Error ? err.message : 'Failed to parse CSV')
    }
  }
  
  // Parse JSON file
  const parseJSON = async (blob: Blob) => {
    try {
      const text = await blob.text()
      const data = JSON.parse(text)
      
      // Determine if it's an array or object
      const isArray = Array.isArray(data)
      const properties = isArray 
        ? (data.length > 0 ? Object.keys(data[0]) : [])
        : Object.keys(data)
      
      setJsonData({
        data,
        itemCount: isArray ? data.length : undefined,
        isArray,
        properties
      })
      
      // Add metadata
      setMetaInfo(prev => ({
        ...prev,
        structure: isArray ? 'Array' : 'Object',
        itemCount: isArray ? data.length : null,
        properties
      }))
    } catch (err) {
      console.error('Error parsing JSON:', err)
      setError(err instanceof Error ? err.message : 'Failed to parse JSON')
    }
  }
  
  // Parse text file
  const parseText = async (blob: Blob) => {
    try {
      const text = await blob.text()
      setTextData(text.slice(0, 10000)) // Limit preview size
      
      // Add metadata
      setMetaInfo(prev => ({
        ...prev,
        characters: text.length,
        lines: text.split(/\\r?\\n/).length
      }))
    } catch (err) {
      console.error('Error parsing text:', err)
      setError(err instanceof Error ? err.message : 'Failed to parse text')
    }
  }
  
  // Render CSV table
  const renderCSVTable = () => {
    if (!csvData) return null
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <Badge variant="outline" className="mr-2">
              {csvData.rowCount} rows
            </Badge>
            <Badge variant="outline">
              {csvData.columnCount} columns
            </Badge>
          </div>
          {csvData.rowCount > 100 && (
            <Badge variant="secondary">
              Showing first 100 rows
            </Badge>
          )}
        </div>
        
        <div className="border rounded-md">
          <ScrollArea className="h-[400px]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    {csvData.headers.map((header, index) => (
                      <TableHead key={index}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.rows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      <TableCell className="font-mono text-gray-500">
                        {rowIndex + 1}
                      </TableCell>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex}>
                          {cell || <span className="text-gray-400">-</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </div>
    )
  }
  
  // Render JSON viewer
  const renderJSONViewer = () => {
    if (!jsonData) return null
    
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {jsonData.isArray ? 'Array' : 'Object'}
          </Badge>
          {jsonData.isArray && jsonData.itemCount && (
            <Badge variant="outline">
              {jsonData.itemCount} items
            </Badge>
          )}
          {jsonData.properties && jsonData.properties.length > 0 && (
            <Badge variant="outline">
              {jsonData.properties.length} properties
            </Badge>
          )}
        </div>
        
        <ScrollArea className="h-[400px] border rounded-md bg-gray-50 dark:bg-gray-900">
          <pre className="p-4 text-sm font-mono overflow-x-auto">
            {JSON.stringify(jsonData.data, null, 2)}
          </pre>
        </ScrollArea>
      </div>
    )
  }
  
  // Render text viewer
  const renderTextViewer = () => {
    if (!textData) return null
    
    return (
      <div className="space-y-4">
        <div>
          <Badge variant="outline" className="mr-2">
            {metaInfo.lines || 0} lines
          </Badge>
          <Badge variant="outline">
            {metaInfo.characters || 0} characters
          </Badge>
        </div>
        
        <ScrollArea className="h-[400px] border rounded-md bg-gray-50 dark:bg-gray-900">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
            {textData}
          </pre>
        </ScrollArea>
      </div>
    )
  }
  
  // Render metadata information
  const renderMetadata = () => {
    return (
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>File Information</AlertTitle>
          <AlertDescription>
            This is the metadata and schema information for this file.
          </AlertDescription>
        </Alert>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Filename</dt>
                  <dd className="font-medium">{file.filename}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Size</dt>
                  <dd className="font-medium">
                    {formatFileSize(file.file_size)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Type</dt>
                  <dd className="font-medium">{file.content_type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Format</dt>
                  <dd className="font-medium">{file.data_format || file.file_type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Uploaded</dt>
                  <dd className="font-medium">{formatDate(file.created_at)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Processed</dt>
                  <dd className="font-medium">
                    {file.is_processed ? 'Yes' : 'No'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Content Information</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <dl className="space-y-2">
                {file.data_format === 'csv' && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Total Rows</dt>
                      <dd className="font-medium">{metaInfo.totalRows || 0}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Columns</dt>
                      <dd className="font-medium">{metaInfo.columns?.length || 0}</dd>
                    </div>
                  </>
                )}
                
                {file.data_format === 'json' && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Structure</dt>
                      <dd className="font-medium">{metaInfo.structure || 'Unknown'}</dd>
                    </div>
                    {metaInfo.itemCount && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Items</dt>
                        <dd className="font-medium">{metaInfo.itemCount}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Properties</dt>
                      <dd className="font-medium">{metaInfo.properties?.length || 0}</dd>
                    </div>
                  </>
                )}
                
                {(file.data_format === 'text' || file.data_format === 'txt') && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Lines</dt>
                      <dd className="font-medium">{metaInfo.lines || 0}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Characters</dt>
                      <dd className="font-medium">{metaInfo.characters || 0}</dd>
                    </div>
                  </>
                )}
                
                {file.description && (
                  <div className="pt-2">
                    <dt className="text-gray-500">Description</dt>
                    <dd className="font-medium mt-1">{file.description}</dd>
                  </div>
                )}
                
                {file.tags && file.tags.length > 0 && (
                  <div className="pt-2">
                    <dt className="text-gray-500">Tags</dt>
                    <dd className="font-medium mt-1">
                      <div className="flex flex-wrap gap-1 mt-1">
                        {file.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
        
        {file.data_schema && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Schema Information</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <ScrollArea className="h-[200px]">
                <pre className="text-xs font-mono">
                  {JSON.stringify(file.data_schema, null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }
  
  // Format file size
  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
  }
  
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleString()
  }
  
  // Determine which tabs to show based on file type
  const getTabs = () => {
    const tabs = []
    
    tabs.push({ id: 'info', label: 'Info', icon: <Info className="h-4 w-4" /> })
    
    const fileType = file.data_format || file.file_type.toLowerCase()
    
    switch (fileType) {
      case 'csv':
        tabs.push({ id: 'data', label: 'Table', icon: <FileSpreadsheet className="h-4 w-4" /> })
        break
      case 'json':
        tabs.push({ id: 'data', label: 'JSON', icon: <FileJson className="h-4 w-4" /> })
        break
      case 'excel':
        tabs.push({ id: 'data', label: 'Table', icon: <FileSpreadsheet className="h-4 w-4" /> })
        break
      case 'text':
      case 'txt':
      case 'xml':
        tabs.push({ id: 'data', label: 'Text', icon: <Code className="h-4 w-4" /> })
        break
    }
    
    return tabs
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Data Preview: {file.filename}</CardTitle>
            <CardDescription>
              Inspect the structure and content of this file
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close Preview
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading file data...</p>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="info">
            <TabsList className="mb-4">
              {getTabs().map(tab => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  <div className="flex items-center">
                    {tab.icon}
                    <span className="ml-2">{tab.label}</span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value="info">
              {renderMetadata()}
            </TabsContent>
            
            <TabsContent value="data">
              {file.data_format === 'csv' && renderCSVTable()}
              {file.data_format === 'json' && renderJSONViewer()}
              {(file.data_format === 'text' || file.data_format === 'txt' || file.data_format === 'xml') && renderTextViewer()}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      <CardFooter className="border-t px-6 py-3">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center text-sm text-gray-500">
            <Keyboard className="h-4 w-4 mr-1" />
            <span>Press Esc to close</span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              supabaseStorageService.downloadFile(file.file_path).then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              }).catch(err => {
                toast({
                  title: "Download failed",
                  description: err instanceof Error ? err.message : "An error occurred",
                  variant: "destructive",
                })
              })
            }}
          >
            <DownloadCloud className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export default FileDataViewer