'use client';

import { useState } from 'react';
import {
  Phone,
  Mail,
  Building2,
  Clock,
  FileText,
  CheckCircle,
  User,
  Edit,
  X,
} from 'lucide-react';
import { Inquiry, formatDate, getStatusColor, getStatusLabel } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: Inquiry | null;
  onContactCustomer: (inquiry: Inquiry) => void;
  onAcceptInquiry: (inquiry: Inquiry) => void;
  onDeclineInquiry: (inquiry: Inquiry) => void;
  onAssignDriver: (inquiry: Inquiry) => void;
  onUpdateInquiry?: (inquiry: Inquiry, updates: { status?: string; notes?: string }) => void;
}

export function InquiryModal({
  isOpen,
  onClose,
  inquiry,
  onContactCustomer,
  onAcceptInquiry,
  onDeclineInquiry,
  onAssignDriver,
  onUpdateInquiry,
}: InquiryModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editableStatus, setEditableStatus] = useState('');
  const [editableNotes, setEditableNotes] = useState('');

  if (!inquiry) return null;

  const createdDate = formatDate(inquiry.created_at);
  const updatedDate = formatDate(inquiry.updated_at);

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditableStatus(inquiry.status);
      setEditableNotes('');
    }
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = () => {
    if (onUpdateInquiry) {
      const updates: { status?: string; notes?: string } = {};
      if (editableStatus !== inquiry.status) {
        updates.status = editableStatus;
      }
      if (editableNotes.trim()) {
        updates.notes = editableNotes.trim();
      }
      
      if (Object.keys(updates).length > 0) {
        onUpdateInquiry(inquiry, updates);
      }
    }
    setIsEditing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold leading-6 text-gray-900">
                  {inquiry.company_name}
                </DialogTitle>
                <p className="text-sm text-gray-500 font-mono">
                  {inquiry.reference_number}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {!isEditing ? (
                <Badge variant="secondary" className={getStatusColor(inquiry.status)}>
                  {getStatusLabel(inquiry.status)}
                </Badge>
              ) : (
                <Select value={editableStatus} onValueChange={setEditableStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="CONVERTED">Converted</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditToggle}
              >
                <Edit className="h-4 w-4 mr-2" />
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </div>
          </div>
        </DialogHeader>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Company Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Building2 className="h-5 w-5 mr-2" />
                            Company Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-500">Company Name</label>
                              <p className="text-gray-900 font-medium">{inquiry.company_name}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Industry</label>
                              <p className="text-gray-900">{inquiry.industry}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Expected Volume</label>
                              <p className="text-gray-900">{inquiry.expected_volume}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Contact Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <User className="h-5 w-5 mr-2" />
                            Contact Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-500">Contact Person</label>
                              <p className="text-gray-900 font-medium">{inquiry.contact_person}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Phone Number</label>
                              <p className="text-gray-900 flex items-center">
                                <Phone className="h-4 w-4 mr-2" />
                                {inquiry.phone}
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium text-gray-500">Email Address</label>
                              <p className="text-gray-900 flex items-center">
                                <Mail className="h-4 w-4 mr-2" />
                                {inquiry.email}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Special Requirements */}
                      {inquiry.special_requirements && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <FileText className="h-5 w-5 mr-2" />
                              Special Requirements
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-900 leading-relaxed">
                              {inquiry.special_requirements}
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Admin Notes */}
                      {isEditing && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Add Notes</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Textarea
                              placeholder="Add notes about this inquiry..."
                              value={editableNotes}
                              onChange={(e) => setEditableNotes(e.target.value)}
                              rows={4}
                            />
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                      {/* Quick Actions */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Button
                            className="w-full"
                            onClick={() => onContactCustomer(inquiry)}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Contact Customer
                          </Button>
                          
                          {inquiry.status === 'NEW' && (
                            <>
                              <Button
                                className="w-full bg-green-600 hover:bg-green-700"
                                onClick={() => onAcceptInquiry(inquiry)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve Inquiry
                              </Button>
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => onDeclineInquiry(inquiry)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Reject Inquiry
                              </Button>
                            </>
                          )}
                          
                          {(inquiry.status === 'UNDER_REVIEW' || inquiry.status === 'APPROVED') && (
                            <Button
                              className="w-full bg-purple-600 hover:bg-purple-700"
                              onClick={() => onAssignDriver(inquiry)}
                            >
                              Convert to Company
                            </Button>
                          )}
                        </CardContent>
                      </Card>

                      {/* Timestamps */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Clock className="h-5 w-5 mr-2" />
                            Timeline
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Created</label>
                            <p className="text-gray-900 text-sm">
                              {createdDate.date}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {createdDate.time}
                            </p>
                          </div>
                          <Separator />
                          <div>
                            <label className="text-sm font-medium text-gray-500">Last Updated</label>
                            <p className="text-gray-900 text-sm">
                              {updatedDate.date}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {updatedDate.time}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
        
        {/* Footer Actions */}
        {isEditing && (
          <div className="bg-gray-50 px-6 py-4 flex justify-between mt-6 -mx-6 -mb-6 rounded-b-lg">
            <Button variant="outline" onClick={handleEditToggle}>
              Cancel
            </Button>
            
            <Button onClick={handleSaveChanges}>
              Save Changes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}