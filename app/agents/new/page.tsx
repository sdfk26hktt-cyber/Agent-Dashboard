import { createAgent } from '@/app/actions'
import { prisma } from '@/lib/prisma'

export default async function NewAgent() {
  const teamAgents = await prisma.agent.findMany({
    where: { role: 'TEAM_AGENT' }
  })

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Add New Agent</h1>
      
      <div className="card">
        <form action={createAgent} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input type="text" id="name" name="name" className="input" required />
          </div>

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input type="email" id="email" name="email" className="input" required placeholder="agent@example.com" />
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input type="password" id="password" name="password" className="input" required placeholder="••••••••" />
          </div>

          <div>
            <label className="label" htmlFor="role">Role</label>
            <select id="role" name="role" className="input" required>
              <option value="SHOWING_PARTNER">Showing Partner</option>
              <option value="EMPIRE_BUILDER">Empire Builder</option>
              <option value="TEAM_AGENT">Team Agent</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="startDate">Start Date</label>
            <input type="date" id="startDate" name="startDate" className="input" required defaultValue={new Date().toISOString().split('T')[0]} />
          </div>

          <div>
            <label className="label" htmlFor="supervisorId">Supervising or Sponsoring Team Agent</label>
            <select id="supervisorId" name="supervisorId" className="input">
              <option value="">None</option>
              {teamAgents.map(ta => (
                <option key={ta.id} value={ta.id}>{ta.name}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              For Showing Partners, select their Supervisor. For Team Agents, select their Sponsor who will receive the 9.5% GCI Override.
            </p>
          </div>



          <div style={{ marginTop: '1rem' }}>
            <button type="submit" className="btn">Create Agent</button>
          </div>
        </form>
      </div>
    </div>
  )
}
