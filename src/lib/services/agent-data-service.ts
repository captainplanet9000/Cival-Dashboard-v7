import { createBrowserClient } from '@/utils/supabase/client'
import { createServerClient } from '@/utils/supabase/server'
import { Database } from '@/types/database.types'
import supabaseStorageService from './supabase-storage-service'

/**
 * Service for agents to access and query data files
 */
export class AgentDataService {
  private supabase;
  private agentId: string;
  
  constructor(agentId: string, isServerSide = false) {
    this.agentId = agentId;
    this.supabase = isServerSide ? createServerClient() : createBrowserClient();
  }
  
  /**
   * Get all files that this agent has access to
   */
  async getAccessibleFiles() {
    const { data: permissions, error: permissionsError } = await this.supabase
      .from('file_access_permissions')
      .select('file_id, access_level')
      .eq('agent_id', this.agentId);
    
    if (permissionsError) {
      throw permissionsError;
    }
    
    if (!permissions || permissions.length === 0) {
      return [];
    }
    
    const fileIds = permissions.map(p => p.file_id);
    
    const { data: files, error: filesError } = await this.supabase
      .from('file_uploads')
      .select('*')
      .in('id', fileIds);
    
    if (filesError) {
      throw filesError;
    }
    
    return files || [];
  }
  
  /**
   * Get a specific file by ID if the agent has access
   */
  async getFile(fileId: string) {
    // Check if agent has access to this file
    const { data: permission, error: permissionError } = await this.supabase
      .from('file_access_permissions')
      .select('access_level')
      .eq('agent_id', this.agentId)
      .eq('file_id', fileId)
      .single();
    
    if (permissionError || !permission) {
      throw new Error(`Agent ${this.agentId} does not have access to file ${fileId}`);
    }
    
    // Get file metadata
    const { data: file, error: fileError } = await this.supabase
      .from('file_uploads')
      .select('*')
      .eq('id', fileId)
      .single();
    
    if (fileError || !file) {
      throw new Error(`File ${fileId} not found`);
    }
    
    return file;
  }
  
  /**
   * Download and parse file content
   */
  async getFileContent(fileId: string) {
    const file = await this.getFile(fileId);
    const blob = await supabaseStorageService.downloadFile(file.file_path);
    
    // Parse content based on file type
    switch (file.data_format) {
      case 'csv':
        return this.parseCSV(blob);
      case 'json':
        return this.parseJSON(blob);
      case 'text':
      case 'txt':
        return this.parseText(blob);
      default:
        throw new Error(`Unsupported file format: ${file.data_format}`);
    }
  }
  
  /**
   * Query data from a file using simple parameters
   */
  async queryFileData(fileId: string, query: {
    filter?: Record<string, any>;
    sort?: { field: string; direction: 'asc' | 'desc' };
    limit?: number;
    offset?: number;
  }) {
    const fileContent = await this.getFileContent(fileId);
    
    // Handle array-based data (like CSV or JSON arrays)
    if (Array.isArray(fileContent)) {
      let result = [...fileContent];
      
      // Apply filters
      if (query.filter) {
        result = result.filter(item => {
          return Object.entries(query.filter || {}).every(([key, value]) => {
            return item[key] === value;
          });
        });
      }
      
      // Apply sort
      if (query.sort) {
        result.sort((a, b) => {
          const valueA = a[query.sort!.field];
          const valueB = b[query.sort!.field];
          
          if (valueA < valueB) return query.sort!.direction === 'asc' ? -1 : 1;
          if (valueA > valueB) return query.sort!.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      // Apply pagination
      if (query.offset !== undefined || query.limit !== undefined) {
        const start = query.offset || 0;
        const end = query.limit ? start + query.limit : undefined;
        result = result.slice(start, end);
      }
      
      return result;
    }
    
    // Handle object data (like JSON objects)
    return fileContent;
  }
  
  /**
   * Record agent activity with a file for analytics
   */
  async recordFileAccess(fileId: string, operation: 'read' | 'query') {
    await this.supabase
      .from('agent_file_access_logs')
      .insert({
        agent_id: this.agentId,
        file_id: fileId,
        operation,
        accessed_at: new Date().toISOString()
      });
  }
  
  /**
   * Parse CSV file to array of objects
   */
  private async parseCSV(blob: Blob): Promise<any[]> {
    const text = await blob.text();
    const lines = text.split(/\r?\n/);
    
    if (lines.length === 0) {
      return [];
    }
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Parse rows
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(value => value.trim());
      
      // Skip empty rows
      if (values.length === 1 && values[0] === '') {
        return null;
      }
      
      // Create object with header keys
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      
      return obj;
    }).filter(Boolean) as any[];
    
    return rows;
  }
  
  /**
   * Parse JSON file
   */
  private async parseJSON(blob: Blob): Promise<any> {
    const text = await blob.text();
    return JSON.parse(text);
  }
  
  /**
   * Parse text file
   */
  private async parseText(blob: Blob): Promise<string> {
    return blob.text();
  }
}

export default AgentDataService;