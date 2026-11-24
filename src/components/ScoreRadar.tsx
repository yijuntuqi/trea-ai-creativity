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
          <PolarGrid stroke="rgba(255,255,255,0.15)" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: 'rgba(245,241,232,0.6)', fontSize: 12 }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="score" stroke="#E8B45A" fill="#E8B45A" fillOpacity={0.25} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
