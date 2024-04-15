// jest.setup.js
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  // Mock other chrome APIs as needed
};

