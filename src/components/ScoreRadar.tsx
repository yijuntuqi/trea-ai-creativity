import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
import type { DimensionScores } from '../types'

const LABELS: Record<keyof DimensionScores, string> = {
  accuracy: '内容准确性',
  logic: '逻辑结构',
  depth: '应答深度',
  clarity: '表达清晰',
}

export default function ScoreRadar({ dimensions }: { dimensions: DimensionScores }) {
  const data = (Object.keys(LABELS) as Array<keyof DimensionScores>).map((key) => ({
    dimension: LABELS[key],
    score: dimensions[key],
  }))

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <defs>
            <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F4D9A6" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#E6B563" stopOpacity={0.12} />
            </linearGradient>
          </defs>
          <PolarGrid stroke="rgba(255,255,255,0.13)" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: 'rgba(244,240,230,0.62)', fontSize: 12 }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey="score"
            stroke="#E6B563"
            strokeWidth={1.5}
            fill="url(#scoreFill)"
            fillOpacity={1}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
