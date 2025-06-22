import { NextRequest, NextResponse } from 'next/server';

// Mock AI analysis data
const generateAIAnalysis = () => {
  const symbols = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'GOOGL', 'META'];
  const actions = ['BUY', 'SELL', 'HOLD'];
  const confidenceLevels = ['HIGH', 'MEDIUM', 'LOW'];
  
  return symbols.map(symbol => {
    const action = actions[Math.floor(Math.random() * actions.length)];
    const confidence = confidenceLevels[Math.floor(Math.random() * confidenceLevels.length)];
    const price = 100 + Math.random() * 400;
    const targetPrice = price * (1 + (Math.random() - 0.5) * 0.2);
    const stopLoss = price * (1 - Math.random() * 0.1);
    
    const reasons = [
      'Strong technical momentum detected',
      'Earnings beat expectations',
      'Volume surge indicates institutional buying',
      'Breaking key resistance level',
      'RSI oversold condition',
      'Bullish divergence on MACD',
      'Strong sector performance',
      'Positive analyst sentiment shift'
    ];
    
    const risks = [
      'Market volatility concerns',
      'Potential profit-taking pressure',
      'Economic uncertainty',
      'Sector rotation risk',
      'Overbought technical conditions',
      'News-driven volatility'
    ];
    
    return {
      symbol,
      action,
      confidence,
      currentPrice: Math.round(price * 100) / 100,
      targetPrice: Math.round(targetPrice * 100) / 100,
      stopLoss: Math.round(stopLoss * 100) / 100,
      timeframe: ['1D', '3D', '1W', '2W'][Math.floor(Math.random() * 4)],
      probability: Math.round((60 + Math.random() * 35) * 100) / 100,
      reasoning: reasons.slice(0, Math.floor(Math.random() * 3) + 1),
      risks: risks.slice(0, Math.floor(Math.random() * 2) + 1),
      aiModel: 'Claude-3.5-Sonnet',
      timestamp: new Date().toISOString(),
      analysisId: `ai-${symbol}-${Date.now()}`,
    };
  });
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const timeframe = searchParams.get('timeframe') || '1D';
    
    const analyses = generateAIAnalysis();
    
    if (symbol) {
      const analysis = analyses.find(a => a.symbol === symbol.toUpperCase());
      if (!analysis) {
        return NextResponse.json(
          { success: false, error: 'Symbol analysis not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString(),
      });
    }
    
    return NextResponse.json({
      success: true,
      data: analyses,
      systemStatus: {
        aiServiceOnline: true,
        modelsAvailable: ['Claude-3.5-Sonnet', 'GPT-4-Turbo', 'Gemini-Pro'],
        analysisGenerated: analyses.length,
        lastUpdate: new Date().toISOString(),
        responseTime: '234ms',
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('AI Analysis API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch AI analysis',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, query } = body;
    
    // Call AutoGen trading analysis
    try {
      const autogenResponse = await fetch('http://localhost:9000/api/v1/autogen/trading/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: symbol || 'AAPL',
          context: { query, user_request: query }
        }),
      });
      
      if (autogenResponse.ok) {
        const autogenData = await autogenResponse.json();
        
        const aiResponse = {
          query,
          symbol: autogenData.symbol || symbol,
          response: `AutoGen Analysis: ${autogenData.strategy || 'Multi-agent analysis completed'}\n\nRecommendation: ${autogenData.recommendation}\nConfidence: ${(autogenData.confidence * 100).toFixed(1)}%\nRisk Level: ${autogenData.risk_level}\n\nEntry: $${autogenData.entry_price}\nStop Loss: $${autogenData.stop_loss}\nTake Profit: $${autogenData.take_profit}`,
          confidence: (autogenData.confidence * 100) || 75,
          processingTime: '2.3s',
          model: 'AutoGen Multi-Agent System',
          timestamp: new Date().toISOString(),
          autogenData: autogenData, // Include full AutoGen response
        };
        
        return NextResponse.json({
          success: true,
          data: aiResponse,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error('AutoGen service unavailable');
      }
      
    } catch (autogenError) {
      console.warn('AutoGen service unavailable, falling back to simulation:', autogenError);
      
      // Fallback to simulation if AutoGen is not available
      const responses = [
        `Based on current technical analysis for ${symbol}, I'm seeing strong bullish momentum with RSI indicating oversold conditions. The stock has broken above key resistance at $${(Math.random() * 300 + 100).toFixed(2)}.`,
        `Market sentiment for ${symbol} appears mixed. While fundamentals remain strong, short-term technical indicators suggest consolidation. Consider dollar-cost averaging.`,
        `${symbol} is showing signs of institutional accumulation. Volume patterns indicate smart money positioning for a potential breakout above $${(Math.random() * 400 + 150).toFixed(2)}.`,
        `Risk assessment for ${symbol}: Medium. Current volatility is within normal ranges, but watch for earnings announcement impact on option pricing.`
      ];
      
      const aiResponse = {
        query,
        symbol,
        response: responses[Math.floor(Math.random() * responses.length)],
        confidence: Math.round((70 + Math.random() * 25) * 100) / 100,
        processingTime: '1.2s',
        model: 'Simulated Analysis (AutoGen Unavailable)',
        timestamp: new Date().toISOString(),
      };
      
      return NextResponse.json({
        success: true,
        data: aiResponse,
        timestamp: new Date().toISOString(),
      });
    }
    
  } catch (error) {
    console.error('AI Query error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process AI query',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}