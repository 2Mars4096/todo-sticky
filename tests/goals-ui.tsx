import React from 'react'
import { createRoot } from 'react-dom/client'
import { GoalsSidebar } from '../src/components/GoalsSidebar'
import { useGoals } from '../src/hooks/useGoals'
import '../src/styles/sticky.css'
function Fixture() {
 const g = useGoals()
 return <div style={{height:'100vh',display:'flex'}}><GoalsSidebar collapsed={false} targets={g.targets} recurring={g.recurring} onToggleCollapse={()=>{}} onAddGoal={g.addGoal} onUpdateGoal={g.updateGoal} onDeleteGoal={g.deleteGoal} onToggleGoal={g.toggleGoal}/></div>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
