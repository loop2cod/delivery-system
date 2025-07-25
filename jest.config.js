const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup/setupTests.js'],
  
  // Module paths
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/shared/(.*)$': '<rootDir>/shared/src/$1',
    '^@/backend/(.*)$': '<rootDir>/backend/src/$1',
    '^@/public-pwa/(.*)$': '<rootDir>/packages/public-pwa/src/$1',
    '^@/admin-pwa/(.*)$': '<rootDir>/packages/admin-pwa/src/$1',
    '^@/business-pwa/(.*)$': '<rootDir>/packages/business-pwa/src/$1',
    '^@/driver-pwa/(.*)$': '<rootDir>/packages/driver-pwa/src/$1',
    '^@delivery-uae/shared$': '<rootDir>/shared/src/index.ts',
    '^@delivery-uae/shared/(.*)$': '<rootDir>/shared/src/$1',
    
    // Mock static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/setup/__mocks__/fileMock.js',
    
    // Mock Next.js modules
    '^next/image$': '<rootDir>/tests/setup/__mocks__/next/image.js',
    '^next/router$': '<rootDir>/tests/setup/__mocks__/next/router.js',
    '^next/navigation$': '<rootDir>/tests/setup/__mocks__/next/navigation.js',
  },
  
  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    }],
  },
  
  // File extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test patterns
  testMatch: [
    '<rootDir>/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/**/*.(test|spec).(ts|tsx|js|jsx)',
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'shared/src/**/*.{ts,tsx}',
    'backend/src/**/*.{ts,tsx}',
    'packages/*/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**',
    '!**/__tests__/**',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/index.ts',
  ],
  
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Projects for multi-package testing
  projects: [
    {
      displayName: 'shared',
      testMatch: ['<rootDir>/shared/**/*.test.(ts|tsx)'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: '<rootDir>/shared/tsconfig.json',
        }],
      },
    },
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/backend/**/*.test.(ts|tsx)'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: '<rootDir>/backend/tsconfig.json',
        }],
      },
    },
    {
      displayName: 'public-pwa',
      testMatch: ['<rootDir>/packages/public-pwa/**/*.test.(ts|tsx)'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: '<rootDir>/packages/public-pwa/tsconfig.json',
        }],
      },
    },
    {
      displayName: 'admin-pwa',
      testMatch: ['<rootDir>/packages/admin-pwa/**/*.test.(ts|tsx)'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: '<rootDir>/packages/admin-pwa/tsconfig.json',
        }],
      },
    },
    {
      displayName: 'business-pwa',
      testMatch: ['<rootDir>/packages/business-pwa/**/*.test.(ts|tsx)'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: '<rootDir>/packages/business-pwa/tsconfig.json',
        }],
      },
    },
    {
      displayName: 'driver-pwa',
      testMatch: ['<rootDir>/packages/driver-pwa/**/*.test.(ts|tsx)'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: '<rootDir>/packages/driver-pwa/tsconfig.json',
        }],
      },
    },
  ],
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Error handling
  errorOnDeprecated: true,
  
  // Performance
  maxWorkers: '50%',
  
  // Snapshot serializers
  snapshotSerializers: ['@emotion/jest/serializer'],
};