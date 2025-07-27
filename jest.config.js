// Jest configuration for the entire monorepo
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Monorepo structure
  projects: [
    '<rootDir>/packages/*/jest.config.js',
    '<rootDir>/backend/jest.config.js',
    '<rootDir>/shared/jest.config.js'
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',
  
  // Coverage configuration
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,tsx}',
    'backend/src/**/*.{ts,js}',
    'shared/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.config.{js,ts}',
    '!**/coverage/**'
  ],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Test match patterns
  testMatch: [
    '<rootDir>/**/__tests__/**/*.{ts,tsx,js}',
    '<rootDir>/**/?(*.)+(spec|test).{ts,tsx,js}'
  ],
  
  // Module name mapping for monorepo
  moduleNameMapping: {
    '^@delivery-uae/shared/(.*)$': '<rootDir>/shared/src/$1',
    '^@/(.*)$': '<rootDir>/packages/*/src/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/setupTests.js'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/packages/*/dist/',
    '<rootDir>/packages/*/coverage/'
  ],
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        suiteName: 'UAE Delivery Management System Tests',
        outputDirectory: '<rootDir>/coverage/junit',
        outputName: 'junit.xml',
        uniqueOutputName: 'false',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: 'true'
      }
    ],
    [
      'jest-html-reporter',
      {
        pageTitle: 'UAE Delivery Management System Test Report',
        outputPath: '<rootDir>/coverage/test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true
      }
    ]
  ],
  
  // Verbose output
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache'
};