import { useState, useEffect, useCallback } from 'react'
import AgentDataService from '@/lib/services/agent-data-service'
import { useToast } from '@/components/ui/use-toast'

/**
 * Hook for agents to access data files
 * @param agentId The ID of the agent requesting access
 */
export function useAgentDataAccess(agentId: string) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [accessibleFiles, setAccessibleFiles] = useState<any[]>([])
  const [currentFileData, setCurrentFileData] = useState<any | null>(null)
  const [currentFileId, setCurrentFileId] = useState<string | null>(null)
  
  // Initialize data service
  const dataService = new AgentDataService(agentId)
  
  // Fetch all files this agent has access to
  const fetchAccessibleFiles = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const files = await dataService.getAccessibleFiles()
      setAccessibleFiles(files)
      
      if (files.length > 0) {
        console.log(`Agent ${agentId} has access to ${files.length} files`)
      } else {
        console.log(`Agent ${agentId} has no accessible files`)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch accessible files'))
      console.error('Error fetching accessible files:', err)
      
      toast({
        title: "Data Access Error",
        description: err instanceof Error ? err.message : "Failed to fetch accessible files",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [agentId, dataService, toast])
  
  // Fetch the content of a specific file
  const fetchFileContent = useCallback(async (fileId: string) => {
    try {
      setLoading(true)
      setError(null)
      setCurrentFileId(fileId)
      
      // Log this access for analytics
      await dataService.recordFileAccess(fileId, 'read')
      
      const content = await dataService.getFileContent(fileId)
      setCurrentFileData(content)
      
      return content
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Failed to fetch file content for ${fileId}`))
      console.error(`Error fetching file content for ${fileId}:`, err)
      
      toast({
        title: "Data Access Error",
        description: err instanceof Error ? err.message : `Failed to fetch file content for ${fileId}`,
        variant: "destructive",
      })
      
      return null
    } finally {
      setLoading(false)
    }
  }, [dataService, toast])
  
  // Query data from a specific file
  const queryFile = useCallback(async (
    fileId: string, 
    query: {
      filter?: Record<string, any>;
      sort?: { field: string; direction: 'asc' | 'desc' };
      limit?: number;
      offset?: number;
    }
  ) => {
    try {
      setLoading(true)
      setError(null)
      setCurrentFileId(fileId)
      
      // Log this access for analytics
      await dataService.recordFileAccess(fileId, 'query')
      
      const queryResult = await dataService.queryFileData(fileId, query)
      
      // Don't overwrite current file data - this is just a query
      return queryResult
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Failed to query file ${fileId}`))
      console.error(`Error querying file ${fileId}:`, err)
      
      toast({
        title: "Data Query Error",
        description: err instanceof Error ? err.message : `Failed to query file ${fileId}`,
        variant: "destructive",
      })
      
      return null
    } finally {
      setLoading(false)
    }
  }, [dataService, toast])
  
  // Clear current file data
  const clearFileData = useCallback(() => {
    setCurrentFileData(null)
    setCurrentFileId(null)
  }, [])
  
  // Load available files on initialization
  useEffect(() => {
    fetchAccessibleFiles()
  }, [fetchAccessibleFiles])
  
  return {
    loading,
    error,
    accessibleFiles,
    currentFileData,
    currentFileId,
    fetchAccessibleFiles,
    fetchFileContent,
    queryFile,
    clearFileData
  }
}

export default useAgentDataAccess