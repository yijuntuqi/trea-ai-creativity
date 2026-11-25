import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function readEnv(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

const url = readEnv(import.meta.env.VITE_SUPABASE_URL)
const key = readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)

// 未配置或配置被污染时返回 null，前端自动退化为纯本地模式
export const isCloudEnabled = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && key.length > 20

export const supabase: SupabaseClient | null = isCloudEnabled
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
