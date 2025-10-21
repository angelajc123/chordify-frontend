/**
 * Vitest setup file
 * Runs before all tests
 */

// Mock environment variables
import.meta.env = import.meta.env || {}
import.meta.env.VITE_API_URL = '/api'
