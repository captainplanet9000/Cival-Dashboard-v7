import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, BookOpen, FileText, Lightbulb, TrendingUp, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { emitResourceUpload } from '@/lib/ag-ui/knowledge-events';

interface TradingResource {
  id: string;
  title: string;
  description?: string;
  resource_type: 'trading_books' | 'sops' | 'strategies' | 'research' | 'training' | 'documentation';
  file_size: number;
  upload_progress?: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error_message?: string;
}

interface TradingResourceDropzoneProps {
  onResourcesUploaded?: (resources: TradingResource[]) => void;
  maxFiles?: number;
  allowedTypes?: string[];
  className?: string;
}

const RESOURCE_TYPE_ICONS = {
  trading_books: BookOpen,
  sops: FileText,
  strategies: TrendingUp,
  research: Lightbulb,
  training: Upload,
  documentation: File,
};

const RESOURCE_TYPE_LABELS = {
  trading_books: 'Trading Books',
  sops: 'SOPs',
  strategies: 'Strategies',
  research: 'Research',
  training: 'Training',
  documentation: 'Documentation',
};

const TradingResourceDropzone: React.FC<TradingResourceDropzoneProps> = ({
  onResourcesUploaded,
  maxFiles = 10,
  allowedTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/json',
  ],
  className = '',
}) => {
  const [uploadedResources, setUploadedResources] = useState<TradingResource[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadResource = async (file: File, resourceType: string, title: string, description: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('resource_type', resourceType);
    formData.append('tags', ''); // Add tags logic if needed
    formData.append('access_level', 'PUBLIC');
    formData.append('auto_process', 'true');

    const response = await fetch('/api/v1/phase8/knowledge/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  };

  const handleFileUpload = useCallback(async (files: File[]) => {
    const newResources: TradingResource[] = files.map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      resource_type: inferResourceType(file.name),
      file_size: file.size,
      upload_progress: 0,
      status: 'uploading' as const,
    }));

    setUploadedResources(prev => [...prev, ...newResources]);

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const resourceIndex = uploadedResources.length + i;

      try {
        // Show upload dialog for each file
        const resourceData = await showResourceDialog(file);
        
        // Emit upload started event
        emitResourceUpload({
          action: 'upload_started',
          resource: {
            id: newResources[i].id,
            title: resourceData.title,
            type: resourceData.resourceType as any,
            size: file.size,
            status: 'uploading',
          },
          uploadedBy: 'user',
        });
        
        // Update status to processing
        setUploadedResources(prev => 
          prev.map((resource, index) => 
            index === resourceIndex 
              ? { ...resource, status: 'processing' as const, upload_progress: 100 }
              : resource
          )
        );

        // Emit processing started event
        emitResourceUpload({
          action: 'processing_started',
          resource: {
            id: newResources[i].id,
            title: resourceData.title,
            type: resourceData.resourceType as any,
            size: file.size,
            status: 'processing',
          },
          uploadedBy: 'user',
        });

        // Upload to backend
        const result = await uploadResource(
          file,
          resourceData.resourceType,
          resourceData.title,
          resourceData.description
        );

        // Update with successful result
        setUploadedResources(prev =>
          prev.map((resource, index) =>
            index === resourceIndex
              ? {
                  ...resource,
                  id: result.resource.resource_id,
                  title: result.resource.title,
                  description: result.resource.description,
                  status: 'completed' as const,
                }
              : resource
          )
        );

        // Emit upload completed event
        emitResourceUpload({
          action: 'upload_completed',
          resource: {
            id: result.resource.resource_id,
            title: result.resource.title,
            type: result.resource.resource_type,
            size: file.size,
            status: 'completed',
          },
          uploadedBy: 'user',
        });

        toast.success(`Successfully uploaded: ${result.resource.title}`);
      } catch (error) {
        // Update with error
        setUploadedResources(prev =>
          prev.map((resource, index) =>
            index === resourceIndex
              ? {
                  ...resource,
                  status: 'error' as const,
                  error_message: error instanceof Error ? error.message : 'Upload failed',
                }
              : resource
          )
        );

        // Emit upload failed event
        emitResourceUpload({
          action: 'upload_failed',
          resource: {
            id: newResources[i].id,
            title: newResources[i].title,
            type: newResources[i].resource_type,
            size: file.size,
            status: 'error',
          },
          uploadedBy: 'user',
          error: error instanceof Error ? error.message : 'Upload failed',
        });

        toast.error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Notify parent component
    if (onResourcesUploaded) {
      const completedResources = uploadedResources.filter(r => r.status === 'completed');
      onResourcesUploaded(completedResources);
    }
  }, [uploadedResources, onResourcesUploaded]);

  const inferResourceType = (filename: string): TradingResource['resource_type'] => {
    const lower = filename.toLowerCase();
    
    if (lower.includes('sop') || lower.includes('procedure') || lower.includes('protocol')) {
      return 'sops';
    }
    if (lower.includes('strategy') || lower.includes('backtest') || lower.includes('signal')) {
      return 'strategies';
    }
    if (lower.includes('research') || lower.includes('analysis') || lower.includes('report')) {
      return 'research';
    }
    if (lower.includes('training') || lower.includes('tutorial') || lower.includes('course')) {
      return 'training';
    }
    if (lower.includes('book') || lower.includes('guide') || lower.includes('manual')) {
      return 'trading_books';
    }
    
    return 'documentation';
  };

  const showResourceDialog = (file: File): Promise<{
    title: string;
    description: string;
    resourceType: string;
  }> => {
    return new Promise((resolve, reject) => {
      // Create modal dialog
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      
      const inferredType = inferResourceType(file.name);
      const defaultTitle = file.name.replace(/\.[^/.]+$/, '');
      
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold mb-4">Upload Trading Resource</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Title</label>
              <input 
                type="text" 
                id="resource-title" 
                class="w-full border rounded-md px-3 py-2" 
                value="${defaultTitle}"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Description</label>
              <textarea 
                id="resource-description" 
                class="w-full border rounded-md px-3 py-2 h-24" 
                placeholder="Describe this trading resource..."
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Resource Type</label>
              <select id="resource-type" class="w-full border rounded-md px-3 py-2">
                <option value="trading_books" ${inferredType === 'trading_books' ? 'selected' : ''}>Trading Books</option>
                <option value="sops" ${inferredType === 'sops' ? 'selected' : ''}>SOPs</option>
                <option value="strategies" ${inferredType === 'strategies' ? 'selected' : ''}>Strategies</option>
                <option value="research" ${inferredType === 'research' ? 'selected' : ''}>Research</option>
                <option value="training" ${inferredType === 'training' ? 'selected' : ''}>Training</option>
                <option value="documentation" ${inferredType === 'documentation' ? 'selected' : ''}>Documentation</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end space-x-2 mt-6">
            <button id="cancel-upload" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
            <button id="confirm-upload" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Upload</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      const titleInput = modal.querySelector('#resource-title') as HTMLInputElement;
      const descriptionInput = modal.querySelector('#resource-description') as HTMLTextAreaElement;
      const typeSelect = modal.querySelector('#resource-type') as HTMLSelectElement;
      const cancelBtn = modal.querySelector('#cancel-upload') as HTMLElement;
      const confirmBtn = modal.querySelector('#confirm-upload') as HTMLElement;
      
      titleInput.focus();
      
      const cleanup = () => {
        document.body.removeChild(modal);
      };
      
      cancelBtn?.addEventListener('click', () => {
        cleanup();
        reject(new Error('Upload cancelled'));
      });
      
      confirmBtn?.addEventListener('click', () => {
        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        const resourceType = typeSelect.value;
        
        if (!title) {
          toast.error('Please enter a title');
          return;
        }
        
        cleanup();
        resolve({ title, description, resourceType });
      });
      
      // Handle enter key
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
          confirmBtn?.click();
        } else if (e.key === 'Escape') {
          cancelBtn?.click();
        }
      });
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      toast.error('Please select valid files');
      return;
    }

    if (uploadedResources.length + acceptedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    handleFileUpload(acceptedFiles);
  }, [uploadedResources, maxFiles, handleFileUpload]);

  const { getRootProps, getInputProps, isDragActive: dropzoneActive } = useDropzone({
    onDrop,
    accept: allowedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const removeResource = (id: string) => {
    setUploadedResources(prev => prev.filter(r => r.id !== id));
  };

  const getStatusIcon = (status: TradingResource['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${dropzoneActive || isDragActive 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`
            p-4 rounded-full transition-all duration-200
            ${dropzoneActive || isDragActive ? 'bg-blue-100' : 'bg-gray-100'}
          `}>
            <Upload className={`
              w-8 h-8 transition-colors duration-200
              ${dropzoneActive || isDragActive ? 'text-blue-600' : 'text-gray-500'}
            `} />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Drop trading resources here
            </h3>
            <p className="text-gray-600 mb-4">
              Upload trading books, SOPs, strategies, research documents, and training materials
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {Object.entries(RESOURCE_TYPE_LABELS).map(([type, label]) => {
                const Icon = RESOURCE_TYPE_ICONS[type as keyof typeof RESOURCE_TYPE_ICONS];
                return (
                  <span
                    key={type}
                    className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs"
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {label}
                  </span>
                );
              })}
            </div>
            <p className="text-sm text-gray-500">
              Support for PDF, Word, Excel, CSV, JSON, Markdown, and Text files (max 50MB each)
            </p>
          </div>
          
          <button
            type="button"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose Files
          </button>
        </div>
      </div>

      {/* Uploaded Resources List */}
      {uploadedResources.length > 0 && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold mb-4">Uploaded Resources ({uploadedResources.length})</h4>
          <div className="space-y-3">
            {uploadedResources.map((resource) => {
              const Icon = RESOURCE_TYPE_ICONS[resource.resource_type];
              
              return (
                <div
                  key={resource.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <Icon className="w-5 h-5 text-gray-500" />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-gray-900 truncate">
                        {resource.title}
                      </h5>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>{RESOURCE_TYPE_LABELS[resource.resource_type]}</span>
                        <span>•</span>
                        <span>{formatFileSize(resource.file_size)}</span>
                      </div>
                      {resource.description && (
                        <p className="text-sm text-gray-600 mt-1 truncate">
                          {resource.description}
                        </p>
                      )}
                      {resource.error_message && (
                        <p className="text-sm text-red-600 mt-1">
                          {resource.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(resource.status)}
                    
                    {resource.status === 'completed' || resource.status === 'error' ? (
                      <button
                        onClick={() => removeResource(resource.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="w-6" /> // Spacer for alignment
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {uploadedResources.some(r => r.status === 'completed') && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-medium text-green-900">Resources Ready</h5>
              <p className="text-sm text-green-700">
                Your trading resources have been uploaded and are now available to agents through the knowledge system.
              </p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingResourceDropzone;