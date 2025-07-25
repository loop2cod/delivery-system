/**
 * Shared Card Component for UAE Delivery Management System
 * Consistent card styling across all PWA applications
 */

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  clickable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      rounded = 'lg',
      shadow = 'md',
      hover = false,
      clickable = false,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = `
      transition-all duration-200
      ${clickable ? 'cursor-pointer' : ''}
    `;

    // Variant styles
    const variantStyles = {
      default: 'bg-white border border-gray-200',
      elevated: 'bg-white',
      outlined: 'bg-transparent border-2 border-gray-300',
      glass: 'bg-white/80 backdrop-blur-sm border border-white/20',
    };

    // Padding styles
    const paddingStyles = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8',
    };

    // Rounded styles
    const roundedStyles = {
      none: '',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      full: 'rounded-full',
    };

    // Shadow styles
    const shadowStyles = {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl',
    };

    // Hover styles
    const hoverStyles = hover
      ? 'hover:shadow-lg hover:scale-105 hover:-translate-y-1'
      : '';

    const combinedClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${paddingStyles[padding]}
      ${roundedStyles[rounded]}
      ${shadowStyles[shadow]}
      ${hoverStyles}
      ${className}
    `.replace(/\s+/g, ' ').trim();

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header Component
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, children, className = '', ...props }, ref) => {
    const combinedClassName = `
      flex items-center justify-between pb-4 border-b border-gray-200
      ${className}
    `.replace(/\s+/g, ' ').trim();

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        <div className="flex-1">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
          {children}
        </div>
        {action && <div className="ml-4">{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// Card Content Component
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className = '', ...props }, ref) => {
    const combinedClassName = `py-4 ${className}`.replace(/\s+/g, ' ').trim();

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

// Card Footer Component
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  actions?: React.ReactNode;
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ actions, children, className = '', ...props }, ref) => {
    const combinedClassName = `
      pt-4 border-t border-gray-200 flex items-center justify-between
      ${className}
    `.replace(/\s+/g, ' ').trim();

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        <div className="flex-1">{children}</div>
        {actions && <div className="ml-4">{actions}</div>}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export default Card;