import type { Session } from '../types'

const CREATED_AT = Date.parse('2026-11-20T10:00:00+08:00')

const QUESTIONS: Session['questions'] = [
  {
    id: 'demo-q1',
    judgeId: 'method',
    text: '你的系统在夜间或逆光条件下识别准确率下降明显，为什么评估时只用了白天拍摄的数据集？',
    intent: '考察实验条件是否覆盖真实场景',
    suggestedSeconds: 90,
    followUpLevel: 0,
    answer:
      '目前的数据集确实主要来自白天，因为标注成本较高。我们后续计划补充夜间数据，并在预处理阶段加入亮度增强，但这一部分还没有完成对比实验。',
    timeSpent: 76,
    score: 78,
    comment: '如实承认了数据覆盖不足，这是加分项；但缺少对夜间性能下降幅度的量化说明，也没有给出补充数据的具体采集方案。',
    modelAnswer:
      '当前数据集覆盖白天 6 个时段，夜间与逆光样本约占 8%，因此评估结果对真实场景的代表性有限。后续会按月采集 2000 张夜间图像，并在同一测试集上对比亮度增强前后的准确率变化。',
  },
  {
    id: 'demo-q2',
    judgeId: 'innovation',
    text: '相比已有的 MobileNet 垃圾分类方案，你提出的轻量化模块创新点到底体现在哪里？',
    intent: '考察创新点与已有工作的差异',
    suggestedSeconds: 90,
    followUpLevel: 0,
    answer:
      '我们在 MobileNetV3 的基础上替换了部分卷积层，引入分组卷积和通道注意力，在自制数据集上把参数量降低了 18%，准确率基本持平。',
    timeSpent: 88,
    score: 82,
    comment: '差异描述清楚，也给了参数量的数字；但「准确率基本持平」需要给出具体差值，并说明与最相关工作的直接对比。',
    modelAnswer:
      '我们的改动集中在两点：用分组卷积替换标准卷积，并在每个瓶颈块后加入轻量通道注意力。相比文献 [3] 的方案，参数量从 4.2M 降到 3.4M，Top-1 准确率仅下降 0.4 个百分点，推理延迟降低 22%。',
  },
  {
    id: 'demo-q3',
    judgeId: 'application',
    text: '如果要在学校后勤真实部署，最大的成本障碍是什么？你打算怎么解决？',
    intent: '考察落地成本与真实需求判断',
    suggestedSeconds: 90,
    followUpLevel: 0,
    answer:
      '最大的障碍是摄像头改造和边缘设备采购。我的想法是先在一栋宿舍楼试点，复用现有摄像头，只增加边缘盒子，降低一次性投入。',
    timeSpent: 70,
    score: 80,
    comment: '给出了试点路径，方向务实；但缺少成本估算和与后勤部门的协作方式，建议补上量化预算。',
    modelAnswer:
      '主要成本是边缘算力设备与摄像头改造。我们计划先在一栋宿舍楼试点，复用现有网络与摄像头，只新增 2 台边缘盒子，单点投入约 6000 元；同时与后勤集团共建数据回流机制，按季度评估分拣效率提升。',
  },
  {
    id: 'demo-q4',
    judgeId: 'application',
    text: '你提到分拣效率提升，能说明这个提升是怎么测量的吗？',
    intent: '追问落地效果的度量方式',
    suggestedSeconds: 60,
    followUpLevel: 1,
    answer:
      '目前是按人工抽检的误投率来估计，试点期间每周抽检两次，但没有做严格的对照实验。',
    timeSpent: 54,
    score: 76,
    comment: '回答诚实，但度量方式偏弱。追问下应给出指标定义、采样规模和对照设计，否则「效率提升」缺乏说服力。',
    modelAnswer:
      '我们采用误投率和单桶清运时间两个指标，每栋楼每周随机抽检 100 次投放记录，试点楼与对照楼同期采集，连续 4 周取均值，以排除季节与考试周的影响。',
  },
  {
    id: 'demo-q5',
    judgeId: 'method',
    text: '你如何证明准确率提升来自注意力模块，而不是训练轮数增加带来的？',
    intent: '考察消融实验的严谨性',
    suggestedSeconds: 90,
    followUpLevel: 0,
    answer:
      '我们做了消融实验：去掉注意力模块后，在相同训练轮数和相同随机种子下重新训练，准确率下降了 1.9 个百分点。',
    timeSpent: 64,
    score: 84,
    comment: '消融实验条件控制得当，回答直接命中问题；如果能补充多次运行的方差会更有说服力。',
    modelAnswer:
      '我们在完全相同的训练轮数、学习率与随机种子下做了三组消融：基线、仅分组卷积、仅注意力。结果显示注意力模块单独贡献 1.9 个百分点，且三次运行的方差小于 0.3。',
  },
  {
    id: 'demo-q6',
    judgeId: 'innovation',
    text: '如果让你重新做一次这个课题，你会把哪一部分推倒重来？',
    intent: '考察反思能力与边界认知',
    suggestedSeconds: 90,
    followUpLevel: 1,
    answer:
      '我会重做数据采集和评估部分。现在数据集太小，场景单一，导致所有结论都建立在偏乐观的测试集上，这是整个工作最薄弱的地方。',
    timeSpent: 58,
    score: 88,
    comment: '反思具体且切中要害，能主动指出评估体系的根本问题，这是很强的回答。',
    modelAnswer:
      '我会把数据采集与评估体系推倒重来：先按场景分层设计采集计划，再固定测试集与评价协议，最后才做模型迭代。否则模型层面的改进很难被可信地验证。',
  },
]

