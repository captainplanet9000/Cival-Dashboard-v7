/**
 * Authentication Service for Cival Trading Platform
 * Handles JWT tokens, session management, and Supabase Auth integration
 */

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/utils/supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export interface AuthUser {
  id: string
  email?: string
  name?: string
  role?: 'trader' | 'admin' | 'viewer'
  permissions?: string[]
  trading_enabled?: boolean
  created_at?: string
}

export interface AuthSession {
  user: AuthUser
  access_token: string
  refresh_token?: string
  expires_at: number
}

class AuthenticationService {
  private supabase = createBrowserClient()
  private currentSession: AuthSession | null = null
  private sessionListeners: ((session: AuthSession | null) => void)[] = []

  constructor() {
    this.initializeAuth()
  }

  /**
   * Initialize authentication state
   */
  private async initializeAuth() {
    try {
      // Check for existing session
      const { data: { session }, error } = await this.supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        return
      }

      if (session) {
        this.currentSession = this.transformSession(session)
        this.notifySessionListeners()
      }

      // Listen for auth changes
      this.supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event)
        
        if (session) {
          this.currentSession = this.transformSession(session)
        } else {
          this.currentSession = null
        }
        
        this.notifySessionListeners()
      })

    } catch (error) {
      console.error('Failed to initialize auth:', error)
    }
  }

  /**
   * Transform Supabase session to our AuthSession format
   */
  private transformSession(session: Session): AuthSession {
    const user: AuthUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.name || session.user.email,
      role: session.user.user_metadata?.role || 'trader',
      permissions: session.user.user_metadata?.permissions || ['read', 'trade'],
      trading_enabled: session.user.user_metadata?.trading_enabled || true,
      created_at: session.user.created_at
    }

    return {
      user,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at || Date.now() / 1000 + 3600
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.session) {
        this.currentSession = this.transformSession(data.session)
        this.notifySessionListeners()
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sign in failed' 
      }
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, metadata?: any): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'trader',
            trading_enabled: true,
            permissions: ['read', 'trade'],
            ...metadata
          }
        }
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sign up failed' 
      }
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.signOut()
      
      if (error) {
        return { success: false, error: error.message }
      }

      this.currentSession = null
      this.notifySessionListeners()
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sign out failed' 
      }
    }
  }

  /**
   * Get current session
   */
  getSession(): AuthSession | null {
    return this.currentSession
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentSession?.user || null
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (!this.currentSession) return false
    
    // Check if token is expired
    const now = Date.now() / 1000
    return this.currentSession.expires_at > now
  }

  /**
   * Get access token for API calls
   */
  getAccessToken(): string | null {
    if (!this.isAuthenticated()) return null
    return this.currentSession?.access_token || null
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession()
      
      if (error) {
        return { success: false, error: error.message }
      }

      if (data.session) {
        this.currentSession = this.transformSession(data.session)
        this.notifySessionListeners()
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Session refresh failed' 
      }
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser()
    if (!user) return false
    
    return user.permissions?.includes(permission) || user.role === 'admin'
  }

  /**
   * Check if user can trade
   */
  canTrade(): boolean {
    const user = this.getCurrentUser()
    if (!user) return false
    
    return user.trading_enabled === true && this.hasPermission('trade')
  }

  /**
   * Add session change listener
   */
  onSessionChange(callback: (session: AuthSession | null) => void): () => void {
    this.sessionListeners.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.sessionListeners.indexOf(callback)
      if (index > -1) {
        this.sessionListeners.splice(index, 1)
      }
    }
  }

  /**
   * Notify all session listeners
   */
  private notifySessionListeners() {
    this.sessionListeners.forEach(listener => {
      try {
        listener(this.currentSession)
      } catch (error) {
        console.error('Error in session listener:', error)
      }
    })
  }

  /**
   * Get authorization header for API calls
   */
  getAuthHeader(): Record<string, string> {
    const token = this.getAccessToken()
    if (!token) return {}
    
    return {
      'Authorization': `Bearer ${token}`
    }
  }

  /**
   * Create a mock session for development
   */
  createMockSession(): AuthSession {
    const mockUser: AuthUser = {
      id: 'mock-user-' + Date.now(),
      email: 'trader@cival.ai',
      name: 'Mock Trader',
      role: 'trader',
      permissions: ['read', 'trade', 'analyze'],
      trading_enabled: true,
      created_at: new Date().toISOString()
    }

    return {
      user: mockUser,
      access_token: 'mock-jwt-token-' + Date.now(),
      expires_at: Date.now() / 1000 + 86400 // 24 hours
    }
  }

  /**
   * Enable mock mode for development
   */
  enableMockMode() {
    console.log('🔧 Auth: Mock mode enabled for development')
    this.currentSession = this.createMockSession()
    this.notifySessionListeners()
  }

  /**
   * Disable mock mode
   */
  disableMockMode() {
    console.log('🔧 Auth: Mock mode disabled')
    this.currentSession = null
    this.notifySessionListeners()
  }
}

// Create singleton instance
export const authService = new AuthenticationService()

// Export hooks for React components
export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(authService.getSession())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Set initial state
    setSession(authService.getSession())
    setLoading(false)

    // Subscribe to session changes
    const unsubscribe = authService.onSessionChange((newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  return {
    session,
    user: session?.user || null,
    loading,
    isAuthenticated: authService.isAuthenticated(),
    canTrade: authService.canTrade(),
    hasPermission: (permission: string) => authService.hasPermission(permission),
    signIn: authService.signIn.bind(authService),
    signUp: authService.signUp.bind(authService),
    signOut: authService.signOut.bind(authService),
    refreshSession: authService.refreshSession.bind(authService),
    getAccessToken: authService.getAccessToken.bind(authService),
    getAuthHeader: authService.getAuthHeader.bind(authService)
  }
}

// Export default
export default authService