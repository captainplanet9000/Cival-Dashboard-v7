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
import { Input } from "@/components/ui/input"
import { 
  Bot, 
  Database, 
  FileText, 
  InfoIcon, 
  Settings, 
  Activity,
  ArrowUpRightFromCircle
} from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"
import AgentDataBrowser from '@/components/agent/AgentDataBrowser'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

// Demo agents for the page
const DEMO_AGENTS = [
  { id: 'trend-follower-01', name: 'Trend Follower', type: 'Momentum', risk: 'Medium' },
  { id: 'mean-reversion-01', name: 'Mean Reversion', type: 'Statistical', risk: 'Low' },
  { id: 'arbitrage-bot-01', name: 'Arbitrage Bot', type: 'Market Neutral', risk: 'Low' },
  { id: 'sentiment-trader-01', name: 'Sentiment Trader', type: 'Fundamental', risk: 'High' },
  { id: 'options-strategist-01', name: 'Options Strategist', type: 'Derivatives', risk: 'High' },
]

const AgentDataAccessPage = () => {
  const { toast } = useToast()
  const [selectedAgentId, setSelectedAgentId] = useState<string>(DEMO_AGENTS[0].id)
  const [selectedData, setSelectedData] = useState<any | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationLog, setSimulationLog] = useState<string[]>([])
  
  const selectedAgent = DEMO_AGENTS.find(agent => agent.id === selectedAgentId)
  
  // Handle data selection from the AgentDataBrowser
  const handleDataSelect = (data: any) => {
    setSelectedData(data)
    
    toast({
      title: "Data selected",
      description: `Agent ${selectedAgent?.name} has selected data for analysis.`,
    })
  }
  
  // Handle agent selection
  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId)
    setSelectedData(null)
    setSimulationLog([])
  }
  
  // Simulate agent processing data
  const handleSimulateAgentProcessing = () => {
    if (!selectedData) return
    
    setIsSimulating(true)
    setSimulationLog([`[${new Date().toLocaleTimeString()}] Agent ${selectedAgent?.name} starting data analysis...`])
    
    // Simulate agent processing with a staged log output
    setTimeout(() => {
      setSimulationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Parsing data structure...`])
    }, 1000)
    
    setTimeout(() => {
      setSimulationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Extracting relevant indicators...`])
    }, 2000)
    
    setTimeout(() => {
      setSimulationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Applying ${selectedAgent?.type} analysis model...`])
    }, 3000)
    
    setTimeout(() => {
      // Show different outcomes based on agent type
      if (selectedAgent?.type === 'Momentum') {
        setSimulationLog(prev => [
          ...prev, 
          `[${new Date().toLocaleTimeString()}] Detected upward trend in dataset.`,
          `[${new Date().toLocaleTimeString()}] Calculating optimal entry points...`,
          `[${new Date().toLocaleTimeString()}] Generated 3 trading signals based on momentum indicators.`
        ])
      } else if (selectedAgent?.type === 'Statistical') {
        setSimulationLog(prev => [
          ...prev, 
          `[${new Date().toLocaleTimeString()}] Performing mean reversion analysis...`,
          `[${new Date().toLocaleTimeString()}] Identified 2 statistical arbitrage opportunities.`,
          `[${new Date().toLocaleTimeString()}] Generated trading signals with 78% confidence level.`
        ])
      } else {
        setSimulationLog(prev => [
          ...prev, 
          `[${new Date().toLocaleTimeString()}] Analysis complete.`,
          `[${new Date().toLocaleTimeString()}] Identified potential trading opportunities.`,
          `[${new Date().toLocaleTimeString()}] Ready to execute strategy based on data.`
        ])
      }
    }, 4000)
    
    setTimeout(() => {
      setSimulationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Analysis complete. Agent ${selectedAgent?.name} ready for execution.`])
      setIsSimulating(false)
      
      toast({
        title: "Analysis complete",
        description: `Agent ${selectedAgent?.name} has completed data analysis and is ready for trading.`,
      })
    }, 5000)
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Data Access</h1>
          <p className="text-muted-foreground mt-1">
            See how trading agents autonomously access and process your data files
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Agent data browser */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle>Select Agent</CardTitle>
              <CardDescription>
                Choose a trading agent to see how it can access your data
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Select value={selectedAgentId} onValueChange={handleAgentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {DEMO_AGENTS.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center">
                        <span>{agent.name}</span>
                        <Badge 
                          className="ml-2" 
                          variant={
                            agent.risk === 'Low' ? 'outline' : 
                            agent.risk === 'Medium' ? 'secondary' : 
                            'destructive'
                          }
                        >
                          {agent.risk} risk
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="mt-6">
                {selectedAgent && (
                  <AgentDataBrowser 
                    agentId={selectedAgentId} 
                    onDataSelect={handleDataSelect} 
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          {/* Agent info card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                {selectedAgent?.name}
              </CardTitle>
              <CardDescription>
                {selectedAgent?.type} strategy with {selectedAgent?.risk.toLowerCase()} risk profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <h3 className="text-sm font-medium mb-2">Agent Capabilities:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Database className="h-4 w-4 text-primary mt-0.5" />
                    <span>Autonomous data access and processing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-primary mt-0.5" />
                    <span>Multi-format file parsing (CSV, JSON, TXT)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Activity className="h-4 w-4 text-primary mt-0.5" />
                    <span>Real-time market data integration</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Settings className="h-4 w-4 text-primary mt-0.5" />
                    <span>Adaptive trading strategy execution</span>
                  </li>
                </ul>
              </div>
              
              {selectedData ? (
                <div className="space-y-4">
                  <Alert className="bg-primary/10 border-primary/20">
                    <InfoIcon className="h-4 w-4 text-primary" />
                    <AlertTitle>Data Selected</AlertTitle>
                    <AlertDescription>
                      Agent has selected data for analysis
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    className="w-full" 
                    onClick={handleSimulateAgentProcessing}
                    disabled={isSimulating}
                  >
                    {isSimulating ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowUpRightFromCircle className="h-4 w-4 mr-2" />
                        Simulate Processing
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="p-4 border border-dashed rounded-md text-center text-muted-foreground text-sm">
                  No data selected yet. Use the Data Browser to select data for the agent to process.
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Processing log */}
          {simulationLog.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Processing Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-green-400 font-mono text-xs p-4 rounded-md h-[300px] overflow-y-auto">
                  {simulationLog.map((log, index) => (
                    <div key={index} className="mb-1">{log}</div>
                  ))}
                  {isSimulating && (
                    <div className="h-4 border-r-2 border-green-400 animate-pulse">&nbsp;</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Usage instructions */}
      <Card>
        <CardHeader>
          <CardTitle>
            <InfoIcon className="h-5 w-5 inline mr-2" />
            How Agent Data Access Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 border rounded-md">
              <h3 className="font-semibold mb-2 flex items-center">
                <span className="bg-primary/10 text-primary w-6 h-6 rounded-full inline-flex items-center justify-center mr-2">1</span>
                Upload Data Files
              </h3>
              <p className="text-sm text-muted-foreground">
                Use the Data Management section to upload CSV, JSON, and text files to your Supabase database.
              </p>
            </div>
            
            <div className="p-4 border rounded-md">
              <h3 className="font-semibold mb-2 flex items-center">
                <span className="bg-primary/10 text-primary w-6 h-6 rounded-full inline-flex items-center justify-center mr-2">2</span>
                Grant Agent Access
              </h3>
              <p className="text-sm text-muted-foreground">
                Control which agents can access which files by configuring access permissions in the File Manager.
              </p>
            </div>
            
            <div className="p-4 border rounded-md">
              <h3 className="font-semibold mb-2 flex items-center">
                <span className="bg-primary/10 text-primary w-6 h-6 rounded-full inline-flex items-center justify-center mr-2">3</span>
                Autonomous Processing
              </h3>
              <p className="text-sm text-muted-foreground">
                Agents can autonomously browse, query, and analyze data to generate trading insights without manual intervention.
              </p>
            </div>
          </div>
          
          <Alert>
            <AlertTitle>Security Note</AlertTitle>
            <AlertDescription>
              All agent data access is controlled by Row Level Security (RLS) policies in Supabase, ensuring agents can only access the files they have been explicitly granted permission to use.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}

export default AgentDataAccessPage