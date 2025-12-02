"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Upload,
  FileText,
  FileSpreadsheet,
  Presentation,
  File,
  X,
  CheckCircle2,
  Loader2,
  Eye,
  Download,
  Sparkles,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useHRStore, type Document } from "@/lib/store"
import { PPTXViewer } from "./pptx-viewer"
import { useToast } from "@/components/ui/use-toast"

interface DocumentUploadProps {
  onBack: () => void
}

const fileTypeConfig: Record<string, { icon: typeof FileText; color: string; bg: string; label: string }> = {
  "application/pdf": { icon: FileText, color: "text-red-500", bg: "bg-red-100", label: "PDF" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-100",
    label: "DOCX",
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    icon: FileSpreadsheet,
    color: "text-green-500",
    bg: "bg-green-100",
    label: "XLSX",
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    icon: Presentation,
    color: "text-orange-500",
    bg: "bg-orange-100",
    label: "PPTX",
  },
  "text/csv": { icon: FileSpreadsheet, color: "text-green-500", bg: "bg-green-100", label: "CSV" },
  "text/plain": { icon: File, color: "text-slate-500", bg: "bg-slate-100", label: "TXT" },
}

function getFileConfigFromFile(file: { type: string; name: string }) {
  const ext = file.name.toLowerCase().split(".").pop()

  if (fileTypeConfig[file.type]) {
    return fileTypeConfig[file.type]
  }

  switch (ext) {
    case "pptx":
      return fileTypeConfig["application/vnd.openxmlformats-officedocument.presentationml.presentation"]
    case "docx":
      return fileTypeConfig["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    case "xlsx":
      return fileTypeConfig["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
    case "pdf":
      return fileTypeConfig["application/pdf"]
    case "csv":
      return fileTypeConfig["text/csv"]
    case "txt":
      return fileTypeConfig["text/plain"]
    default:
      return { icon: File, color: "text-slate-500", bg: "bg-slate-100", label: "FILE" }
  }
}

export function DocumentUpload({ onBack }: DocumentUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [pptxViewerDoc, setPptxViewerDoc] = useState<Document | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const {
    documents,
    addDocument,
    updateDocument,
    removeDocument,
    setCurrentDocument,
    addTask,
    updateTask,
    coreMemory,
    aiSettings,
  } = useHRStore()

  const processFile = async (file: File) => {
    const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const taskId = `task-${docId}`
    addTask({
      id: taskId,
      title: `Processing: ${file.name}`,
      status: "in-progress",
      type: "document",
      progress: 0,
    })

    addDocument({
      id: docId,
      name: file.name,
      type: file.type,
      content: "",
      status: "uploading",
    })

    try {
      updateDocument(docId, { status: "parsing" })
      setUploadProgress((prev) => ({ ...prev, [docId]: 50 }))
      updateTask(taskId, { progress: 50 })

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/parse-document", {
        method: "POST",
        body: formData,
      })

      const responseText = await response.text()

      let data
      try {
        data = JSON.parse(responseText)
      } catch {
        throw new Error("Server returned invalid response. Please try again.")
      }

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to parse document")
      }

      setUploadProgress((prev) => ({ ...prev, [docId]: 100 }))
      updateTask(taskId, { progress: 100, status: "complete", title: `Processed: ${file.name}` })

      updateDocument(docId, {
        id: docId,
        name: file.name,
        type: file.type,
        content: data.content,
        status: "ready",
        preview: data.preview,
        metadata: data.metadata,
        structuredData: data.structuredData,
        characterCount: data.characterCount,
        wordCount: data.wordCount,
      })
    } catch (error) {
      updateDocument(docId, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      })
      updateTask(taskId, {
        status: "error",
        title: `Failed: ${file.name}`,
      })
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsDragging(false)

      if (acceptedFiles.length === 0) {
        return
      }

      const allowedExtensions = [".pdf", ".docx", ".xlsx", ".pptx", ".csv", ".txt"]
      const validFiles = acceptedFiles.filter((file) => {
        const ext = "." + file.name.split(".").pop()?.toLowerCase()
        return allowedExtensions.includes(ext)
      })

      if (validFiles.length === 0) {
        toast({
          title: "Invalid file type",
          description: "Please upload PDF, DOCX, XLSX, PPTX, CSV, or TXT files.",
          variant: "destructive",
        })
        return
      }

      for (const file of validFiles) {
        await processFile(file)
      }
    },
    [toast],
  )

  const handleAnalyze = async (doc: Document) => {
    if (!doc.content) return

    updateDocument(doc.id, { status: "analyzing" })

    const taskId = `analyze-${doc.id}`
    addTask({
      id: taskId,
      title: `Analyzing: ${doc.name}`,
      status: "in-progress",
      type: "ai",
    })

    try {
      const response = await fetch("/api/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: doc.content,
          fileName: doc.name,
          coreMemory: aiSettings.useCorememory ? coreMemory : [],
          aiSettings: aiSettings,
        }),
      })

      if (!response.ok) throw new Error("Analysis failed")

      const data = await response.json()

      updateDocument(doc.id, {
        status: "ready",
        analysis: data.analysis,
      })
      updateTask(taskId, { status: "complete", title: `Analyzed: ${doc.name}` })

      setCurrentDocument({ ...doc, analysis: data.analysis, status: "ready" })
    } catch {
      updateDocument(doc.id, { status: "ready" })
      updateTask(taskId, { status: "error", title: `Analysis failed: ${doc.name}` })
    }
  }

  const handleViewDocument = (doc: Document) => {
    if (doc.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
      setPptxViewerDoc(doc)
    } else {
      setSelectedDoc(doc)
    }
  }

  const handleExport = async (doc: Document, format: string) => {
    try {
      const response = await fetch("/api/export-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: doc.content,
          format,
          fileName: doc.name.replace(/\.[^/.]+$/, ""),
        }),
      })

      if (!response.ok) throw new Error("Export failed")

      const data = await response.json()

      const blob = new Blob([Uint8Array.from(atob(data.file), (c) => c.charCodeAt(0))], { type: data.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = data.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export error:", error)
    }
  }

  const getFileConfig = (type: string, name?: string) => {
    if (name) {
      return getFileConfigFromFile({ type, name })
    }
    return (
      fileTypeConfig[type as keyof typeof fileTypeConfig] || {
        icon: File,
        color: "text-slate-500",
        bg: "bg-slate-100",
        label: "FILE",
      }
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onDrop(Array.from(files))
    }
    // Reset input so the same file can be selected again
    e.target.value = ""
  }

  const handleDropzoneClick = () => {
    fileInputRef.current?.click()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDropEvent = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const files = Array.from(e.dataTransfer.files)
    onDrop(files)
  }

  return (
    <motion.div
      className="w-full max-w-3xl mx-auto max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 sticky top-0 bg-gradient-to-b from-slate-50/95 via-slate-50/90 to-transparent backdrop-blur-sm pb-4 z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Upload Documents</h2>
          <p className="text-sm text-slate-500">PDF, DOCX, XLSX, PPTX, CSV, TXT (max 10MB)</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.xlsx,.pptx,.csv,.txt"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div
        onClick={handleDropzoneClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDropEvent}
        className={cn(
          "relative border-2 border-dashed rounded-3xl p-12",
          "transition-all duration-300 cursor-pointer",
          "bg-white/60 backdrop-blur-sm",
          "hover:border-blue-400 hover:bg-blue-50/50",
          isDragging && "border-blue-500 bg-blue-50 scale-[1.02]",
        )}
      >
        <div className="flex flex-col items-center text-center">
          <motion.div
            className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center mb-6",
              "bg-gradient-to-br from-blue-500 to-violet-500",
              isDragging && "scale-110",
            )}
            animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
          >
            <Upload className="w-10 h-10 text-white" />
          </motion.div>

          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {isDragging ? "Drop files here" : "Drag & drop files here"}
          </h3>
          <p className="text-sm text-slate-500 mb-4">or click to browse from your computer</p>

          <div className="flex flex-wrap justify-center gap-2">
            {["PDF", "DOCX", "XLSX", "PPTX", "CSV", "TXT"].map((ext) => (
              <span key={ext} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
                {ext}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Uploaded Files */}
      <AnimatePresence>
        {documents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-6 space-y-3"
          >
            <div className="flex items-center justify-between sticky top-16 bg-slate-50/90 backdrop-blur-sm py-2 z-10">
              <h4 className="text-sm font-medium text-slate-700">Documents ({documents.length})</h4>
              {documents.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-500"
                  onClick={() => useHRStore.getState().clearDocuments()}
                >
                  Clear All
                </Button>
              )}
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin pr-2">
              {documents.map((doc) => {
                const config = getFileConfig(doc.type, doc.name)
                const Icon = config.icon
                const progress = uploadProgress[doc.id] || 0
                const isPPTX = doc.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation"

                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      "flex items-center gap-4 p-4",
                      "bg-white/80 backdrop-blur-sm rounded-2xl",
                      "border border-slate-200/50 shadow-sm",
                      selectedDoc?.id === doc.id && "ring-2 ring-blue-500",
                    )}
                    onClick={() => handleViewDocument(doc)}
                  >
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
                      <Icon className={cn("w-6 h-6", config.color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {doc.status === "uploading" && (
                          <>
                            <Progress value={progress} className="h-1 flex-1 max-w-[150px]" />
                            <span className="text-xs text-slate-500">Uploading...</span>
                          </>
                        )}
                        {doc.status === "parsing" && (
                          <>
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                            <span className="text-xs text-blue-600">Parsing document...</span>
                          </>
                        )}
                        {doc.status === "analyzing" && (
                          <>
                            <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
                            <span className="text-xs text-violet-600">AI analyzing...</span>
                          </>
                        )}
                        {doc.status === "ready" && (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-green-600">Ready</span>
                            {doc.wordCount && (
                              <span className="text-xs text-slate-400">{doc.wordCount.toLocaleString()} words</span>
                            )}
                            {isPPTX && doc.metadata?.slideCount && (
                              <span className="text-xs text-orange-500">{doc.metadata.slideCount} slides</span>
                            )}
                          </>
                        )}
                        {doc.status === "error" && (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs text-red-500 truncate">{doc.error || "Error"}</span>
                          </>
                        )}
                      </div>
                      {doc.metadata?.size && (
                        <span className="text-xs text-slate-400">{formatFileSize(doc.metadata.size)}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {doc.status === "ready" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl h-9 w-9"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAnalyze(doc)
                            }}
                            title="Analyze with AI"
                          >
                            <Sparkles className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl h-9 w-9"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewDocument(doc)
                            }}
                            title={isPPTX ? "Open Presentation Viewer" : "Preview"}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl h-9 w-9"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExport(doc, "txt")
                            }}
                            title="Download as TXT"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeDocument(doc.id)
                        }}
                        className="rounded-xl h-9 w-9 text-slate-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pptxViewerDoc && pptxViewerDoc.status === "ready" && (
          <PPTXViewer
            document={pptxViewerDoc}
            onClose={() => setPptxViewerDoc(null)}
            onUpdate={(updatedDoc) => {
              updateDocument(updatedDoc.id, updatedDoc)
              setPptxViewerDoc(updatedDoc)
            }}
          />
        )}
      </AnimatePresence>

      {/* Document Preview Modal (for non-PPTX files) */}
      <AnimatePresence>
        {selectedDoc && selectedDoc.status === "ready" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{selectedDoc.name}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedDoc.wordCount?.toLocaleString()} words
                    {selectedDoc.metadata?.pageCount && ` • ${selectedDoc.metadata.pageCount} pages`}
                    {selectedDoc.metadata?.sheetCount && ` • ${selectedDoc.metadata.sheetCount} sheets`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExport(selectedDoc, "txt")}
                    className="rounded-xl"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDoc(null)} className="rounded-xl">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {selectedDoc.analysis && (
                  <div className="mb-6 p-4 bg-violet-50 rounded-xl border border-violet-200">
                    <h4 className="font-medium text-violet-900 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI Analysis
                    </h4>
                    <p className="text-sm text-violet-800 whitespace-pre-wrap">{selectedDoc.analysis}</p>
                  </div>
                )}
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono bg-slate-50 p-4 rounded-xl">
                  {selectedDoc.content || "No content available"}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
