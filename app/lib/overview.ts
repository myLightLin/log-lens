const OVERVIEW_ENDPOINT =
  'https://192.168.21.233/api/v1/analytics/overview?start_date=2025-05-10&end_date=2025-10-20'

export type OverviewResponse = {
  code: number
  message: string
  data?: {
    summary?: string
    question_tips?: string[]
    [key: string]: unknown
  }
}

export async function fetchOverviewData(signal?: AbortSignal): Promise<OverviewResponse> {
  const response = await fetch(OVERVIEW_ENDPOINT, {
    signal,
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(`请求失败: ${response.status} ${errorText}`)
  }

  return response.json() as Promise<OverviewResponse>
}
