import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

/**
 * Caching policy is tuned to how fast each product actually changes; individual
 * queries override staleTime and refetchInterval. Retry is limited because a
 * failing NOAA endpoint should surface quickly rather than spin.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
      // A window left open on a wall or a second monitor is never focused, and
      // TanStack pauses refetchInterval in that state by default. Everything
      // here is live data whose whole value is being current, so intervals keep
      // running in the background.
      refetchIntervalInBackground: true,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
