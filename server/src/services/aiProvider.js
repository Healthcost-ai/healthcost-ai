class AIProviderError extends Error {
  constructor({ status, code, type, requestId }) {
    super('AI provider request failed')
    this.status = status
    this.code = code
    this.type = type
    this.requestId = requestId
  }
}

function getAIProviderConfig(env) {
  return {
    provider: 'gemini',
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
  }
}

function getProviderErrorMessage(error) {
  if (error.status === 400) {
    return 'Gemini rejected the request. Check the configured model and try a smaller or clearer bill file.'
  }
  if (error.status === 401 || error.status === 403) {
    return 'Gemini rejected or denied the API key. Check GEMINI_API_KEY in server/.env and confirm the key is enabled.'
  }
  if (error.status === 404) {
    return 'The configured Gemini model is unavailable. Check GEMINI_MODEL in server/.env.'
  }
  if (error.status === 429) {
    return 'Gemini quota or rate limit was reached. Check the provider account limits and try again later.'
  }
  if (error.status >= 500) {
    return 'Gemini is temporarily unavailable. Please try again later.'
  }
  if (error.status === undefined) {
    return 'Could not connect to Gemini. Check the backend internet connection and try again.'
  }
  return 'Gemini could not process this request. Check the backend log for the provider error code.'
}

function getGeminiUserParts(userContent) {
  if (typeof userContent === 'string') return [{ text: userContent }]
  return [
    { text: userContent.text },
    {
      inlineData: {
        mimeType: userContent.image.mimeType,
        data: userContent.image.data,
      },
    },
  ]
}

async function generateAIContent({
  env,
  systemInstruction,
  userContent,
  temperature,
  maxOutputTokens,
  jsonResponse = false,
  responseSchema,
}) {
  const config = getAIProviderConfig(env)
  if (!config.apiKey) {
    throw new Error('AI is not configured. Add GEMINI_API_KEY to server/.env.')
  }

  let response
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey,
        },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: getGeminiUserParts(userContent) }],
          generationConfig: {
            temperature,
            maxOutputTokens,
            ...(jsonResponse
              ? {
                  responseMimeType: 'application/json',
                  ...(responseSchema ? { responseSchema } : {}),
                }
              : {}),
          },
        }),
      },
    )
  } catch {
    throw new AIProviderError({})
  }

  let body
  try {
    body = await response.json()
  } catch {
    body = null
  }
  if (!response.ok) {
    throw new AIProviderError({
      status: response.status,
      code: body?.error?.status || body?.error?.code,
      type: body?.error?.status,
      requestId: response.headers.get('x-request-id'),
    })
  }

  return {
    text: body?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim() || '',
    requestId: response.headers.get('x-request-id'),
  }
}

module.exports = {
  AIProviderError,
  generateAIContent,
  getAIProviderConfig,
  getProviderErrorMessage,
}
