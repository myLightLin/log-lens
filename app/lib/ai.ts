const AI_QUERY_ENDPOINT = 'https://logd.igeeker.org/api/v1/ai/query'

export type AiQueryResponse = unknown

export async function fetchAiAnswer(query: string, signal?: AbortSignal): Promise<AiQueryResponse> {
  const response = await fetch(AI_QUERY_ENDPOINT, {
    signal,
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(`请求失败: ${response.status} ${errorText}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}
