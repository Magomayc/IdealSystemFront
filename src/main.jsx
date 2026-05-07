import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query' // <--- IMPORTANTE

const queryClient = new QueryClient() // <--- IMPORTANTE

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}> {/* <--- ENVOLVENDO O APP */}
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)