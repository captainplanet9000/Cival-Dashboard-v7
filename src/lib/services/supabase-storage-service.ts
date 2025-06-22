import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  id: string;
  user_id: string | null;
  filename: string;
  file_path: string;
  file_size: number;
  file_type: string; // Extension like 'csv', 'json', etc.
  content_type: string; // MIME type
  description: string | null;
  tags: string[] | null;
  data_format: string | null;
  data_schema: Record<string, any> | null;
  is_processed: boolean;
  processed_by: string[] | null;
  processing_results: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FileUploadMetadata {
  description?: string;
  tags?: string[];
  dataFormat?: string;
}

export interface AgentFileAccess {
  id: string;
  agent_id: string;
  file_id: string;
  access_level: 'read' | 'write' | 'admin';
  created_at: string | null;
  updated_at: string | null;
}

export class SupabaseStorageService {
  private static instance: SupabaseStorageService;
  private client: SupabaseClient<Database>;
  private bucketName: string = 'trading-data';

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    this.client = createClient<Database>(supabaseUrl, supabaseAnonKey);
    
    // Ensure the bucket exists (this would normally be done at app initialization)
    this.initializeStorage();
  }

  public static getInstance(): SupabaseStorageService {
    if (!SupabaseStorageService.instance) {
      SupabaseStorageService.instance = new SupabaseStorageService();
    }
    return SupabaseStorageService.instance;
  }

  /**
   * Initialize storage bucket if it doesn't exist
   */
  private async initializeStorage(): Promise<void> {
    try {
      // Check if bucket exists
      const { data: buckets } = await this.client.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);
      
      if (!bucketExists) {
        // Create bucket if it doesn't exist
        const { error } = await this.client.storage.createBucket(this.bucketName, {
          public: false,
          fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
        });
        
        if (error) {
          console.error('Error creating storage bucket:', error);
        } else {
          console.log(`Created storage bucket: ${this.bucketName}`);
        }
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  /**
   * Upload a file to Supabase Storage and record metadata in the database
   */
  async uploadFile(
    file: File, 
    userId: string, 
    metadata: FileUploadMetadata = {}
  ): Promise<UploadedFile> {
    try {
      // Generate a unique file path to prevent collisions
      const uniquePrefix = uuidv4();
      const filePath = `${userId}/${uniquePrefix}-${file.name}`;
      
      // Upload file to storage
      const { data: storageData, error: storageError } = await this.client.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (storageError) {
        console.error('Error uploading file to storage:', storageError);
        throw storageError;
      }
      
      // Detect data format based on file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      const dataFormat = this.detectDataFormat(fileExtension);
      
      // Create database record
      const fileRecord = {
        user_id: userId,
        filename: file.name,
        file_path: storageData.path,
        file_size: file.size,
        file_type: fileExtension,
        content_type: file.type,
        description: metadata.description || null,
        tags: metadata.tags || [],
        data_format: metadata.dataFormat || dataFormat,
        data_schema: null, // Will be populated after processing
        is_processed: false,
        processed_by: []
      };
      
      const { data: dbData, error: dbError } = await this.client
        .from('uploaded_files')
        .insert(fileRecord)
        .select()
        .single();
      
      if (dbError) {
        console.error('Error recording file metadata in database:', dbError);
        
        // Clean up storage file if database insert fails
        await this.client.storage
          .from(this.bucketName)
          .remove([filePath]);
          
        throw dbError;
      }
      
      return dbData as unknown as UploadedFile;
    } catch (error) {
      console.error('Error in uploadFile:', error);
      throw error;
    }
  }

  /**
   * Detect data format based on file extension
   */
  private detectDataFormat(fileExtension: string): string {
    switch (fileExtension) {
      case 'csv':
        return 'csv';
      case 'json':
        return 'json';
      case 'xls':
      case 'xlsx':
        return 'excel';
      case 'txt':
        return 'text';
      case 'xml':
        return 'xml';
      default:
        return 'unknown';
    }
  }

  /**
   * Get a list of uploaded files for a user
   */
  async getFiles(userId: string): Promise<UploadedFile[]> {
    try {
      const { data, error } = await this.client
        .from('uploaded_files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching files:', error);
        throw error;
      }
      
      return data as unknown as UploadedFile[];
    } catch (error) {
      console.error('Error in getFiles:', error);
      throw error;
    }
  }

  /**
   * Get a specific file by ID
   */
  async getFile(fileId: string): Promise<UploadedFile> {
    try {
      const { data, error } = await this.client
        .from('uploaded_files')
        .select('*')
        .eq('id', fileId)
        .single();
      
      if (error) {
        console.error(`Error fetching file ${fileId}:`, error);
        throw error;
      }
      
      return data as unknown as UploadedFile;
    } catch (error) {
      console.error('Error in getFile:', error);
      throw error;
    }
  }

  /**
   * Generate a downloadable URL for a file
   */
  async getFileUrl(filePath: string): Promise<string> {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, 60 * 60); // 1 hour expiry
      
      if (error) {
        console.error(`Error generating signed URL for ${filePath}:`, error);
        throw error;
      }
      
      return data.signedUrl;
    } catch (error) {
      console.error('Error in getFileUrl:', error);
      throw error;
    }
  }

  /**
   * Delete a file from storage and remove database record
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      // Get file record first to get the storage path
      const { data: fileData, error: fileError } = await this.client
        .from('uploaded_files')
        .select('file_path')
        .eq('id', fileId)
        .single();
      
      if (fileError) {
        console.error(`Error fetching file ${fileId} for deletion:`, fileError);
        throw fileError;
      }
      
      // Delete file from storage
      const { error: storageError } = await this.client.storage
        .from(this.bucketName)
        .remove([fileData.file_path]);
      
      if (storageError) {
        console.error(`Error deleting file from storage:`, storageError);
        throw storageError;
      }
      
      // Delete database record
      const { error: dbError } = await this.client
        .from('uploaded_files')
        .delete()
        .eq('id', fileId);
      
      if (dbError) {
        console.error(`Error deleting file record from database:`, dbError);
        throw dbError;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteFile:', error);
      throw error;
    }
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(
    fileId: string, 
    updates: Partial<Omit<UploadedFile, 'id' | 'user_id' | 'file_path' | 'created_at' | 'updated_at'>>
  ): Promise<UploadedFile> {
    try {
      const { data, error } = await this.client
        .from('uploaded_files')
        .update(updates)
        .eq('id', fileId)
        .select()
        .single();
      
      if (error) {
        console.error(`Error updating file metadata for ${fileId}:`, error);
        throw error;
      }
      
      return data as unknown as UploadedFile;
    } catch (error) {
      console.error('Error in updateFileMetadata:', error);
      throw error;
    }
  }

  /**
   * Download file content
   */
  async downloadFile(filePath: string): Promise<Blob> {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .download(filePath);
      
      if (error) {
        console.error(`Error downloading file ${filePath}:`, error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in downloadFile:', error);
      throw error;
    }
  }

  /**
   * Grant file access to an agent
   */
  async grantAgentAccess(
    agentId: string, 
    fileId: string, 
    accessLevel: 'read' | 'write' | 'admin' = 'read'
  ): Promise<AgentFileAccess> {
    try {
      const access = {
        agent_id: agentId,
        file_id: fileId,
        access_level: accessLevel
      };
      
      // Check if access already exists
      const { data: existing } = await this.client
        .from('agent_file_access')
        .select('id')
        .eq('agent_id', agentId)
        .eq('file_id', fileId)
        .maybeSingle();
      
      let result;
      
      if (existing) {
        // Update existing access
        const { data, error } = await this.client
          .from('agent_file_access')
          .update({ access_level: accessLevel })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) {
          console.error(`Error updating agent access:`, error);
          throw error;
        }
        
        result = data;
      } else {
        // Create new access
        const { data, error } = await this.client
          .from('agent_file_access')
          .insert(access)
          .select()
          .single();
        
        if (error) {
          console.error(`Error granting agent access:`, error);
          throw error;
        }
        
        result = data;
      }
      
      return result as unknown as AgentFileAccess;
    } catch (error) {
      console.error('Error in grantAgentAccess:', error);
      throw error;
    }
  }

  /**
   * Revoke agent access to a file
   */
  async revokeAgentAccess(agentId: string, fileId: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('agent_file_access')
        .delete()
        .eq('agent_id', agentId)
        .eq('file_id', fileId);
      
      if (error) {
        console.error(`Error revoking agent access:`, error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error in revokeAgentAccess:', error);
      throw error;
    }
  }

  /**
   * Get list of files accessible to an agent
   */
  async getAgentAccessibleFiles(agentId: string): Promise<UploadedFile[]> {
    try {
      const { data, error } = await this.client
        .from('agent_file_access')
        .select(`
          file_id,
          access_level,
          uploaded_files:file_id(*)
        `)
        .eq('agent_id', agentId);
      
      if (error) {
        console.error(`Error fetching agent accessible files:`, error);
        throw error;
      }
      
      // Extract the uploaded_files data from the joined query
      return data.map(item => ({
        ...item.uploaded_files,
        access_level: item.access_level
      })) as unknown as UploadedFile[];
    } catch (error) {
      console.error('Error in getAgentAccessibleFiles:', error);
      throw error;
    }
  }

  /**
   * Mark file as processed by agent
   */
  async markFileProcessed(
    fileId: string, 
    agentId: string, 
    results: Record<string, any> = {}
  ): Promise<UploadedFile> {
    try {
      // Get current file data
      const { data: currentFile, error: fetchError } = await this.client
        .from('uploaded_files')
        .select('processed_by, processing_results')
        .eq('id', fileId)
        .single();
      
      if (fetchError) {
        console.error(`Error fetching current file data:`, fetchError);
        throw fetchError;
      }
      
      // Update the processed_by array and processing_results
      const processedBy = Array.isArray(currentFile.processed_by) 
        ? [...currentFile.processed_by, agentId]
        : [agentId];
      
      const processingResults = {
        ...(currentFile.processing_results || {}),
        [agentId]: results
      };
      
      // Update the file record
      const { data, error } = await this.client
        .from('uploaded_files')
        .update({
          is_processed: true,
          processed_by: processedBy,
          processing_results: processingResults
        })
        .eq('id', fileId)
        .select()
        .single();
      
      if (error) {
        console.error(`Error marking file as processed:`, error);
        throw error;
      }
      
      return data as unknown as UploadedFile;
    } catch (error) {
      console.error('Error in markFileProcessed:', error);
      throw error;
    }
  }

  /**
   * Update file schema after processing
   */
  async updateFileSchema(fileId: string, schema: Record<string, any>): Promise<UploadedFile> {
    try {
      const { data, error } = await this.client
        .from('uploaded_files')
        .update({
          data_schema: schema
        })
        .eq('id', fileId)
        .select()
        .single();
      
      if (error) {
        console.error(`Error updating file schema:`, error);
        throw error;
      }
      
      return data as unknown as UploadedFile;
    } catch (error) {
      console.error('Error in updateFileSchema:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const supabaseStorageService = SupabaseStorageService.getInstance();

export default supabaseStorageService;