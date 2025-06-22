'use client'

import React, { useState } from 'react'
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Dropzone, 
  DropzoneContent, 
  DropzoneEmptyState,
  formatBytes
} from "@/components/dropzone"
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { useCurrentUser } from '@/lib/hooks/useSupabase'
import { FileIcon, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useFileStorage } from '@/lib/hooks/useFileStorage'

interface FileDropzoneProps {
  onUploadSuccess?: () => void
  bucketName?: string
  maxSize?: number
  maxFiles?: number
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onUploadSuccess,
  bucketName = 'file_uploads',
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 5
}) => {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const { updateFileMetadata } = useFileStorage()
  const [uploadComplete, setUploadComplete] = useState(false)
  
  // Use the Supabase upload hook
  const dropzoneProps = useSupabaseUpload({
    bucketName,
    path: user?.id, // Store files in user-specific folders
    maxFileSize: maxSize,
    maxFiles,
    allowedMimeTypes: [
      'text/csv', 
      'application/json', 
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    upsert: true, // Overwrite existing files with the same name
  })
  
  const { 
    files, 
    errors, 
    loading, 
    successes,
    isSuccess,
    onUpload 
  } = dropzoneProps

  // Handle upload completion
  const handleUploadComplete = async () => {
    if (loading || !user) return

    if (successes.length > 0) {
      // For each successfully uploaded file, update metadata in our database
      try {
        for (const fileName of successes) {
          const file = files.find(f => f.name === fileName)
          if (!file) continue

          // Determine file format
          const fileType = file.name.split('.').pop()?.toLowerCase() || ''
          
          // Add metadata for this file in our database
          await updateFileMetadata(fileName, {
            content_type: file.type,
            file_type: fileType,
            filename: file.name,
            file_size: file.size,
            data_format: fileType === 'csv' ? 'csv' : 
                      fileType === 'json' ? 'json' : 
                      fileType === 'txt' ? 'text' : fileType
          })
        }

        // Show success message
        toast({
          title: "Files uploaded successfully",
          description: `${successes.length} ${successes.length === 1 ? 'file has' : 'files have'} been uploaded`,
        })

        setUploadComplete(true)
        
        // Call success callback if provided
        if (onUploadSuccess) {
          onUploadSuccess()
        }
      } catch (error) {
        console.error('Error updating file metadata:', error)
        toast({
          title: "Upload completed but metadata update failed",
          description: error instanceof Error ? error.message : "An error occurred",
          variant: "destructive",
        })
      }
    }
  }

  // Call the handler when successes change
  React.useEffect(() => {
    if (successes.length > 0 && !loading && !uploadComplete) {
      handleUploadComplete()
    }
  }, [successes, loading])
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Data Files</CardTitle>
        <CardDescription>
          Drop your trading data files here to make them available to your agents
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSuccess ? (
          <Alert className="mb-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Upload Complete</AlertTitle>
            <AlertDescription>
              {successes.length} {successes.length === 1 ? 'file has' : 'files have'} been uploaded successfully. 
              You can now manage them in the files list below.
            </AlertDescription>
          </Alert>
        ) : errors.length > 0 ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Upload Error</AlertTitle>
            <AlertDescription>
              {errors.map(err => (
                <div key={err.name}>{err.name}: {err.message}</div>
              ))}
            </AlertDescription>
          </Alert>
        ) : null}
        
        <Dropzone {...dropzoneProps}>
          <DropzoneContent />
          <DropzoneEmptyState />
        </Dropzone>
        
        {files.length > 0 && !isSuccess && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Selected Files:</h4>
            <div className="space-y-2">
              {files.map((file) => (
                <div 
                  key={file.name} 
                  className="flex items-center gap-2 p-2 border rounded-md bg-background"
                >
                  <FileIcon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                  
                  {file.errors.length > 0 && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-2 text-xs text-muted-foreground">
          <p>Supported file types: CSV, JSON, TXT, Excel</p>
          <p>Maximum file size: {formatBytes(maxSize)}</p>
          <p>Maximum number of files: {maxFiles}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default FileDropzone