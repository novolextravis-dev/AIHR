import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Message {
  role: "user" | "assistant"
  content: string
  timestamp?: number
}

export interface Task {
  id: string
  title: string
  status: "pending" | "in-progress" | "complete" | "error"
  type: "document" | "ai" | "workflow"
  createdAt?: number
  progress?: number
}

export interface Document {
  id: string
  name: string
  type: string
  content: string
  preview?: string
  structuredData?: {
    metadata?: {
      title?: string
      author?: string
      slideCount?: number
      createdAt?: string
      modifiedAt?: string
    }
    slides?: Array<{
      slideNumber: number
      title: string
      subtitle?: string
      content: string[]
      tables?: Array<{ rows: string[][] }>
      notes?: string
    }>
  }
  metadata?: {
    fileName?: string
    fileType?: string
    size?: number
    processedAt?: string
    pageCount?: number
    sheetCount?: number
    slideCount?: number
    lineCount?: number
    presentationTitle?: string
    author?: string
    sheets?: Array<{ name: string; rowCount: number }>
    slides?: Array<{
      number: number
      title: string
      hasNotes: boolean
      contentLength: number
    }>
    [key: string]: unknown
  }
  characterCount?: number
  wordCount?: number
  status: "uploading" | "parsing" | "ready" | "analyzing" | "error"
  analysis?: string
  error?: string
}

export interface CoreMemoryItem {
  id: string
  name: string
  type: "document" | "text" | "spreadsheet"
  summary: string
  content: string
  keywords: string[]
  addedAt: number
  fileType?: string
  category?: "handbook" | "policy" | "employees" | "procedures" | "other"
}

export interface AISettings {
  modelPreference: "balanced" | "fast" | "thorough"
  responseLength: "concise" | "detailed" | "comprehensive"
  tone: "professional" | "friendly" | "formal"
  autoSummarize: boolean
  useCorememory: boolean
  companyName: string
  industry: string
}

export interface WorkflowStep {
  id: string
  type: "document" | "email" | "task" | "approval"
  title: string
  status: "pending" | "active" | "complete"
}

export interface Workflow {
  id: string
  name: string
  steps: WorkflowStep[]
  createdAt: number
  lastRun?: number
}

interface HRStore {
  // Chat
  messages: Message[]
  addMessage: (message: Message) => void
  clearMessages: () => void

  documents: Document[]
  currentDocument: Document | null
  addDocument: (doc: Document) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  removeDocument: (id: string) => void
  setCurrentDocument: (doc: Document | null) => void
  clearDocuments: () => void

  // Tasks
  tasks: Task[]
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void

  // UI State
  isDraggingFile: boolean
  setIsDraggingFile: (isDragging: boolean) => void
  processingQueue: string[]
  addToQueue: (id: string) => void
  removeFromQueue: (id: string) => void

  coreMemory: CoreMemoryItem[]
  addToCoreMemory: (item: CoreMemoryItem) => void
  removeFromCoreMemory: (id: string) => void
  updateCoreMemoryItem: (id: string, updates: Partial<CoreMemoryItem>) => void
  clearCoreMemory: () => void

  aiSettings: AISettings
  updateAISettings: (settings: Partial<AISettings>) => void
  resetAISettings: () => void

  isSettingsOpen: boolean
  setIsSettingsOpen: (isOpen: boolean) => void

  workflows: Workflow[]
  currentWorkflow: Workflow | null
  addWorkflow: (workflow: Workflow) => void
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void
  removeWorkflow: (id: string) => void
  setCurrentWorkflow: (workflow: Workflow | null) => void
  clearWorkflows: () => void
}

const defaultAISettings: AISettings = {
  modelPreference: "balanced",
  responseLength: "detailed",
  tone: "professional",
  autoSummarize: true,
  useCorememory: true,
  companyName: "",
  industry: "",
}

export const useHRStore = create<HRStore>()(
  persist(
    (set) => ({
      // Chat
      messages: [],
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, { ...message, timestamp: Date.now() }],
        })),
      clearMessages: () => set({ messages: [] }),

      documents: [],
      currentDocument: null,
      addDocument: (doc) =>
        set((state) => ({
          documents: [...state.documents, doc],
        })),
      updateDocument: (id, updates) =>
        set((state) => ({
          documents: state.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
          currentDocument:
            state.currentDocument?.id === id ? { ...state.currentDocument, ...updates } : state.currentDocument,
        })),
      removeDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
          currentDocument: state.currentDocument?.id === id ? null : state.currentDocument,
        })),
      setCurrentDocument: (doc) => set({ currentDocument: doc }),
      clearDocuments: () => set({ documents: [], currentDocument: null }),

      // Tasks
      tasks: [],
      addTask: (task) =>
        set((state) => ({
          tasks: [{ ...task, createdAt: Date.now() }, ...state.tasks],
        })),
      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      removeTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        })),

      // UI State
      isDraggingFile: false,
      setIsDraggingFile: (isDragging) => set({ isDraggingFile: isDragging }),
      processingQueue: [],
      addToQueue: (id) =>
        set((state) => ({
          processingQueue: [...state.processingQueue, id],
        })),
      removeFromQueue: (id) =>
        set((state) => ({
          processingQueue: state.processingQueue.filter((i) => i !== id),
        })),

      coreMemory: [],
      addToCoreMemory: (item) =>
        set((state) => ({
          coreMemory: [...state.coreMemory, item],
        })),
      removeFromCoreMemory: (id) =>
        set((state) => ({
          coreMemory: state.coreMemory.filter((m) => m.id !== id),
        })),
      updateCoreMemoryItem: (id, updates) =>
        set((state) => ({
          coreMemory: state.coreMemory.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),
      clearCoreMemory: () => set({ coreMemory: [] }),

      aiSettings: defaultAISettings,
      updateAISettings: (settings) =>
        set((state) => ({
          aiSettings: { ...state.aiSettings, ...settings },
        })),
      resetAISettings: () => set({ aiSettings: defaultAISettings }),

      isSettingsOpen: false,
      setIsSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),

      workflows: [],
      currentWorkflow: null,
      addWorkflow: (workflow) =>
        set((state) => ({
          workflows: [...state.workflows, workflow],
        })),
      updateWorkflow: (id, updates) =>
        set((state) => ({
          workflows: state.workflows.map((w) => (w.id === id ? { ...w, ...updates } : w)),
          currentWorkflow:
            state.currentWorkflow?.id === id ? { ...state.currentWorkflow, ...updates } : state.currentWorkflow,
        })),
      removeWorkflow: (id) =>
        set((state) => ({
          workflows: state.workflows.filter((w) => w.id !== id),
          currentWorkflow: state.currentWorkflow?.id === id ? null : state.currentWorkflow,
        })),
      setCurrentWorkflow: (workflow) => set({ currentWorkflow: workflow }),
      clearWorkflows: () => set({ workflows: [], currentWorkflow: null }),
    }),
    {
      name: "hr-assistant-storage",
      partialize: (state) => ({
        messages: state.messages,
        tasks: state.tasks,
        documents: state.documents,
        coreMemory: state.coreMemory,
        aiSettings: state.aiSettings,
        workflows: state.workflows,
      }),
    },
  ),
)
