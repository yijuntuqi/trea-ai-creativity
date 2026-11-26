import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isCloudEnabled } from '../lib/supabase'
import {
  VIP_PLANS,
  formatBytes,
  limitsFor,
  vipDaysLeft,
  vipExpiryLabel,
  type PlanCode,
} from '../lib/entitlement'
import { createOrder, listMyOrders, type VipOrder } from '../lib/orders'
import { useAuthStore } from '../store/auth'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

const DEMO = (import.meta.env.VITE_VIP_DEMO ?? 'true') !== 'false'

const BENEFITS = [
  { title: '大文件上传', desc: '单文件 20MB、单场累计 50MB，论文与实验数据一次传完。' },
  { title: '不限次带文件答辩', desc: '免费用户只有一次，VIP 可反复上传材料、反复练。' },
  { title: 'GitHub 仓库导入', desc: '粘贴公开仓库链接，自动抓取 README 与顶层目录。' },
]

function statusLabel(status: VipOrder['status']): string {
  if (status === 'paid') return '已开通'
  if (status === 'rejected') return '已驳回'
  return '待核对'
}

function QrCard({ title, src }: { title: string; src: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs text-paper/50">{title}</p>
      {failed ? (
        <p className="py-8 text-center text-[11px] leading-relaxed text-paper/30">
          收款码未配置
          <br />
          请放入 {src.replace('/pay/', 'public/pay/')}
        </p>
      ) : (
        <img
          src={src}
          alt={`${title}收款码`}
          onError={() => setFailed(true)}
          className="h-40 w-40 rounded-lg bg-white/90 object-contain p-1"
        />
      )}
    </div>
  )
}

