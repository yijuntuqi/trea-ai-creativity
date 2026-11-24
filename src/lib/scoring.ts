import type { DimensionScores, Report } from '../types'

export const DIMENSION_WEIGHTS = {
  accuracy: 0.3,
  logic: 0.25,
  depth: 0.25,
  clarity: 0.2,
} as const

export function weightedTotal(d: DimensionScores): number {
  return Math.round(
    d.accuracy * DIMENSION_WEIGHTS.accuracy +
      d.logic * DIMENSION_WEIGHTS.logic +
      d.depth * DIMENSION_WEIGHTS.depth +
      d.clarity * DIMENSION_WEIGHTS.clarity,
  )
}

export function levelOf(total: number): Report['level'] {
  if (total >= 85) return '优秀'
  if (total >= 70) return '良好'
  return '待改进'
}
