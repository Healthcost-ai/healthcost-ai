
const API_BASE = '/api'

let csrfToken = null

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(
      data.message || `Request failed with status ${response.status}`
    )
    error.status = response.status
    throw error
  }

  return data
}

export async function checkBackend() {
  return request('/health/ready')
}

export async function getCsrfToken() {
  const data = await request('/auth/csrf')
  csrfToken = data.csrfToken
  return csrfToken
}

async function secureRequest(path, options = {}) {
  if (!csrfToken) {
    await getCsrfToken()
  }

  return request(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'X-CSRF-Token': csrfToken,
    },
  })
}

export async function register(email, password) {
  return secureRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function resendVerification(email) {
  return secureRequest('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function verifyEmail(token) {
  return secureRequest('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function login(email, password) {
  const result = await secureRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  return result
}

export async function loginWithGoogle(credential) {
  return secureRequest('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  })
}

export async function refreshSession() {
  return secureRequest('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function logout() {
  return secureRequest('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function getCurrentUser() {
  try {
    return await request('/auth/me')
  } catch (error) {
    if (error.status !== 401) {
      throw error
    }
  }

  // If the access token expired, try refreshing the session.
  try {
    await refreshSession()
    return await request('/auth/me')
  } catch (error) {
    if (error.status === 401) {
      return { success: false, user: null }
    }

    throw error
  }
}

export async function getBills() {
  return request('/bills')
}

export async function createBill(bill) {
  return secureRequest('/bills', {
    method: 'POST',
    body: JSON.stringify(bill),
  })
}

export async function analyzeBillUpload(file, demoMode = false) {
  const formData = new FormData()
  formData.append('bill', file)
  formData.append('consentToExternalProcessing', 'true')
  const endpoint = demoMode ? '/demo/analyze-upload' : '/bills/analyze-upload'
  return secureRequest(endpoint, {
    method: 'POST',
    body: formData,
  })
}

export async function deleteBill(id) {
  return secureRequest(`/bills/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function explainBill(id, consentToExternalProcessing = false) {
  return secureRequest(`/bills/${encodeURIComponent(id)}/explanation`, {
    method: 'POST',
    body: JSON.stringify({ consentToExternalProcessing }),
  })
}
