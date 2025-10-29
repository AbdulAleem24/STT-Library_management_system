const path = require('path');

module.exports = {
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/docs/**',
    '!src/server.js'
  ],
  coverageDirectory: path.join(__dirname, 'coverage'),
  testTimeout: 30000,
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      transform: {
        '^.+\\.js$': ['@swc/jest']
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
      testMatch: ['<rootDir>/tests/unit/**/*.test.js']
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      transform: {
        '^.+\\.js$': ['@swc/jest']
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
      testMatch: ['<rootDir>/tests/integration/**/*.test.js']
    }
  ]
};
