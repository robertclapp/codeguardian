import { createContext, useContext } from 'react'
import { useAuth } from './AuthContext'

const ApiContext = createContext()

export const useApi = () => {
  const context = useContext(ApiContext)
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider')
  }
  return context
}

export const ApiProvider = ({ children }) => {
  const { token } = useAuth()

  const apiCall = async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint}`
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API request failed')
      }

      return data
    } catch (error) {
      console.error('API call failed:', error)
      throw error
    }
  }

  // Repository API methods
  const repositories = {
    getAll: () => apiCall('/repositories'),
    getById: (id) => apiCall(`/repositories/${id}`),
    connect: (repoData) => apiCall('/repositories/connect', {
      method: 'POST',
      body: JSON.stringify(repoData)
    }),
    disconnect: (id) => apiCall(`/repositories/${id}/disconnect`, {
      method: 'DELETE'
    }),
    updateSettings: (id, settings) => apiCall(`/repositories/${id}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings)
    }),
    getPullRequests: (id, params = {}) => {
      const queryString = new URLSearchParams(params).toString()
      return apiCall(`/repositories/${id}/pull-requests?${queryString}`)
    },
    sync: (id) => apiCall(`/repositories/${id}/sync`, {
      method: 'POST'
    }),
    discover: (platform, accessToken) => apiCall(`/repositories/discover?platform=${platform}&access_token=${accessToken}`)
  }

  // Review API methods
  const reviews = {
    getAll: (params = {}) => {
      const queryString = new URLSearchParams(params).toString()
      return apiCall(`/reviews?${queryString}`)
    },
    getById: (id) => apiCall(`/reviews/${id}`),
    trigger: (pullRequestId, reviewType = 'full_review') => apiCall('/reviews/trigger', {
      method: 'POST',
      body: JSON.stringify({ pull_request_id: pullRequestId, review_type: reviewType })
    }),
    provideFeedback: (commentId, feedback) => apiCall(`/reviews/comments/${commentId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback })
    }),
    getStats: (days = 30) => apiCall(`/reviews/stats?days=${days}`)
  }

  // Mentorship API methods
  const mentorship = {
    getSessions: (params = {}) => {
      const queryString = new URLSearchParams(params).toString()
      return apiCall(`/reviews/mentorship/sessions?${queryString}`)
    },
    generateSession: (topic, difficultyLevel = 'intermediate') => apiCall('/reviews/mentorship/generate', {
      method: 'POST',
      body: JSON.stringify({ topic, difficulty_level: difficultyLevel })
    })
  }

  // User API methods
  const users = {
    getAll: () => apiCall('/users'),
    getById: (id) => apiCall(`/users/${id}`),
    create: (userData) => apiCall('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
    update: (id, userData) => apiCall(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    }),
    delete: (id) => apiCall(`/users/${id}`, {
      method: 'DELETE'
    })
  }

  const value = {
    apiCall,
    repositories,
    reviews,
    mentorship,
    users
  }

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  )
}

