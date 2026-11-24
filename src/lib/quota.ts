const KEY = 'dr:quota'
const DAILY_LIMIT = 200

type Quota = { date: string; count: number }

function today(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function read(): Quota {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Quota
      if (parsed && typeof parsed.date === 'string' && typeof parsed.count === 'number') {
        return parsed
      }
    }
  } catch {
    // 损坏数据按未使用处理
  }
  return { date: today(), count: 0 }
}

export function canCallToday(): boolean {
  const quota = read()
  if (quota.date !== today()) return true
  return quota.count < DAILY_LIMIT
}

export function consumeCall(): void {
  const quota = read()
  const count = quota.date === today() ? quota.count : 0
  try {
    localStorage.setItem(KEY, JSON.stringify({ date: today(), count: count + 1 }))
  } catch {
    // 忽略
  }
}

export function resetQuotaForTest(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // 忽略
  }
}
