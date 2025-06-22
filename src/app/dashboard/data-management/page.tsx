'use client'

import React, { useState } from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  FileIcon, 
  DatabaseIcon, 
  BotIcon, 
  SettingsIcon,
  ArrowRightIcon
} from 'lucide-react'
import { useFileStorage } from '@/lib/hooks/useFileStorage'
import FileManager from '@/components/data-manager/FileManager'
import FileDataViewer from '@/components/data-manager/FileDataViewer'
import { UploadedFile } from '@/lib/services/supabase-storage-service'
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"

const DataManagementPage = () => {
  const { toast } = useToast()
  const { files, loading, error, fetchFiles } = useFileStorage()
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  
  const handlePreviewFile = (file: UploadedFile) => {
    setSelectedFile(file)
    setShowPreview(true)
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Management</h1>
          <p className="text-muted-foreground mt-1">
            Upload, organize, and share data with your trading agents
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchFiles()}
          >
            Refresh
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="files" className="space-y-6">
        <TabsList>
          <TabsTrigger value="files">
            <FileIcon className="h-4 w-4 mr-2" />
            Files
          </TabsTrigger>
          <TabsTrigger value="data-access">
            <DatabaseIcon className="h-4 w-4 mr-2" />
            Data Access
          </TabsTrigger>
          <TabsTrigger value="agent-config">
            <BotIcon className="h-4 w-4 mr-2" />
            Agent Configuration
          </TabsTrigger>
          <TabsTrigger value="settings">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="files" className="space-y-6">
          <FileManager />
        </TabsContent>
        
        <TabsContent value="data-access">
          <Card>
            <CardHeader>
              <CardTitle>Data Access Management</CardTitle>
              <CardDescription>
                Control how your agents access and process data files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-12 text-center border rounded-lg">
                <DatabaseIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium">Data Access Controls</h3>
                <p className="text-gray-500 mt-1 max-w-lg mx-auto">
                  This section allows you to configure global access policies and data transformation rules for your agents.
                </p>
                <Button className="mt-4" variant="outline">
                  Configure Access Policies
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="agent-config">
          <Card>
            <CardHeader>
              <CardTitle>Agent Configuration</CardTitle>
              <CardDescription>
                Configure how agents process and transform uploaded data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-12 text-center border rounded-lg">
                <BotIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium">Agent Data Processing</h3>
                <p className="text-gray-500 mt-1 max-w-lg mx-auto">
                  Configure how your trading agents parse, transform, and utilize the data files you've uploaded.
                </p>
                <Button className="mt-4" variant="outline">
                  Configure Agents
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Data Management Settings</CardTitle>
              <CardDescription>
                Configure global settings for data management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-12 text-center border rounded-lg">
                <SettingsIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium">Settings</h3>
                <p className="text-gray-500 mt-1 max-w-lg mx-auto">
                  Configure storage quotas, retention policies, and other global settings for your data management system.
                </p>
                <Button className="mt-4" variant="outline">
                  Manage Settings
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* File Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          {selectedFile && (
            <FileDataViewer 
              file={selectedFile} 
              onClose={() => setShowPreview(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DataManagementPage