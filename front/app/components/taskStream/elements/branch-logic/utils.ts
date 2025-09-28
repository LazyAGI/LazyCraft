import type { ExecutionBranch as Branch } from '@/app/components/taskStream/types'

export const branchNameValid = (branches: Branch[]) => {
  const branchCount = branches.length
  if (branchCount < 2)
    throw new Error('if-else 节点分支数量必须大于等于 2')

  return branches.map((branch, index) => {
    return {
      ...branch,
      label: branch.id === 'false' ? 'ELSE' : index == 0 ? 'IF ' : 'ELIF',
    }
  })
}
