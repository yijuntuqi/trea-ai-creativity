import { supabase } from './supabase'
import type { PlanCode } from './entitlement'

export type VipOrderStatus = 'pending' | 'paid' | 'rejected'

export type VipOrder = {
  id: string
  user_id: string
  plan_code: PlanCode
  amount_cents: number
  order_no: string
  contact: string | null
  note: string | null
  status: VipOrderStatus
  created_at: string
  paid_at: string | null
}

export type CreateOrderInput = {
  planCode: PlanCode
  amountCents: number
  paidOrderNo: string
  contact: string
  note?: string
}

export type CreateOrderResult =
  | { ok: true; order: VipOrder }
  | { ok: false; message: string }

/** 生成我方订单号，便于用户回传核对 */
export function makeOrderNo(now = Date.now()): string {
  const stamp = now.toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `DR${stamp}${random}`
}

function orderMessage(raw: string): string {
  const text = raw.toLowerCase()
  if (text.includes('duplicate') || text.includes('unique') || text.includes('vip_orders_one_pending')) {
    return '你已有一条待核对的订单，请等待管理员开通后再提交新订单。'
  }
  if (text.includes('row-level security') || text.includes('permission')) {
    return '没有权限提交订单，请先登录账号。'
  }
  return raw
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  if (!supabase) return { ok: false, message: '账号服务未配置，暂不能提交订单。' }

  const { data, error } = await supabase
    .from('vip_orders')
    .insert({
      plan_code: input.planCode,
      amount_cents: input.amountCents,
      order_no: makeOrderNo(),
      contact: input.contact.trim() || null,
      note: [input.paidOrderNo.trim(), input.note?.trim()].filter(Boolean).join('｜') || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return { ok: false, message: orderMessage(error.message) }
  return { ok: true, order: data as VipOrder }
}

export async function listMyOrders(): Promise<VipOrder[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('vip_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) return []
  return (data ?? []) as VipOrder[]
}
