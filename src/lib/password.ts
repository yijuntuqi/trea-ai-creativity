/**
 * 与 Supabase 后台 Password 设置保持一致：
 * 至少 8 位，且包含小写字母、大写字母、数字和符号。
 */
export function passwordIssue(password: string): string | null {
  if (password.length < 8) return '密码至少 8 位'
  const missing: string[] = []
  if (!/[a-z]/.test(password)) missing.push('小写字母')
  if (!/[A-Z]/.test(password)) missing.push('大写字母')
  if (!/\d/.test(password)) missing.push('数字')
  if (!/[^a-zA-Z0-9]/.test(password)) missing.push('符号')
  return missing.length > 0 ? `还需包含${missing.join('、')}` : null
}
