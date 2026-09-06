import "dotenv/config";

// Setup code that runs before all tests
// You can add global mocks, database setup, etc. here

// Disable logging during tests
process.env.NODE_ENV = "test";
