// Jest configuration for Admin PWA
module.exports = {
  displayName: 'Admin PWA',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Root directory
  rootDir: '.',
  
  // Test files
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/?(*.)+(spec|test).{ts,tsx}'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/../../tests/setup/setupTests.js'
  ],
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@delivery-uae/shared/(.*)$': '<rootDir>/../../shared/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/../../tests/setup/__mocks__/fileMock.js',
    '^next/router$': '<rootDir>/../../tests/setup/__mocks__/next/router.js',
    '^next/navigation$': '<rootDir>/../../tests/setup/__mocks__/next/navigation.js',
    '^next/image$': '<rootDir>/../../tests/setup/__mocks__/next/image.js'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json'
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/**/*.stories.{ts,tsx}',
    '!src/sw.ts', // Service worker
    '!src/app/layout.tsx', // Next.js layout
    '!src/app/page.tsx' // Next.js pages
  ],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],
  
  // Environment variables for admin testing
  testEnvironmentOptions: {
    url: 'http://localhost:3002'
  },
  
  // Globals for PWA testing
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  },
  
  // Additional setup for admin-specific features
  setupFiles: [
    '<rootDir>/../../tests/setup/__mocks__/adminMocks.js'
  ]
};