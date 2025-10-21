/**
 * API client for making requests to the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

/**
 * Make a request to the API
 * @param {string} endpoint - API endpoint (without /api prefix)
 * @param {object} options - Fetch options
 * @returns {Promise<any>} Response data
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('API request failed:', error)
    throw error
  }
}

/**
 * GET request
 */
export function get(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'GET' })
}

/**
 * POST request
 */
export function post(endpoint, data, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * PUT request
 */
export function put(endpoint, data, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * DELETE request
 */
export function del(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'DELETE' })
}

export default {
  get,
  post,
  put,
  delete: del,
}
