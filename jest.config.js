module.exports = {
    preset: 'ts-jest',
    setupFiles: ['./jest.setup.js'],
    testEnvironment: 'jest-environment-jsdom',
    globals: {
      'ts-jest': {
        tsconfig: 'tsconfig.json'
      }
    },
  };
  