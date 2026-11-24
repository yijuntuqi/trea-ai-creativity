import type { Judge } from '../types'

/**
 * 设计头像：不依赖任何网络图片。
 * 当 public/judges/{id}.jpg 存在时，JudgeCard 的 <img> 会优先加载真实照片；
 * 加载失败或文件缺失时回退到这里的 SVG，保证界面始终完整。
 */
export default function JudgeAvatar({
  judge,
  className,
}: {
  judge: Judge
  className?: string
}) {
  const gid = `grad-${judge.id}`
  const ring = `${judge.color}55`

  return (
    <svg
      viewBox="0 0 96 96"
      className={className}
      role="img"
      aria-label={judge.name}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={judge.color} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0B1220" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id={`${gid}-glow`} cx="0.5" cy="0.35" r="0.7">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="48" cy="48" r="46" fill={`url(#${gid})`} />
      <circle cx="48" cy="48" r="46" fill={`url(#${gid}-glow)`} />
      <circle cx="48" cy="48" r="43" fill="none" stroke={ring} strokeWidth="1.5" />

      {/* 肖像剪影：头 + 肩 */}
      <g fill="#ffffff" opacity="0.92">
        <circle cx="48" cy="38" r="14" />
        <path d="M20 86 C20 64 34 56 48 56 C62 56 76 64 76 86 Z" />
      </g>

      {/* 主题色点缀 */}
      <circle cx="72" cy="26" r="3.5" fill={judge.color} opacity="0.9" />
    </svg>
  )
}