export default function Vip() {
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const isVip = useAuthStore((state) => state.isVip)
  const refreshProfile = useAuthStore((state) => state.refreshProfile)

  const [plan, setPlan] = useState<PlanCode>('month')
  const [paidOrderNo, setPaidOrderNo] = useState('')
  const [contact, setContact] = useState(user?.email ?? '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [orders, setOrders] = useState<VipOrder[]>([])

  useEffect(() => {
    if (!user) return
    let alive = true
    void listMyOrders().then((list) => {
      if (alive) setOrders(list)
    })
    void refreshProfile()
    return () => {
      alive = false
    }
  }, [user?.id, refreshProfile])

  const selected = VIP_PLANS.find((item) => item.code === plan) ?? VIP_PLANS[0]
  const freeLimits = limitsFor('free')
  const vipLimits = limitsFor('vip')
  const expiry = vipExpiryLabel(profile)
  const daysLeft = vipDaysLeft(profile)
  const pending = orders.find((order) => order.status === 'pending')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    if (!user) {
      setError('请先登录账号再提交订单。')
      return
    }
    if (paidOrderNo.trim().length < 4) {
      setError('请填写支付订单号（微信/支付宝交易单号）。')
      return
    }
    if (!contact.trim()) {
      setError('请填写联系方式，方便核对后通知你。')
      return
    }
    setBusy(true)
    const result = await createOrder({
      planCode: selected.code,
      amountCents: selected.priceCents,
      paidOrderNo,
      contact,
      note,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setPaidOrderNo('')
    setNote('')
    setNotice(
      `订单已提交（订单号 ${result.order.order_no}）。管理员核对支付记录后 1 个工作日内开通，可在本页查看状态。`,
    )
    setOrders((prev) => [result.order, ...prev])
    void refreshProfile()
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-paper">会员权益</h1>
        <p className="mt-2 text-sm text-paper/60">
          免费用户可完整体验一次带文件的答辩；VIP 解锁大文件、不限次上传与 GitHub 仓库导入。
        </p>
      </header>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-paper/40">当前身份</p>
            <p className="mt-1 text-sm text-paper/85">
              {!user
                ? '未登录（本机记录，免费额度仅在本机计算）'
                : isVip
                  ? 'VIP 会员'
                  : '免费用户'}
            </p>
          </div>
          {isVip ? (
            <div className="text-right">
              <p className="text-xs text-paper/40">有效期至</p>
              <p className="mt-1 text-sm text-gold/85">
                {expiry ?? '长期有效'}
                {typeof daysLeft === 'number' ? ` · 剩 ${daysLeft} 天` : ''}
              </p>
            </div>
          ) : user ? (
            <a href="#plans" className="text-xs text-gold/80 transition hover:text-gold">
              选择套餐
            </a>
          ) : (
            <Link to="/account" className="text-xs text-gold/80 transition hover:text-gold">
              登录后开通 →
            </Link>
          )}
        </div>
        {!isVip && (
          <p className="text-xs leading-relaxed text-paper/45">
            免费额度：单文件 {formatBytes(freeLimits.perFileBytes)}、单场累计{' '}
            {formatBytes(freeLimits.totalBytes)}，带文件的答辩只能上传一场；
            {profile?.free_upload_used_at ? '你已使用免费上传额度。' : '当前仍可使用。'}
          </p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {BENEFITS.map((item) => (
          <Card key={item.title} className="space-y-2">
            <p className="font-serif text-lg text-gold/90">{item.title}</p>
            <p className="text-xs leading-relaxed text-paper/50">{item.desc}</p>
          </Card>
        ))}
      </div>

      <Card id="plans" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-paper/85">选择套餐</p>
            <p className="mt-1 text-xs text-paper/45">
              VIP 额度：单文件 {formatBytes(vipLimits.perFileBytes)} · 单场累计{' '}
              {formatBytes(vipLimits.totalBytes)}
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {VIP_PLANS.map((item) => {
            const active = item.code === plan
            return (
              <button
                key={item.code}
                type="button"
                aria-pressed={active}
                onClick={() => setPlan(item.code)}
                className={
                  active
                    ? 'rounded-2xl border border-gold/60 bg-gold/[0.1] p-4 text-left transition'
                    : 'rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-white/25'
                }
              >
                <p className="text-sm text-paper/85">{item.name}</p>
                <p className="mt-2 font-serif text-2xl text-gold">
                  ¥{item.priceLabel}
                  <span className="ml-1 text-xs font-normal text-paper/40">/{item.days} 天</span>
                </p>
                <p className="mt-1 text-xs text-paper/45">{item.tagline}</p>
              </button>
            )
          })}
        </div>
      </Card>

      {!isCloudEnabled ? (
        <Card>
          <p className="text-sm text-paper/70">当前部署未配置账号服务，暂不能提交订单。</p>
        </Card>
      ) : !user ? (
        <Card className="space-y-3">
          <p className="text-sm text-paper/70">登录后才能提交订单并绑定会员权益。</p>
          <Link to="/account" className="text-xs text-gold/80 transition hover:text-gold">
            去登录 / 注册 →
          </Link>
        </Card>
      ) : (
        <Card className="space-y-4">
          <div>
            <p className="text-sm text-paper/85">付款并提交订单</p>
            <p className="mt-1 text-xs text-paper/45">
              扫码支付 ¥{selected.priceLabel}（{selected.name}），然后填写支付订单号与联系方式。
            </p>
          </div>

          {DEMO ? (
            <div className="rounded-xl border border-gold/25 bg-gold/[0.06] px-3 py-2 text-xs leading-relaxed text-gold/85">
              演示环境：本页不展示真实收款码。你可以正常提交订单，管理员在后台确认后即可开通会员，用于完整演示权益开通流程。
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <QrCard title="微信支付" src="/pay/wechat.png" />
              <QrCard title="支付宝" src="/pay/alipay.png" />
            </div>
          )}

          <form className="space-y-3" onSubmit={(event) => void submit(event)}>
            <label className="block space-y-2">
              <span className="text-xs text-paper/50">支付订单号（交易单号）</span>
              <Input
                required
                value={paidOrderNo}
                onChange={(event) => setPaidOrderNo(event.target.value)}
                placeholder="微信/支付宝账单里的商户单号或交易单号"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs text-paper/50">联系方式</span>
              <Input
                required
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder="邮箱或微信号，方便核对后通知你"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs text-paper/50">备注（可选）</span>
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="例如付款时间、账号说明"
              />
            </label>

            {error && <p className="text-sm text-red-300">{error}</p>}
            {notice && <p className="text-sm leading-relaxed text-gold/85">{notice}</p>}
            {pending && !notice && (
              <p className="text-xs text-paper/45">
                你已有一条待核对订单（{pending.order_no}），管理员处理后可再次提交。
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={busy || Boolean(pending)}>
                {busy ? '提交中…' : pending ? '已有待核对订单' : '提交订单'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {orders.length > 0 && (
        <Card className="space-y-3">
          <p className="text-sm text-paper/85">我的订单</p>
          <ul className="space-y-2">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink/40 px-3 py-2 text-xs"
              >
                <div>
                  <p className="text-paper/80">
                    {order.order_no} · ¥{(order.amount_cents / 100).toFixed(2)}
                  </p>
                  <p className="mt-0.5 text-paper/40">
                    {new Date(order.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                <span
                  className={
                    order.status === 'paid'
                      ? 'rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-gold/85'
                      : order.status === 'rejected'
                        ? 'rounded-full border border-red-300/30 bg-red-300/10 px-2 py-0.5 text-red-300/80'
                        : 'rounded-full border border-white/15 px-2 py-0.5 text-paper/55'
                  }
                >
                  {statusLabel(order.status)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  )
}
