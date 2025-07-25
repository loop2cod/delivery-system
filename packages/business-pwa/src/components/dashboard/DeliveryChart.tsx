'use client';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const deliveryTrends = [
  { date: 'Jan 1', requests: 12, delivered: 11, costs: 540 },
  { date: 'Jan 2', requests: 15, delivered: 14, costs: 675 },
  { date: 'Jan 3', requests: 8, delivered: 8, costs: 360 },
  { date: 'Jan 4', requests: 22, delivered: 20, costs: 990 },
  { date: 'Jan 5', requests: 18, delivered: 17, costs: 810 },
  { date: 'Jan 6', requests: 25, delivered: 24, costs: 1125 },
  { date: 'Jan 7', requests: 14, delivered: 13, costs: 630 },
  { date: 'Jan 8', requests: 19, delivered: 18, costs: 855 },
  { date: 'Jan 9', requests: 16, delivered: 16, costs: 720 },
  { date: 'Jan 10', requests: 21, delivered: 19, costs: 945 },
  { date: 'Jan 11', requests: 28, delivered: 26, costs: 1260 },
  { date: 'Jan 12', requests: 17, delivered: 17, costs: 765 },
  { date: 'Jan 13', requests: 23, delivered: 22, costs: 1035 },
  { date: 'Jan 14', requests: 20, delivered: 19, costs: 900 },
];

const serviceTypes = [
  { name: 'Same-Day', value: 45, color: '#142C4F' },
  { name: 'Express', value: 30, color: '#C32C3C' },
  { name: 'Documents', value: 15, color: '#10B981' },
  { name: 'Fragile Items', value: 7, color: '#F59E0B' },
  { name: 'Inter-Emirate', value: 3, color: '#8B5CF6' },
];

const monthlyComparison = [
  { month: 'Sep', requests: 320, costs: 14400, avgCost: 45 },
  { month: 'Oct', requests: 380, costs: 16720, avgCost: 44 },
  { month: 'Nov', requests: 420, costs: 18480, avgCost: 44 },
  { month: 'Dec', requests: 450, costs: 19800, avgCost: 44 },
  { month: 'Jan', requests: 280, costs: 12450, avgCost: 44.5 },
];

export function DeliveryChart() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Delivery Trends */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Daily Delivery Trends
          </h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-primary rounded-full mr-2"></div>
              <span className="text-gray-600">Requests</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Delivered</span>
            </div>
          </div>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={deliveryTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Line 
                type="monotone" 
                dataKey="requests" 
                stroke="#142C4F" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#142C4F' }}
                activeDot={{ r: 6, fill: '#142C4F' }}
              />
              <Line 
                type="monotone" 
                dataKey="delivered" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 6, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Service Type Distribution */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Service Distribution
          </h3>
          <div className="text-sm text-gray-500">
            Last 30 days
          </div>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={serviceTypes}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {serviceTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Usage']}
                contentStyle={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry) => (
                  <span style={{ color: entry.color, fontSize: '14px' }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Cost Analysis */}
      <div className="bg-white shadow-sm rounded-lg p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Monthly Cost Analysis
          </h3>
          <div className="flex items-center space-x-4 text-sm">
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
        
        <div className="h-80">
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
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">AED 44.5</p>
            <p className="text-sm text-gray-500">Avg Cost per Delivery</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">97.8%</p>
            <p className="text-sm text-gray-500">Success Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">4.2 hrs</p>
            <p className="text-sm text-gray-500">Avg Delivery Time</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">280</p>
            <p className="text-sm text-gray-500">This Month</p>
          </div>
        </div>
      </div>
    </div>
  );
}