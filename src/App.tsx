/** Hash-router shell for CallInsight AI screens. */
/** Routes: home, informe, plan, historial, ajustes. */
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { Informe } from './pages/Informe'
import { Plan } from './pages/Plan'
import { Historial } from './pages/Historial'
import { Ajustes } from './pages/Ajustes'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/informe/:id" element={<Informe />} />
        <Route path="/plan/:id" element={<Plan />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
