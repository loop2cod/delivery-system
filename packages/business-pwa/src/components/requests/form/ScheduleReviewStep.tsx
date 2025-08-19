import { UseFormRegister } from 'react-hook-form';
import { CalendarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { calculateTotalWeight, formatPrice, formatWeight, PriceCalculation } from '@/lib/api';
import { DeliveryRequestFormData } from '../types';

interface ScheduleReviewStepProps {
  register: UseFormRegister<DeliveryRequestFormData>;
  watchedValues: DeliveryRequestFormData;
  estimatedCost: number | null;
  priceCalculation: PriceCalculation | null;
}

export function ScheduleReviewStep({
  register,
  watchedValues,
  estimatedCost,
  priceCalculation
}: ScheduleReviewStepProps) {
  return (
    <div className="space-y-6">
      {/* Schedule */}
      <div className="bg-blue-50 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <CalendarIcon className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Schedule</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Pickup</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  {...register('schedule.pickupDate')}
                  type="date"
                  className="form-input"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  {...register('schedule.pickupTime')}
                  type="time"
                  className="form-input"
                />
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Delivery</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  {...register('schedule.deliveryDate')}
                  type="date"
                  className="form-input"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  {...register('schedule.deliveryTime')}
                  type="time"
                  className="form-input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Estimate */}
      {estimatedCost && (
        <div className="bg-yellow-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CurrencyDollarIcon className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Estimated Cost</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(estimatedCost)}</p>
              <p className="text-sm text-gray-600">
                {priceCalculation ? 
                  `Based on ${formatWeight(calculateTotalWeight(watchedValues.items || []))} total weight` :
                  'Estimated pricing - add item weights for accurate calculation'
                }
              </p>
              {priceCalculation?.breakdown && (
                <p className="text-xs text-gray-500 mt-1">
                  {priceCalculation.breakdown.calculation}
                </p>
              )}
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Priority: {watchedValues.priority}</p>
              <p>Weight: {formatWeight(calculateTotalWeight(watchedValues.items || []))}</p>
              <p>Items: {watchedValues.items?.length || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Request Summary</h3>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">Priority:</span> {watchedValues.priority}</p>
          <p><span className="font-medium">Items:</span> {watchedValues.items?.length || 0} item(s)</p>
          <p><span className="font-medium">Pickup:</span> {watchedValues.pickupDetails?.address}</p>
          <p><span className="font-medium">Delivery:</span> {watchedValues.deliveryDetails?.address}</p>
          <p><span className="font-medium">Schedule:</span> {watchedValues.schedule?.pickupDate} at {watchedValues.schedule?.pickupTime}</p>
          
          {/* COD Summary */}
          {(() => {
            const codItems = watchedValues.items?.filter(item => item.paymentType === 'cod') || [];
            const totalCOD = codItems.reduce((sum, item) => sum + (item.codAmount || 0), 0);
            
            if (codItems.length > 0) {
              return (
                <div className="mt-3 pt-2 border-t border-gray-300">
                  <p className="font-medium text-orange-700">
                    COD Collection Required: <span className="text-orange-600">{formatPrice(totalCOD)}</span>
                  </p>
                  <p className="text-xs text-gray-600">
                    {codItems.length} item{codItems.length !== 1 ? 's' : ''} require{codItems.length === 1 ? 's' : ''} cash collection upon delivery
                  </p>
                </div>
              );
            }
            return null;
          })()}
        </div>
      </div>
    </div>
  );
}