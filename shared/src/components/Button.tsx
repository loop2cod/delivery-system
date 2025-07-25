/**
 * Shared Button Component for UAE Delivery Management System
 * Consistent button styling across all PWA applications
 */

import React from 'react';
import { UAE_COLORS } from '../theme';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  rounded?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      rounded = false,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = `
      inline-flex items-center justify-center font-semibold transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
      ${fullWidth ? 'w-full' : ''}
      ${rounded ? 'rounded-full' : 'rounded-lg'}
    `;

    // Variant styles
    const variantStyles = {
      primary: `
        bg-gradient-to-r from-[${UAE_COLORS.navy}] to-blue-800 text-white
        hover:from-blue-900 hover:to-blue-900 focus:ring-[${UAE_COLORS.navy}]
        shadow-lg hover:shadow-xl transform hover:scale-105
      `,
      secondary: `
        bg-[${UAE_COLORS.light}] text-[${UAE_COLORS.navy}] border border-gray-200
        hover:bg-gray-100 focus:ring-gray-300
        shadow-sm hover:shadow-md
      `,
      accent: `
        bg-gradient-to-r from-[${UAE_COLORS.red}] to-red-600 text-white
        hover:from-red-700 hover:to-red-700 focus:ring-[${UAE_COLORS.red}]
        shadow-lg hover:shadow-xl transform hover:scale-105
      `,
      success: `
        bg-gradient-to-r from-green-500 to-green-600 text-white
        hover:from-green-600 hover:to-green-700 focus:ring-green-500
        shadow-lg hover:shadow-xl
      `,
      warning: `
        bg-gradient-to-r from-yellow-500 to-yellow-600 text-white
        hover:from-yellow-600 hover:to-yellow-700 focus:ring-yellow-500
        shadow-lg hover:shadow-xl
      `,
      error: `
        bg-gradient-to-r from-red-500 to-red-600 text-white
        hover:from-red-600 hover:to-red-700 focus:ring-red-500
        shadow-lg hover:shadow-xl
      `,
      ghost: `
        text-[${UAE_COLORS.navy}] hover:bg-[${UAE_COLORS.light}] focus:ring-gray-300
        hover:shadow-sm
      `,
      outline: `
        border-2 border-[${UAE_COLORS.navy}] text-[${UAE_COLORS.navy}]
        hover:bg-[${UAE_COLORS.navy}] hover:text-white focus:ring-[${UAE_COLORS.navy}]
        hover:shadow-md
      `,
    };

    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm min-h-[2rem]',
      md: 'px-4 py-2 text-base min-h-[2.5rem]',
      lg: 'px-6 py-3 text-lg min-h-[3rem]',
      xl: 'px-8 py-4 text-xl min-h-[3.5rem]',
    };

    // Loading spinner
    const LoadingSpinner = () => (
      <svg
        className="animate-spin -ml-1 mr-2 h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    const combinedClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${className}
    `.replace(/\s+/g, ' ').trim();

    return (
      <button
        ref={ref}
        className={combinedClassName}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <LoadingSpinner />}
        {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;