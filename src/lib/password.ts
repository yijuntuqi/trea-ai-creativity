/** 密码规则与 Supabase 后台 Password 设置保持一致：至少 8 位，含字母和数字 */
export function passwordIssue(password: string): string | null {
  if (password.length < 8) return '密码至少 8 位'
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return '密码需同时包含字母和数字'
  return null
}
