import { useState, useEffect } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@/utils/supabase/client'
import { Database } from '@/types/database.types'

// Type for agent permissions
export type AgentPermission = {
  agent_id: string
  risk_level: string
  max_trade_size: number
  allowed_markets: string[]
  data_access_level: 'read' | 'write' | 'none'
  created_at: string
  updated_at: string
}

// Hook for getting the Supabase client
export function useSupabase() {
  const [supabase] = useState<SupabaseClient<Database>>(() => createBrowserClient())
  
  return { supabase }
}

// Hook for current user
export function useCurrentUser() {
  const { supabase } = useSupabase()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    const getUser = async () => {
      try {
        setLoading(true)
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          throw error
        }
        
        setUser(user)
      } catch (error) {
        setError(error instanceof Error ? error : new Error('Failed to get user'))
        console.error('Error getting user:', error)
      } finally {
        setLoading(false)
      }
    }
    
    getUser()
    
    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])
  
  return { user, loading, error }
}

// Hook for authentication (alias of useCurrentUser for compatibility)
export function useAuth() {
  return useCurrentUser()
}

// Hook for agent trading permissions
export function useAgentTradingPermissions() {
  const { supabase } = useSupabase()
  const [permissions, setPermissions] = useState<AgentPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const fetchPermissions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('agent_permissions')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      setPermissions(data || [])
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to fetch agent permissions'))
      console.error('Error fetching agent permissions:', error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchPermissions()
    
    // Subscribe to changes in the agent_permissions table
    const channel = supabase
      .channel('agent_permissions_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'agent_permissions' 
      }, () => {
        fetchPermissions()
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])
  
  const updateAgentPermission = async (agentId: string, updates: Partial<AgentPermission>) => {
    try {
      const { error } = await supabase
        .from('agent_permissions')
        .update(updates)
        .eq('agent_id', agentId)
      
      if (error) {
        throw error
      }
      
      // The subscription will trigger a refresh
    } catch (error) {
      throw error
    }
  }
  
  const createAgentPermission = async (newPermission: Omit<AgentPermission, 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('agent_permissions')
        .insert([newPermission])
      
      if (error) {
        throw error
      }
      
      // The subscription will trigger a refresh
    } catch (error) {
      throw error
    }
  }
  
  const deleteAgentPermission = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('agent_permissions')
        .delete()
        .eq('agent_id', agentId)
      
      if (error) {
        throw error
      }
      
      // The subscription will trigger a refresh
    } catch (error) {
      throw error
    }
  }
  
  return { 
    permissions, 
    loading, 
    error, 
    refresh: fetchPermissions,
    updateAgentPermission,
    createAgentPermission,
    deleteAgentPermission
  }
}

// Hook for file access permissions
export function useFileAccessPermissions(fileId?: string) {
  const { supabase } = useSupabase()
  const [permissions, setPermissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const fetchPermissions = async () => {
    if (!fileId) {
      setPermissions([])
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('file_access_permissions')
        .select(`
          *,
          agent:agent_id(*)
        `)
        .eq('file_id', fileId)
      
      if (error) {
        throw error
      }
      
      setPermissions(data || [])
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to fetch file access permissions'))
      console.error('Error fetching file access permissions:', error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchPermissions()
    
    if (!fileId) return
    
    // Subscribe to changes in the file_access_permissions table
    const channel = supabase
      .channel(`file_access_permissions_${fileId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'file_access_permissions',
        filter: `file_id=eq.${fileId}`
      }, () => {
        fetchPermissions()
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fileId])
  
  const grantAccess = async (agentId: string, accessLevel: 'read' | 'write') => {
    try {
      const { error } = await supabase
        .from('file_access_permissions')
        .upsert({
          file_id: fileId!,
          agent_id: agentId,
          access_level: accessLevel,
          granted_at: new Date().toISOString()
        })
      
      if (error) {
        throw error
      }
      
      // The subscription will trigger a refresh
    } catch (error) {
      throw error
    }
  }
  
  const revokeAccess = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('file_access_permissions')
        .delete()
        .match({
          file_id: fileId!,
          agent_id: agentId
        })
      
      if (error) {
        throw error
      }
      
      // The subscription will trigger a refresh
    } catch (error) {
      throw error
    }
  }
  
  return { 
    permissions, 
    loading, 
    error, 
    refresh: fetchPermissions,
    grantAccess,
    revokeAccess
  }
}

// Export all hooks
const SupabaseHooks = {
  useSupabase,
  useCurrentUser,
  useAuth,
  useAgentTradingPermissions,
  useFileAccessPermissions
}

export default SupabaseHooks