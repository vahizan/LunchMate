/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/client/src/jest-setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
      babelConfig: {
        presets: ['@babel/preset-react', '@babel/preset-env']
      }
    }],
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Mock import.meta.env for Vite
  globals: {
    'import.meta': {
      env: {
        VITE_PLACES_PROVIDER: 'hybrid',
        VITE_GOOGLE_MAPS_API_KEY: 'test-google-key',
        VITE_FOURSQUARE_PLACES_API_KEY: 'test-foursquare-key',
        DEV: true
      }
    }
  }
};