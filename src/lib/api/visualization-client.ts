import axios from 'axios';
import { toast } from 'react-hot-toast';

const VISUALIZATION_API_BASE = process.env.NEXT_PUBLIC_VIZ_API_URL || 'http://localhost:8002';

export interface ChartRequest {
  chart_type: string;
  symbols?: string[];
  timeframe?: string;
  strategy_ids?: string[];
  theme?: 'dark' | 'light';
}

export interface ChartResponse {
  chart: string; // JSON string of Plotly chart
  type: string;
  symbol?: string;
}

export interface VisualizationError {
  message: string;
  status: number;
  detail?: string;
}

class VisualizationClient {
  private client = axios.create({
    baseURL: VISUALIZATION_API_BASE,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        console.error('Visualization API request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        const message = error.response?.data?.detail || error.message || 'Visualization service error';
        
        console.error('Visualization API error:', {
          status: error.response?.status,
          message,
          url: error.config?.url,
        });

        toast.error(`Chart Error: ${message}`);
        
        return Promise.reject({
          message,
          status: error.response?.status || 500,
          detail: error.response?.data?.detail,
        } as VisualizationError);
      }
    );
  }

  async healthCheck(): Promise<{ status: string; service: string }> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getPortfolioPerformanceChart(request: Partial<ChartRequest> = {}): Promise<ChartResponse> {
    try {
      const response = await this.client.post('/api/charts/portfolio-performance', {
        chart_type: 'portfolio_performance',
        theme: 'dark',
        ...request,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getCandlestickChart(symbol: string, request: Partial<ChartRequest> = {}): Promise<ChartResponse> {
    try {
      const response = await this.client.post('/api/charts/candlestick', {
        chart_type: 'candlestick',
        symbols: [symbol],
        theme: 'dark',
        timeframe: '1d',
        ...request,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getStrategyComparisonChart(request: Partial<ChartRequest> = {}): Promise<ChartResponse> {
    try {
      const response = await this.client.post('/api/charts/strategy-comparison', {
        chart_type: 'strategy_comparison',
        theme: 'dark',
        ...request,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getRiskHeatmapChart(request: Partial<ChartRequest> = {}): Promise<ChartResponse> {
    try {
      const response = await this.client.post('/api/charts/risk-heatmap', {
        chart_type: 'risk_heatmap',
        theme: 'dark',
        ...request,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getRealTimePnLChart(request: Partial<ChartRequest> = {}): Promise<ChartResponse> {
    try {
      const response = await this.client.post('/api/charts/real-time-pnl', {
        chart_type: 'real_time_pnl',
        theme: 'dark',
        ...request,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Batch chart requests for dashboard
  async getBatchCharts(requests: { [key: string]: Partial<ChartRequest> }): Promise<{ [key: string]: ChartResponse }> {
    try {
      const chartEntries = await Promise.allSettled(
        Object.entries(requests).map(async ([key, request]): Promise<[string, ChartResponse]> => {
          let chartPromise: Promise<ChartResponse>;
          
          switch (request.chart_type) {
            case 'portfolio_performance':
              chartPromise = this.getPortfolioPerformanceChart(request);
              break;
            case 'candlestick':
              chartPromise = this.getCandlestickChart(request.symbols?.[0] || 'AAPL', request);
              break;
            case 'strategy_comparison':
              chartPromise = this.getStrategyComparisonChart(request);
              break;
            case 'risk_heatmap':
              chartPromise = this.getRiskHeatmapChart(request);
              break;
            case 'real_time_pnl':
              chartPromise = this.getRealTimePnLChart(request);
              break;
            default:
              throw new Error(`Unknown chart type: ${request.chart_type}`);
          }
          
          const result = await chartPromise;
          return [key, result];
        })
      );

      const charts: { [key: string]: ChartResponse } = {};
      
      chartEntries.forEach((result, index) => {
        const [key] = Object.entries(requests)[index];
        if (result.status === 'fulfilled') {
          const [chartKey, chartData] = result.value;
          charts[chartKey] = chartData;
        } else {
          console.error(`Failed to load chart ${key}:`, result.reason);
          // Optionally add error placeholders
        }
      });

      return charts;
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const visualizationClient = new VisualizationClient();
export default visualizationClient; 