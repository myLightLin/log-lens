"use server"

export type ViewerRecord = {
  id: string
  userId: string
  userName: string
  playDuration: number
  firstActiveTime: number
  lastActiveTime: number
  province: string
  city: string
  ipAddress: string
  operatingSystem: string
  browser: string
  channelLabel: string
  sessionId: string
  watchType: '直播' | '回放' | '短视频'
  trackFrom: string
  isMobile: boolean
}

const ITEMS_PER_PAGE = 10

const records = generateMockViewers(100)

export async function fetchViewerRecords(query: string, currentPage: number) {
  const normalizedQuery = query.trim().toLowerCase()

  const filtered = !normalizedQuery
    ? records
    : records.filter((record) => {
        const haystack = [
          record.userName,
          record.userId,
          record.sessionId,
          record.channelLabel,
          record.province,
          record.city,
          record.ipAddress,
          record.trackFrom,
          record.operatingSystem,
          record.browser,
          record.watchType,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return haystack.includes(normalizedQuery)
      })

  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  return filtered.slice(offset, offset + ITEMS_PER_PAGE)
}

export async function fetchViewerPages(query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  const filtered = !normalizedQuery
    ? records
    : records.filter((record) => {
        const haystack = [
          record.userName,
          record.userId,
          record.sessionId,
          record.channelLabel,
          record.province,
          record.city,
          record.ipAddress,
          record.trackFrom,
          record.operatingSystem,
          record.browser,
          record.watchType,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return haystack.includes(normalizedQuery)
      })

  return Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
}

function generateMockViewers(count: number): ViewerRecord[] {
  const seed = 20241023
  const random = mulberry32(seed)
  const firstNames = ["王", "李", "张", "刘", "陈", "杨", "赵", "钱", "孙", "周"]
  const lastNames = ["老师", "同学", "先生", "小姐", "工程师", "顾问", "经理", "小哥"]
  const provinces = ["北京", "上海", "广东", "江苏", "浙江", "四川", "湖北", "福建", "陕西", "山东"]
  const cityMap: Record<string, string[]> = {
    北京: ["北京市"],
    上海: ["上海市"],
    广东: ["广州市", "深圳市", "佛山市", "珠海市"],
    江苏: ["南京市", "苏州市", "无锡市", "常州市"],
    浙江: ["杭州市", "宁波市", "温州市", "嘉兴市"],
    四川: ["成都市", "绵阳市", "乐山市"],
    湖北: ["武汉市", "宜昌市", "襄阳市"],
    福建: ["厦门市", "福州市", "泉州市"],
    陕西: ["西安市", "咸阳市", "宝鸡市"],
    山东: ["济南市", "青岛市", "烟台市"],
  }
  const browsers = ["Chrome", "Safari", "Edge", "Firefox"]
  const systems = ["Windows 11", "Windows 10", "macOS 14", "macOS 13", "Android 14", "iOS 17", "HarmonyOS 4"]
  const channels = ["自然流量", "抖音推广", "B站合作", "公众号推送", "邮件营销", "线下引流", "官网入口", "朋友圈分享"]
  const watchTypes: ViewerRecord["watchType"][] = ["直播", "回放", "短视频"]
  const tracks = ["百度商桥", "企业微信", "短信邀请", "站内推荐", "外部合作", ""]

  const now = Date.now()
  const baseSession = 1760319686867

  return Array.from({ length: count }, (_, index) => {
    const first = firstNames[Math.floor(random() * firstNames.length)]
    const last = lastNames[Math.floor(random() * lastNames.length)]
    const province = provinces[Math.floor(random() * provinces.length)]
    const cities = cityMap[province]
    const city = cities[Math.floor(random() * cities.length)]
    const system = systems[Math.floor(random() * systems.length)]
    const browser =
      system.includes("iOS") || system.includes("macOS") // align OS/browser combos
        ? random() > 0.3
          ? "Safari"
          : "Chrome"
        : browsers[Math.floor(random() * browsers.length)]
    const watchType = watchTypes[Math.floor(random() * watchTypes.length)]
    const isMobile = system.includes("Android") || system.includes("iOS") || system.includes("HarmonyOS")
    const duration = Math.floor(random() * 3200) + 120 // 2~55 minutes
    const stay = duration + Math.floor(random() * 180)
    const start = now - random() * 1000 * 60 * 60 * 24 * 30 // within last 30 days
    const firstActive = start - random() * 60000
    const lastActive = firstActive + stay * 1000

    return {
      id: `${baseSession + index}`,
      userId: `${(random() * 1e10).toString(16).slice(0, 10)}`,
      userName: `${first}${last}`,
      playDuration: duration,
      firstActiveTime: Math.floor(firstActive),
      lastActiveTime: Math.floor(lastActive),
      province,
      city,
      ipAddress: `${Math.floor(random() * 255)}.${Math.floor(random() * 255)}.${Math.floor(random() * 255)}.${Math.floor(random() * 255)}`,
      operatingSystem: system,
      browser,
      channelLabel: channels[Math.floor(random() * channels.length)],
      sessionId: `session_${baseSession + index}`,
      watchType,
      trackFrom: tracks[Math.floor(random() * tracks.length)],
      isMobile,
    }
  })
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
