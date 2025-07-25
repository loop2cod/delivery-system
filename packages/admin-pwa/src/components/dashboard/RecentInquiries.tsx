'use client';

import { useState } from 'react';
import { 
  EyeIcon, 
  PhoneIcon, 
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface Inquiry {
  id: string;
  customerName: string;
  phone: string;
  service: string;
  pickup: string;
  delivery: string;
  priority: 'normal' | 'urgent' | 'express';
  status: 'new' | 'contacted' | 'quoted' | 'assigned';
  createdAt: string;
  estimatedValue: string;
}

const inquiries: Inquiry[] = [
  {
    id: 'INQ-2024-001',
    customerName: 'Sarah Johnson',
    phone: '+971-50-123-4567',
    service: 'Same-Day Delivery',
    pickup: 'Dubai Mall',
    delivery: 'Business Bay',
    priority: 'urgent',
    status: 'new',
    createdAt: '2 min ago',
    estimatedValue: 'AED 45',
  },
  {
    id: 'INQ-2024-002', 
    customerName: 'Mohammed Al Rashid',
    phone: '+971-56-789-0123',
    service: 'Document Delivery',
    pickup: 'DIFC',
    delivery: 'Abu Dhabi',
    priority: 'express',
    status: 'contacted',
    createdAt: '15 min ago',
    estimatedValue: 'AED 120',
  },
  {
    id: 'INQ-2024-003',
    customerName: 'Fatima Hassan',
    phone: '+971-52-456-7890',
    service: 'Fragile Items',
    pickup: 'Sharjah City Centre',
    delivery: 'Ajman',
    priority: 'normal',
    status: 'quoted',
    createdAt: '1 hour ago',
    estimatedValue: 'AED 85',
  },
  {
    id: 'INQ-2024-004',
    customerName: 'Ahmed Ali',
    phone: '+971-50-987-6543',
    service: 'Express Delivery',
    pickup: 'Marina Mall',
    delivery: 'Al Ain',
    priority: 'express',
    status: 'assigned',
    createdAt: '2 hours ago',
    estimatedValue: 'AED 180',
  },
];

const priorityColors = {
  normal: 'bg-gray-100 text-gray-800',
  urgent: 'bg-red-100 text-red-800',
  express: 'bg-purple-100 text-purple-800',
};

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  quoted: 'bg-indigo-100 text-indigo-800',
  assigned: 'bg-green-100 text-green-800',
};

export function RecentInquiries() {
  const [selectedInquiry, setSelectedInquiry] = useState<string | null>(null);

  const handleAction = (inquiryId: string, action: string) => {
    console.log(`${action} inquiry ${inquiryId}`);
    // Implement action logic here
  };

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Recent Inquiries
          </h3>
          <button className="text-sm font-medium text-primary hover:text-primary/80">
            View all inquiries
          </button>
        </div>

        <div className="flow-root">
          <ul role="list" className="-mb-8">
            {inquiries.map((inquiry, index) => (
              <li key={inquiry.id}>
                <div className="relative pb-8">
                  {index !== inquiries.length - 1 && (
                    <span
                      className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className={clsx(
                        'h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm',
                        inquiry.priority === 'urgent' ? 'bg-red-500' :
                        inquiry.priority === 'express' ? 'bg-purple-500' : 'bg-gray-500'
                      )}>
                        {inquiry.customerName.split(' ').map(n => n[0]).join('')}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {inquiry.customerName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {inquiry.service} • {inquiry.estimatedValue}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={clsx(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            priorityColors[inquiry.priority]
                          )}>
                            {inquiry.priority}
                          </span>
                          <span className={clsx(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            statusColors[inquiry.status]
                          )}>
                            {inquiry.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-700">
                        <p>
                          <span className="font-medium">From:</span> {inquiry.pickup}
                        </p>
                        <p>
                          <span className="font-medium">To:</span> {inquiry.delivery}
                        </p>
                        <div className="flex items-center mt-1">
                          <PhoneIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-gray-500">{inquiry.phone}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {inquiry.createdAt}
                        </p>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleAction(inquiry.id, 'view')}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-primary bg-primary/10 hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View
                          </button>
                          
                          {inquiry.status === 'new' && (
                            <>
                              <button
                                onClick={() => handleAction(inquiry.id, 'accept')}
                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                <CheckIcon className="h-4 w-4 mr-1" />
                                Accept
                              </button>
                              <button
                                onClick={() => handleAction(inquiry.id, 'decline')}
                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                <XMarkIcon className="h-4 w-4 mr-1" />
                                Decline
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}