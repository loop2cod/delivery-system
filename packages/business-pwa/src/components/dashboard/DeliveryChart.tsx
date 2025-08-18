'use client';

import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface MonthlyData {
  month: string;
  requests: number;
  costs: number;
  avgCost: number;
}

interface CurrentMonthStats {
  avgCost: number;
  successRate: number;
  avgDeliveryTime: string;
  totalRequests: number;
}

interface DeliveryChartProps {
  data?: {
    monthlyComparison?: MonthlyData[];
    currentMonthStats?: CurrentMonthStats;
  };
  loading?: boolean;
}

// Default data for when no backend data is available
const defaultMonthlyComparison = [
  { month: 'Sep', requests: 320, costs: 14400, avgCost: 45 },
  { month: 'Oct', requests: 380, costs: 16720, avgCost: 44 },
  { month: 'Nov', requests: 420, costs: 18480, avgCost: 44 },
  { month: 'Dec', requests: 450, costs: 19800, avgCost: 44 },
  { month: 'Jan', requests: 280, costs: 12450, avgCost: 44.5 },
];

const defaultCurrentMonthStats = {
  avgCost: 44.5,
  successRate: 97.8,
  avgDeliveryTime: '4.2 hrs',
  totalRequests: 280
};

export function DeliveryChart({ data, loading = false }: DeliveryChartProps) {
  const monthlyComparison = data?.monthlyComparison || defaultMonthlyComparison;
  const currentStats = data?.currentMonthStats || defaultCurrentMonthStats;

  if (loading) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-64 sm:h-80 bg-gray-200 rounded" />
        <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-6 sm:h-8 bg-gray-200 rounded w-12 sm:w-16 mx-auto mb-2" />
              <div className="h-3 sm:h-4 bg-gray-200 rounded w-16 sm:w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">
            Monthly Cost Analysis
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-primary rounded-full mr-2"></div>
              <span className="text-gray-600">Requests</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-accent rounded-full mr-2"></div>
              <span className="text-gray-600">Costs (AED)</span>
            </div>
          </div>
        </div>
        
        <div className="h-64 sm:h-80 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis 
                yAxisId="requests"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis 
                yAxisId="costs"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value, name) => {
                  if (name === 'costs') {
                    return [`AED ${value}`, 'Total Costs'];
                  }
                  return [value, name === 'requests' ? 'Requests' : name];
                }}
              />
              <Legend />
              <Bar 
                yAxisId="requests"
                dataKey="requests" 
                fill="#142C4F" 
                name="Requests"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                yAxisId="costs"
                dataKey="costs" 
                fill="#C32C3C" 
                name="Costs (AED)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-lg sm:text-2xl font-bold text-gray-900">AED {currentStats.avgCost}</p>
            <p className="text-xs sm:text-sm text-gray-500">Avg Cost per Delivery</p>
          </div>
          <div className="text-center">
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{currentStats.successRate}%</p>
            <p className="text-xs sm:text-sm text-gray-500">Success Rate</p>
          </div>
          <div className="text-center">
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{currentStats.avgDeliveryTime}</p>
            <p className="text-xs sm:text-sm text-gray-500">Avg Delivery Time</p>
          </div>
          <div className="text-center">
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{currentStats.totalRequests}</p>
            <p className="text-xs sm:text-sm text-gray-500">This Month</p>
          </div>
        </div>
      </div>
  );
}