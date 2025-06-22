import { useState, useEffect, useCallback } from 'react';
import supabaseStorageService, { 
  UploadedFile, 
  FileUploadMetadata,
  AgentFileAccess 
} from '../services/supabase-storage-service';
import { useAuth } from './useSupabase';

export function useFileStorage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch user's files
  const fetchFiles = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await supabaseStorageService.getFiles(user.id);
      setFiles(data);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch files'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch files on component mount and when user changes
  useEffect(() => {
    if (user) {
      fetchFiles();
    } else {
      setFiles([]);
    }
  }, [user, fetchFiles]);

  // Upload a file
  const uploadFile = useCallback(async (
    file: File, 
    metadata: FileUploadMetadata = {}
  ) => {
    if (!user) throw new Error('User must be logged in to upload files');
    
    try {
      setLoading(true);
      setError(null);
      const uploadedFile = await supabaseStorageService.uploadFile(file, user.id, metadata);
      setFiles(prev => [uploadedFile, ...prev]);
      return uploadedFile;
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err instanceof Error ? err : new Error('Failed to upload file'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Delete a file
  const deleteFile = useCallback(async (fileId: string) => {
    try {
      setLoading(true);
      setError(null);
      await supabaseStorageService.deleteFile(fileId);
      setFiles(prev => prev.filter(file => file.id !== fileId));
      return true;
    } catch (err) {
      console.error('Error deleting file:', err);
      setError(err instanceof Error ? err : new Error('Failed to delete file'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update file metadata
  const updateFileMetadata = useCallback(async (
    fileId: string, 
    updates: Partial<Omit<UploadedFile, 'id' | 'user_id' | 'file_path' | 'created_at' | 'updated_at'>>
  ) => {
    try {
      setLoading(true);
      setError(null);
      const updatedFile = await supabaseStorageService.updateFileMetadata(fileId, updates);
      setFiles(prev => prev.map(file => file.id === fileId ? updatedFile : file));
      return updatedFile;
    } catch (err) {
      console.error('Error updating file metadata:', err);
      setError(err instanceof Error ? err : new Error('Failed to update file metadata'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get download URL for a file
  const getFileUrl = useCallback(async (filePath: string) => {
    try {
      return await supabaseStorageService.getFileUrl(filePath);
    } catch (err) {
      console.error('Error getting file URL:', err);
      setError(err instanceof Error ? err : new Error('Failed to get file URL'));
      throw err;
    }
  }, []);

  // Download file
  const downloadFile = useCallback(async (file: UploadedFile) => {
    try {
      setLoading(true);
      setError(null);
      const blob = await supabaseStorageService.downloadFile(file.file_path);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return true;
    } catch (err) {
      console.error('Error downloading file:', err);
      setError(err instanceof Error ? err : new Error('Failed to download file'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Grant agent access to a file
  const grantAgentAccess = useCallback(async (
    agentId: string, 
    fileId: string, 
    accessLevel: 'read' | 'write' | 'admin' = 'read'
  ) => {
    try {
      setLoading(true);
      setError(null);
      const access = await supabaseStorageService.grantAgentAccess(agentId, fileId, accessLevel);
      return access;
    } catch (err) {
      console.error('Error granting agent access:', err);
      setError(err instanceof Error ? err : new Error('Failed to grant agent access'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Revoke agent access to a file
  const revokeAgentAccess = useCallback(async (agentId: string, fileId: string) => {
    try {
      setLoading(true);
      setError(null);
      await supabaseStorageService.revokeAgentAccess(agentId, fileId);
      return true;
    } catch (err) {
      console.error('Error revoking agent access:', err);
      setError(err instanceof Error ? err : new Error('Failed to revoke agent access'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get files accessible to an agent
  const getAgentAccessibleFiles = useCallback(async (agentId: string) => {
    try {
      setLoading(true);
      setError(null);
      const accessibleFiles = await supabaseStorageService.getAgentAccessibleFiles(agentId);
      return accessibleFiles;
    } catch (err) {
      console.error('Error getting agent accessible files:', err);
      setError(err instanceof Error ? err : new Error('Failed to get agent accessible files'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark file as processed by agent
  const markFileProcessed = useCallback(async (
    fileId: string, 
    agentId: string, 
    results: Record<string, any> = {}
  ) => {
    try {
      setLoading(true);
      setError(null);
      const updatedFile = await supabaseStorageService.markFileProcessed(fileId, agentId, results);
      setFiles(prev => prev.map(file => file.id === fileId ? updatedFile : file));
      return updatedFile;
    } catch (err) {
      console.error('Error marking file as processed:', err);
      setError(err instanceof Error ? err : new Error('Failed to mark file as processed'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update file schema
  const updateFileSchema = useCallback(async (fileId: string, schema: Record<string, any>) => {
    try {
      setLoading(true);
      setError(null);
      const updatedFile = await supabaseStorageService.updateFileSchema(fileId, schema);
      setFiles(prev => prev.map(file => file.id === fileId ? updatedFile : file));
      return updatedFile;
    } catch (err) {
      console.error('Error updating file schema:', err);
      setError(err instanceof Error ? err : new Error('Failed to update file schema'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    files,
    loading,
    error,
    fetchFiles,
    uploadFile,
    deleteFile,
    updateFileMetadata,
    getFileUrl,
    downloadFile,
    grantAgentAccess,
    revokeAgentAccess,
    getAgentAccessibleFiles,
    markFileProcessed,
    updateFileSchema
  };
}

export default useFileStorage;