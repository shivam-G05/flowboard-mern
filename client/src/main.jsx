import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App.jsx';
import { AuthProvider, ME_QUERY_KEY } from './features/auth/AuthProvider.jsx';
import './index.css';

const queryClient = new QueryClient({
  // If any request says the session is gone (401), mark the user signed out; the route guard redirects to /login.
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (error.status === 401 && query.queryKey[0] !== ME_QUERY_KEY[0]) queryClient.setQueryData(ME_QUERY_KEY, null);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: (count, error) => error.status >= 500 && count < 2, // never retry 4xx errors
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster position="bottom-right" closeButton gap={8} />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
