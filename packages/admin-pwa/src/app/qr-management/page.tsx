'use client';

import React, { useState, useEffect } from 'react';

// Temporary types until shared components are implemented
interface QRCodeData {
  type: 'package' | 'delivery' | 'inquiry' | 'tracking';
  id: string;
  metadata?: Record<string, any>;
}

interface QRItem {
  id: string;
  type: QRCodeData['type'];
  status: string;
  createdAt: string;
  scannedAt?: string;
  metadata?: Record<string, any>;
}

export default function QRManagementPage() {
  const [activeTab, setActiveTab] = useState<'generate' | 'scan' | 'history'>('generate');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrItems, setQrItems] = useState<QRItem[]>([]);
  const [selectedType, setSelectedType] = useState<QRCodeData['type']>('package');
  const [selectedId, setSelectedId] = useState('');
  const [scanHistory, setScanHistory] = useState<Array<{
    data: QRCodeData;
    timestamp: number;
    user: string;
  }>>([]);

  // Generate QR form state
  const [generateForm, setGenerateForm] = useState({
    type: 'package' as QRCodeData['type'],
    id: '',
    metadata: {}
  });

  // Batch generation state
  const [batchItems, setBatchItems] = useState<Array<{
    type: QRCodeData['type'];
    id: string;
    metadata?: Record<string, any>;
  }>>([]);

  useEffect(() => {
    loadQRHistory();
  }, []);

  const loadQRHistory = async () => {
    try {
      const response = await fetch('/api/qr/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQrItems(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load QR history:', error);
    }
  };

  const handleGenerateQR = async () => {
    try {
      const response = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(generateForm)
      });

      if (response.ok) {
        const result = await response.json();
        alert('QR Code generated successfully!');
        setGenerateForm({ type: 'package', id: '', metadata: {} });
        loadQRHistory();
      } else {
        const error = await response.json();
        alert(`Generation failed: ${error.message}`);
      }
    } catch (error) {
      console.error('QR generation failed:', error);
      alert('Failed to generate QR code');
    }
  };

  const handleBatchGenerate = async () => {
    if (batchItems.length === 0) return;

    try {
      const response = await fetch('/api/qr/generate/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          items: batchItems,
          options: { size: 256 }
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Generated ${result.count} QR codes successfully!`);
        setBatchItems([]);
        loadQRHistory();
      } else {
        const error = await response.json();
        alert(`Batch generation failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Batch generation failed:', error);
      alert('Failed to generate batch QR codes');
    }
  };

  const handleScan = async (qrData: QRCodeData) => {
    try {
      const response = await fetch('/api/qr/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          content: JSON.stringify(qrData),
          scannerId: 'admin-app'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setScanHistory(prev => [{
          data: qrData,
          timestamp: Date.now(),
          user: 'Admin'
        }, ...prev.slice(0, 9)]);
        
        alert(`QR Code scanned: ${qrData.type} - ${qrData.id}`);
      } else {
        const error = await response.json();
        alert(`Scan failed: ${error.message}`);
      }
    } catch (error) {
      console.error('QR scan failed:', error);
      alert('Failed to process QR scan');
    }
  };

  const handleScanError = (error: string) => {
    console.error('QR Scan Error:', error);
    alert(`Scan error: ${error}`);
  };

  const addBatchItem = () => {
    if (!generateForm.id) return;
    
    setBatchItems(prev => [...prev, {
      type: generateForm.type,
      id: generateForm.id,
      metadata: generateForm.metadata
    }]);
    
    setGenerateForm(prev => ({ ...prev, id: '' }));
  };

  const removeBatchItem = (index: number) => {
    setBatchItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#142C4F] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold">QR Code Management</h1>
          <p className="mt-2 text-blue-100">Generate and manage QR codes for packages, deliveries, and inquiries</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'generate', label: 'Generate QR Codes', icon: '📄' },
              { id: 'scan', label: 'Scan QR Codes', icon: '📱' },
              { id: 'history', label: 'History & Analytics', icon: '📊' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-[#C32C3C] text-[#C32C3C]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Single Generation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Generate Single QR Code</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={generateForm.type}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, type: e.target.value as QRCodeData['type'] }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#142C4F] focus:border-transparent"
                  >
                    <option value="package">Package Tracking</option>
                    <option value="delivery">Delivery Confirmation</option>
                    <option value="inquiry">Inquiry Status</option>
                    <option value="tracking">General Tracking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                  <input
                    type="text"
                    value={generateForm.id}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, id: e.target.value }))}
                    placeholder="Enter package/delivery/inquiry ID"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#142C4F] focus:border-transparent"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateQR}
                    disabled={!generateForm.id}
                    className="flex-1 bg-[#C32C3C] text-white py-2 px-4 rounded-md hover:bg-[#a82633] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Generate QR Code
                  </button>
                  <button
                    onClick={addBatchItem}
                    disabled={!generateForm.id}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                  >
                    Add to Batch
                  </button>
                </div>
              </div>

              {/* QR Code Generator Preview */}
              {generateForm.id && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
                  <div className="bg-gray-100 p-4 rounded-lg text-center text-gray-500">
                    <div className="text-4xl mb-2">🔳</div>
                    <p>QR Preview</p>
                    <p className="text-sm">{generateForm.type}: {generateForm.id}</p>
                    <p className="text-xs mt-2 text-gray-400">QR components will be implemented</p>
                  </div>
                </div>
              )}
            </div>

            {/* Batch Generation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Batch Generation</h2>
              
              {batchItems.length > 0 && (
                <div className="mb-4">
                  <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                      {batchItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                          <span className="text-sm">
                            <span className="font-medium">{item.type}</span>: {item.id}
                          </span>
                          <button
                            onClick={() => removeBatchItem(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <button
                      onClick={handleBatchGenerate}
                      className="w-full bg-[#142C4F] text-white py-2 px-4 rounded-md hover:bg-[#1e3a5f] transition-colors"
                    >
                      Generate {batchItems.length} QR Codes
                    </button>
                  </div>
                </div>
              )}

              {batchItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📦</div>
                  <p>No items in batch</p>
                  <p className="text-sm">Add items using the form on the left</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scan Tab */}
        {activeTab === 'scan' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Scanner */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">QR Code Scanner</h2>
              
              <button
                onClick={() => setScannerOpen(true)}
                className="w-full bg-[#C32C3C] text-white py-3 px-4 rounded-md hover:bg-[#a82633] transition-colors text-lg font-medium"
              >
                <span className="mr-2">📱</span>
                Open Scanner
              </button>
              
              <div className="mt-4 text-sm text-gray-600">
                <p>• Scan package tracking QR codes</p>
                <p>• Scan delivery confirmation codes</p>
                <p>• Scan inquiry status codes</p>
                <p>• View detailed item information</p>
              </div>
            </div>

            {/* Scan History */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Scans</h2>
              
              {scanHistory.length > 0 ? (
                <div className="space-y-3">
                  {scanHistory.map((scan, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{scan.data.type}</span>
                          <span className="text-gray-500 text-sm ml-2">{scan.data.id}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(scan.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Scanned by: {scan.user}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🔍</div>
                  <p>No recent scans</p>
                  <p className="text-sm">Start scanning QR codes to see history</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">QR Code History</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Scan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {qrItems.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{item.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.scannedAt ? new Date(item.scannedAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-[#C32C3C] hover:text-[#a82633] mr-3">View</button>
                        <button className="text-gray-600 hover:text-gray-900">Regenerate</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {qrItems.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📋</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No QR codes generated yet</h3>
                  <p className="text-gray-500">Start generating QR codes to see them here</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QR Scanner Modal - Placeholder */}
      {scannerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">📱</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">QR Scanner</h3>
              <p className="text-gray-500 mb-4">QR Scanner component will be implemented</p>
              <button
                onClick={() => setScannerOpen(false)}
                className="bg-[#C32C3C] text-white py-2 px-4 rounded-md hover:bg-[#a82633]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}