import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Observations from './pages/Observations'
import Forecast from './pages/Forecast'
import Satellite from './pages/Satellite'
import Radar from './pages/Radar'
import Tropical from './pages/Tropical'
import Analysis from './pages/Analysis'
import About from './pages/About'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="observations" element={<Observations />} />
        <Route path="forecast" element={<Forecast />} />
        <Route path="satellite" element={<Satellite />} />
        <Route path="radar" element={<Radar />} />
        <Route path="tropical" element={<Tropical />} />
        <Route path="analysis" element={<Analysis />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
