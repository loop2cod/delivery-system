// Jest configuration for Backend API
module.exports = {
  displayName: 'Backend API',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Root directory
  rootDir: '.',
  
  // Test files
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,js}',
    '<rootDir>/src/**/?(*.)+(spec|test).{ts,js}'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/../tests/setup/setupTests.js'
  ],
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@delivery-uae/shared/(.*)$': '<rootDir>/../shared/src/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json'
    }],
    '^.+\\.(js)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/**/*.config.{ts,js}',
    '!src/migrations/**/*', // Database migrations
    '!src/seeds/**/*' // Database seeds
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
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],
  
  // Environment variables for backend testing
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // Globals for backend testing
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  },
  
  // Test timeout for integration tests
  testTimeout: 30000,
  
  // Run tests in sequence for database operations
  maxWorkers: 1,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Collect coverage from source files
  collectCoverage: true,
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Exit on coverage threshold failure
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    './src/routes/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  }
};