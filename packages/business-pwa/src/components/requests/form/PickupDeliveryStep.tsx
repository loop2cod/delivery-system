import { UseFormRegister } from 'react-hook-form';
import { MapPinIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { DeliveryRequestFormData } from '../types';

interface Company {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  street_address: string;
  area: string;
  city: string;
  emirate: string;
  postal_code?: string;
  country: string;
}

interface PickupDeliveryStepProps {
  register: UseFormRegister<DeliveryRequestFormData>;
  company: Company | null;
  loadingCompany: boolean;
  onAutoFillPickup: () => void;
  onCopyPickupToDelivery: () => void;
}

export function PickupDeliveryStep({
  register,
  company,
  loadingCompany,
  onAutoFillPickup,
  onCopyPickupToDelivery
}: PickupDeliveryStepProps) {
  return (
    <div className="space-y-8">
      {/* Pickup Details */}
      <div className="bg-green-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <MapPinIcon className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Pickup Details</h3>
          </div>
          {company && (
            <button
              type="button"
              onClick={onAutoFillPickup}
              disabled={loadingCompany}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BuildingOffice2Icon className="w-3 h-3 mr-1" />
              {loadingCompany ? 'Loading...' : 'Use Company Address'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name
            </label>
            <input
              {...register('pickupDetails.contactName')}
              type="text"
              className="form-input"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              {...register('pickupDetails.phone')}
              type="tel"
              className="form-input"
              placeholder="+971-50-123-4567"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pickup Address
          </label>
          <textarea
            {...register('pickupDetails.address')}
            className="form-input"
            rows={3}
            placeholder="Complete pickup address including building, floor, and any landmarks"
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Special Instructions (Optional)
          </label>
          <textarea
            {...register('pickupDetails.instructions')}
            className="form-input"
            rows={2}
            placeholder="Any special instructions for pickup (e.g., gate code, specific entrance)"
          />
        </div>
      </div>

      {/* Delivery Details */}
      <div className="bg-red-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <MapPinIcon className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Delivery Details</h3>
          </div>
          <button
            type="button"
            onClick={onCopyPickupToDelivery}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            Copy pickup contact
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name
            </label>
            <input
              {...register('deliveryDetails.contactName')}
              type="text"
              className="form-input"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              {...register('deliveryDetails.phone')}
              type="tel"
              className="form-input"
              placeholder="+971-50-123-4567"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delivery Address
          </label>
          <textarea
            {...register('deliveryDetails.address')}
            className="form-input"
            rows={3}
            placeholder="Complete delivery address including building, floor, and any landmarks"
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Special Instructions (Optional)
          </label>
          <textarea
            {...register('deliveryDetails.instructions')}
            className="form-input"
            rows={2}
            placeholder="Any special instructions for delivery (e.g., office hours, reception desk)"
          />
        </div>
      </div>
    </div>
  );
}