import { DIMENSION_WEIGHTS, levelOf, weightedTotal } from './scoring'
import { JUDGES } from './judges'

it('computes weighted total', () => {
  expect(weightedTotal({ accuracy: 80, logic: 90, depth: 70, clarity: 100 })).toBe(84)
})

it('maps levels at boundaries', () => {
  expect(levelOf(85)).toBe('优秀')
  expect(levelOf(70)).toBe('良好')
  expect(levelOf(69)).toBe('待改进')
})

it('has three distinct judges', () => {
  expect(JUDGES.map((j) => j.id)).toEqual(['method', 'innovation', 'application'])
  expect(Object.keys(DIMENSION_WEIGHTS)).toEqual(['accuracy', 'logic', 'depth', 'clarity'])
})
