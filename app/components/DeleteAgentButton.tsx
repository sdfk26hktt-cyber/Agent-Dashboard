'use client'
import { deleteAgent } from '@/app/actions'
import { useRouter } from 'next/navigation'

export default function DeleteAgentButton({ agentId, agentName }: { agentId: string, agentName: string }) {
  const router = useRouter()

  const handleDelete = async () => {
    if (window.confirm(`Are you absolutely sure you want to delete ${agentName}? This action cannot be undone and will delete all associated deals, ledgers, and cost entries.`)) {
      await deleteAgent(agentId)
      router.push('/')
    }
  }

  return (
    <button onClick={handleDelete} className="btn" style={{ backgroundColor: 'var(--danger)', color: 'white', width: '100%' }}>
      Delete Agent
    </button>
  )
}
