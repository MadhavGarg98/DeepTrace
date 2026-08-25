import type { AnalyticsSummary, ChatRequest, ChatResponse, GraphDataResponse, RisksResponse, SuppliersResponse, DisruptionHistoryResponse, SimulateResponse } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function fetcher<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  getAnalyticsSummary: () => fetcher<AnalyticsSummary>('/api/v1/analytics/summary'),
  getRisks: () => fetcher<RisksResponse>('/api/v1/risks'),
  getGraph: () => fetcher<GraphDataResponse>('/api/v1/graph'),
  getSuppliers: () => fetcher<SuppliersResponse>('/api/v1/suppliers'),
  getDisruptionHistory: () => fetcher<DisruptionHistoryResponse>('/api/v1/disruptions/history'),
  chat: (data: ChatRequest) => fetcher<ChatResponse>('/api/v1/chat', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  simulateDisruption: (node_id: string) => fetcher<SimulateResponse>('/api/v1/disruptions/simulate', {
    method: 'POST',
    body: JSON.stringify({ node_id })
  })
};
