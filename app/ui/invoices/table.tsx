import {fetchViewerRecords} from '@/app/lib/mock-viewers'

export default async function InvoicesTable({
  query,
  currentPage,
}: {
  query: string
  currentPage: number
}) {
  const viewers = await fetchViewerRecords(query, currentPage)

  return (
    <div className="mt-6 flow-root">
      <div className="block w-full align-middle">
        <div className="rounded-lg bg-gray-50 px-4 py-3 md:px-6 md:py-4">
          <div className="md:hidden">
            {viewers?.map((viewer) => (
              <div
                key={viewer.id}
                className="mb-2 w-full rounded-md bg-white p-4"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{viewer.userName}</p>
                    <p className="text-xs text-slate-500">ID: {viewer.userId}</p>
                  </div>
                  <p className="text-xs text-slate-500">{viewer.watchType}</p>
                </div>
                <div className="flex w-full items-center justify-between pt-4">
                  <div className="space-y-2 text-xs text-slate-600">
                    <p>
                      <span className="font-medium text-slate-500">观看时长：</span>
                      {formatDuration(viewer.playDuration)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">进入：</span>
                      {formatTimestamp(viewer.firstActiveTime)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">退出：</span>
                      {formatTimestamp(viewer.lastActiveTime)}
                    </p>
                  </div>
                  <div className="ml-3 space-y-2 text-right text-xs text-slate-500">
                    <p>{viewer.province} · {viewer.city}</p>
                    <p>{viewer.operatingSystem}</p>
                    <p>{viewer.channelLabel}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[1200px] text-nowrap text-gray-900">
              <thead className="rounded-lg text-left text-sm font-normal">
                <tr>
                  <th scope="col" className="px-3 py-3 font-medium sm:pl-6">
                    用户信息
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    观看时长
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    进入时间
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    退出时间
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    地区
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    城市
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    观众IP
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    观看终端
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    渠道推广
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    场次
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    观看类型
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {viewers?.map((viewer) => (
                  <tr
                    key={viewer.id}
                    className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                  >
                    <td className="whitespace-nowrap py-3 pl-6 pr-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{viewer.userName}</span>
                        <span className="text-xs text-slate-500">ID: {viewer.userId}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDuration(viewer.playDuration)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatTimestamp(viewer.firstActiveTime)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatTimestamp(viewer.lastActiveTime)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {viewer.province}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {viewer.city}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {viewer.ipAddress}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="block">{viewer.operatingSystem}</span>
                      <span className="text-xs text-slate-500">{viewer.browser}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {viewer.channelLabel || '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {viewer.sessionId}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {viewer.watchType}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return '—'
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  const parts: string[] = []
  if (hours) parts.push(`${hours}小时`)
  if (minutes || hours) parts.push(`${minutes}分`)
  parts.push(`${secs}秒`)
  return parts.join('')
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'short',
  timeStyle: 'medium',
  hour12: false,
})

function formatTimestamp(value: number) {
  if (!value) return '—'
  return dateFormatter.format(new Date(value))
}
