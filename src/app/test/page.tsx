'use client';

import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  status: string;
  strategy: string;
  cash: number;
  total_value: number;
}

export default function TestPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('http://localhost:9000/agents');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAgents(data.agents || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch agents');
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
    const interval = setInterval(fetchAgents, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">🧪 System Test Page</h1>
        <p>Loading AI services...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">🧪 System Test Page</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
        <p className="mt-4">
          Make sure AI services are running on http://localhost:9000
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">🧪 System Test Page</h1>
      
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
        ✅ Next.js dashboard is working!
      </div>

      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-6">
        ✅ AI services connection successful! Found {agents.length} trading agents.
      </div>

      <h2 className="text-xl font-semibold mb-4">🤖 Active Trading Agents</h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        {agents.map((agent) => (
          <div key={agent.id} className="border rounded-lg p-4 bg-white shadow">
            <h3 className="font-semibold text-lg">{agent.name}</h3>
            <p className="text-gray-600">Strategy: {agent.strategy}</p>
            <p className="text-gray-600">Status: <span className="font-medium text-green-600">{agent.status}</span></p>
            <p className="text-gray-600">Cash: <span className="font-medium">${agent.cash.toLocaleString()}</span></p>
            <p className="text-gray-600">Portfolio Value: <span className="font-medium">${agent.total_value.toLocaleString()}</span></p>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">🔗 Quick Links</h3>
        <ul className="space-y-1">
          <li><a href="http://localhost:9000" target="_blank" className="text-blue-600 hover:underline">AI Services API</a></li>
          <li><a href="http://localhost:9000/health" target="_blank" className="text-blue-600 hover:underline">Health Check</a></li>
          <li><a href="http://localhost:9000/agents" target="_blank" className="text-blue-600 hover:underline">Agents API</a></li>
          <li><a href="http://localhost:9000/trades" target="_blank" className="text-blue-600 hover:underline">Trades API</a></li>
          <li><a href="/dashboard/overview" className="text-blue-600 hover:underline">Dashboard Overview</a></li>
        </ul>
      </div>
    </div>
  );
}