export const DEMO_SESSION: Session = {
  id: 'demo-defense',
  createdAt: CREATED_AT,
  config: { type: 'undergrad', discipline: 'stem', strictness: 'standard', minutes: 15 },
  material: {
    fileName: '毕业设计摘要.pdf',
    text: '本研究面向校园垃圾分类场景，设计并实现了一套基于轻量化卷积神经网络的智能识别系统。系统在自建数据集上达到 93.2% 的识别准确率，参数量较 MobileNetV3 降低 18%，并在一栋宿舍楼完成了为期两周的试点部署。',
    chars: 112,
    hash: 'demo-hash',
  },
  portrait: {
    topic: '面向校园场景的智能垃圾分类识别系统设计与实现',
    problem: '现有垃圾分类模型参数量大、难以在校园边缘设备上实时运行。',
    method: '自建 8000 张校园垃圾数据集，以 MobileNetV3 为基线做轻量化改造，并开展两周试点。',
    innovation: ['分组卷积替代标准卷积', '引入轻量通道注意力模块', '面向边缘设备的部署方案'],
    evidence: ['识别准确率 93.2%', '参数量降低 18%', '试点误投率下降 12%'],
    limitations: ['数据集场景单一，缺少夜间样本', '试点规模小，未做长期对照'],
    keywords: ['垃圾分类', '轻量化网络', '边缘部署'],
  },
  messages: [],
  questions: QUESTIONS,
  status: 'finished',
  report: {
    total: 82,
    level: '良好',
    dimensions: { accuracy: 84, logic: 80, depth: 78, clarity: 86 },
    questions: QUESTIONS.map((question) => ({
      questionId: question.id,
      question: question.text,
      answer: question.answer ?? '',
      score: question.score ?? 0,
      comment: question.comment ?? '',
      modelAnswer: question.modelAnswer ?? '',
    })),
    topRisks: [
      {
        question: '夜间与逆光场景的识别性能如何保证？',
        reason: '训练与评估数据以白天为主，真实场景覆盖不足。',
      },
      {
        question: '创新点与已有轻量化方案的差异是什么？',
        reason: '缺少与最相关工作的直接对比和显著性说明。',
      },
      {
        question: '试点效果如何度量？',
        reason: '误投率指标缺少对照设计与采样规模说明。',
      },
    ],
    checklist: [
      '补充夜间与逆光样本的采集计划和现有性能差距。',
      '为轻量化模块准备一张与基线方案的对比表。',
      '把试点指标定义、采样规模和对照设计写成三句话。',
      '准备一个失败案例，说明失败原因与改进方向。',
    ],
    summary:
      '整体完成度高，工程实现扎实，回答时能主动承认边界。主要短板在评估体系：数据覆盖与效果度量都偏弱，导致部分结论说服力不足。按复盘清单逐条补齐，优秀区间并不遥远。',
    createdAt: CREATED_AT,
  },
}
