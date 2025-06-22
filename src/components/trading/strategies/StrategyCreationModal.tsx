'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, AlertCircle, TrendingUp, Shield, DollarSign } from 'lucide-react';

interface StrategyCreationModalProps {
  onCreateStrategy: (strategy: any) => void;
}

export function StrategyCreationModal({ onCreateStrategy }: StrategyCreationModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    riskLevel: 'medium',
    targetReturn: '',
    stopLoss: '',
    takeProfit: '',
    allocation: '',
    enabled: true,
    indicators: [] as string[],
  });

  const strategyTypes = [
    { value: 'momentum', label: 'Momentum Trading', icon: TrendingUp },
    { value: 'meanReversion', label: 'Mean Reversion', icon: Shield },
    { value: 'arbitrage', label: 'Arbitrage', icon: DollarSign },
    { value: 'grid', label: 'Grid Trading', icon: Shield },
    { value: 'dca', label: 'Dollar Cost Averaging', icon: DollarSign },
  ];

  const indicators = [
    'RSI', 'MACD', 'EMA', 'SMA', 'Bollinger Bands', 
    'Stochastic', 'Volume', 'ATR', 'Fibonacci'
  ];

  const handleSubmit = () => {
    // Validate form
    if (!formData.name || !formData.type) {
      return;
    }

    onCreateStrategy({
      ...formData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: formData.enabled ? 'active' : 'inactive',
    });

    // Reset form and close modal
    setFormData({
      name: '',
      type: '',
      description: '',
      riskLevel: 'medium',
      targetReturn: '',
      stopLoss: '',
      takeProfit: '',
      allocation: '',
      enabled: true,
      indicators: [],
    });
    setOpen(false);
  };

  const toggleIndicator = (indicator: string) => {
    setFormData(prev => ({
      ...prev,
      indicators: prev.indicators.includes(indicator)
        ? prev.indicators.filter(i => i !== indicator)
        : [...prev.indicators, indicator]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <Plus className="mr-2 h-4 w-4" />
          Create Strategy
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create New Trading Strategy
          </DialogTitle>
          <DialogDescription>
            Configure your automated trading strategy with advanced parameters
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="grid gap-2">
              <Label htmlFor="name">Strategy Name</Label>
              <Input
                id="name"
                placeholder="My Momentum Strategy"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-gray-700 focus:border-blue-500"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Strategy Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="border-gray-700">
                  <SelectValue placeholder="Select strategy type" />
                </SelectTrigger>
                <SelectContent>
                  {strategyTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center">
                        <type.icon className="mr-2 h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your strategy..."
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                className="border-gray-700 focus:border-blue-500 min-h-[80px]"
              />
            </div>
          </div>

          <Separator />

          {/* Risk Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Risk Management</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="riskLevel">Risk Level</Label>
                <Select
                  value={formData.riskLevel}
                  onValueChange={(value) => setFormData({ ...formData, riskLevel: value })}
                >
                  <SelectTrigger className="border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="allocation">Portfolio Allocation (%)</Label>
                <Input
                  id="allocation"
                  type="number"
                  placeholder="20"
                  value={formData.allocation}
                  onChange={(e) => setFormData({ ...formData, allocation: e.target.value })}
                  className="border-gray-700 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stopLoss">Stop Loss (%)</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  placeholder="5"
                  value={formData.stopLoss}
                  onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                  className="border-gray-700 focus:border-blue-500"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="takeProfit">Take Profit (%)</Label>
                <Input
                  id="takeProfit"
                  type="number"
                  placeholder="15"
                  value={formData.takeProfit}
                  onChange={(e) => setFormData({ ...formData, takeProfit: e.target.value })}
                  className="border-gray-700 focus:border-blue-500"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="targetReturn">Target Return (%)</Label>
                <Input
                  id="targetReturn"
                  type="number"
                  placeholder="10"
                  value={formData.targetReturn}
                  onChange={(e) => setFormData({ ...formData, targetReturn: e.target.value })}
                  className="border-gray-700 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Technical Indicators */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Technical Indicators</h3>
            <div className="flex flex-wrap gap-2">
              {indicators.map((indicator) => (
                <Badge
                  key={indicator}
                  variant={formData.indicators.includes(indicator) ? "default" : "outline"}
                  className="cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => toggleIndicator(indicator)}
                >
                  {indicator}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Activation */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Activate Strategy</Label>
              <p className="text-sm text-muted-foreground">
                Enable this strategy immediately after creation
              </p>
            </div>
            <Switch
              checked={formData.enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
            />
          </div>

          {/* Warning */}
          <Alert className="border-yellow-600 bg-yellow-600/10">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-600">
              This is a paper trading strategy. No real funds will be used.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            Create Strategy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 