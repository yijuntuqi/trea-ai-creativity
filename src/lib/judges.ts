import type { Judge } from '../types'

export const JUDGES: Judge[] = [
  {
    id: 'method',
    name: '方法论派 · 严谨型',
    focus: '方法合理性、样本、对照、统计',
    style: '追问细节，要求给数据',
    color: '#6FA8DC',
    avatar: '/judges/method.jpg',
  },
  {
    id: 'innovation',
    name: '创新性质疑派 · 犀利型',
    focus: '与已有工作的差异、贡献边界',
    style: '直接质疑「这算创新吗」',
    color: '#E8B45A',
    avatar: '/judges/innovation.jpg',
  },
  {
    id: 'application',
    name: '应用价值派 · 务实型',
    focus: '落地成本、真实需求、可推广性',
    style: '追问「谁会用、为什么用」',
    color: '#7BC47F',
    avatar: '/judges/application.jpg',
  },
]

export function judgeById(id: Judge['id']): Judge {
  return JUDGES.find((j) => j.id === id) ?? JUDGES[0]
}
