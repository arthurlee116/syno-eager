import '@mcp-b/global'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { Toaster } from "@/components/Toaster"

const queryClient = new QueryClient({
  defaultOptions: { queries: { gcTime: 1000 * 60 * 60 * 24 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
)
