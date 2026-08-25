import { create } from 'zustand';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  isError?: boolean;
}

interface AppState {
  selectedNodeId: string | null;
  activeRiskId: string | null;
  disruptedNodeId: string | null;
  chatHistory: ChatMessage[];
  isLoading: boolean;
  
  setSelectedNodeId: (id: string | null) => void;
  setActiveRiskId: (id: string | null) => void;
  setDisruptedNodeId: (id: string | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  selectedNodeId: null,
  activeRiskId: null,
  disruptedNodeId: null,
  chatHistory: [],
  isLoading: false,

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setActiveRiskId: (id) => set({ activeRiskId: id }),
  setDisruptedNodeId: (id) => set({ disruptedNodeId: id }),
  addChatMessage: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
  setLoading: (loading) => set({ isLoading: loading }),
}));
