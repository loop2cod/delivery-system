import { z } from 'zod';

export const deliveryRequestSchema = z.object({
  priority: z.enum(['normal', 'high', 'urgent']),
  pickupDetails: z.object({
    contactName: z.string().min(1, 'Contact name is required'),
    phone: z.string().min(1, 'Phone number is required'),
    address: z.string().min(1, 'Pickup address is required'),
    instructions: z.string().optional(),
  }),
  deliveryDetails: z.object({
    contactName: z.string().min(1, 'Contact name is required'),
    phone: z.string().min(1, 'Phone number is required'),
    address: z.string().min(1, 'Delivery address is required'),
    instructions: z.string().optional(),
  }),
  items: z.array(z.object({
    description: z.string().min(1, 'Item description is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    weight: z.number().min(0.1, 'Weight is required for price calculation'),
    dimensions: z.string().optional(),
    value: z.number().optional().nullable(),
    fragile: z.boolean().default(false),
    paymentType: z.enum(['paid', 'cod']).default('paid'),
    codAmount: z.number().optional().nullable(),
  })).min(1, 'At least one item is required'),
  schedule: z.object({
    pickupDate: z.string().min(1, 'Pickup date is required'),
    pickupTime: z.string().min(1, 'Pickup time is required'),
    deliveryDate: z.string().min(1, 'Delivery date is required'),
    deliveryTime: z.string().min(1, 'Delivery time is required'),
  }),
  specialRequirements: z.string().optional(),
  internalReference: z.string().optional(),
});

export type DeliveryRequestFormData = z.infer<typeof deliveryRequestSchema>;

export interface Company {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  street_address: string;
  area: string;
  city: string;
  emirate: string;
  postal_code?: string;
  country: string;
  industry: string;
  monthly_volume_estimate?: number;
}

export const priorityOptions = [
  { value: 'normal', label: 'Normal', description: 'Standard processing', color: 'bg-gray-100 text-gray-800' },
  { value: 'high', label: 'High', description: 'Higher priority', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', description: 'Immediate attention', color: 'bg-red-100 text-red-800' },
] as const;