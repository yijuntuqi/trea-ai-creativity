export default function Timer({ seconds, limit }: { seconds: number; limit?: number }) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  const label = `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
  const overtime = limit !== undefined && seconds > limit

  return (
    <div>
      <p className="font-mono text-2xl text-paper">{label}</p>
      <p className="text-xs text-paper/40">{overtime ? '已超时' : limit ? `建议 ${limit} 秒` : '本题用时'}</p>
    </div>
  )
}
