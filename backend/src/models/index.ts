// Export all models
export * from './User';
export * from './Company';
export * from './CompanyUser';
export * from './Inquiry';
export * from './Driver';
export * from './DeliveryRequest';
export * from './AppSettings';
export * from './UserSession';

// Import all models to ensure they are registered with mongoose
import './User';
import './Company';
import './CompanyUser';
import './Inquiry';
import './Driver';
import './DeliveryRequest';
import './AppSettings';
import './UserSession';