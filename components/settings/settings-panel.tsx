"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Brain,
  Upload,
  Trash2,
  FileText,
  FileSpreadsheet,
  File,
  Loader2,
  Check,
  Settings,
  Sparkles,
  Database,
  Building2,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useHRStore, type CoreMemoryItem } from "@/lib/store"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { aiSettings, updateAISettings, resetAISettings, coreMemory, addToCoreMemory, removeFromCoreMemory } =
    useHRStore()
  const { toast } = useToast()

  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState("")
  const [manualMemoryText, setManualMemoryText] = useState("")
  const [manualMemoryName, setManualMemoryName] = useState("")
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false)
  const [lastSavedSettings, setLastSavedSettings] = useState(aiSettings)

  useEffect(() => {
    const hasChanges = JSON.stringify(aiSettings) !== JSON.stringify(lastSavedSettings)
    if (hasChanges && !showSaveConfirmation) {
      setShowSaveConfirmation(true)
      // Auto-hide after 2 seconds
      const timer = setTimeout(() => {
        setShowSaveConfirmation(false)
        setLastSavedSettings(aiSettings)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [aiSettings, lastSavedSettings, showSaveConfirmation])

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "handbook":
        return <FileText className="w-4 h-4" />
      case "employees":
        return <FileSpreadsheet className="w-4 h-4" />
      case "policy":
        return <File className="w-4 h-4" />
      default:
        return <Database className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "handbook":
        return "bg-blue-100 text-blue-700"
      case "employees":
        return "bg-green-100 text-green-700"
      case "policy":
        return "bg-violet-100 text-violet-700"
      case "procedures":
        return "bg-amber-100 text-amber-700"
      default:
        return "bg-slate-100 text-slate-700"
    }
  }

  const processFileForMemory = useCallback(
    async (file: File) => {
      setIsProcessing(true)
      setProcessingStatus(`Reading ${file.name}...`)

      try {
        const formData = new FormData()
        formData.append("file", file)

        setProcessingStatus("Parsing document...")
        const parseResponse = await fetch("/api/parse-document", {
          method: "POST",
          body: formData,
        })

        if (!parseResponse.ok) {
          throw new Error("Failed to parse document")
        }

        const parseData = await parseResponse.json()

        setProcessingStatus("Processing into AI memory...")
        const memoryResponse = await fetch("/api/process-memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: parseData.content,
            fileName: file.name,
            fileType: file.type,
          }),
        })

        if (!memoryResponse.ok) {
          throw new Error("Failed to process into memory")
        }

        const memoryData = await memoryResponse.json()

        const memoryItem: CoreMemoryItem = {
          id: crypto.randomUUID(),
          name: file.name,
          type:
            file.type.includes("spreadsheet") || file.name.endsWith(".xlsx") || file.name.endsWith(".csv")
              ? "spreadsheet"
              : "document",
          summary: memoryData.summary,
          content: parseData.content.slice(0, 50000),
          keywords: memoryData.keywords || [],
          addedAt: Date.now(),
          fileType: file.type,
          category: memoryData.category || "other",
        }

        addToCoreMemory(memoryItem)
        setProcessingStatus("Added to AI memory!")

        toast({
          title: "Memory added",
          description: `"${file.name}" has been added to AI memory.`,
        })

        setTimeout(() => {
          setProcessingStatus("")
          setIsProcessing(false)
        }, 1500)
      } catch (error) {
        console.error("Memory processing error:", error)
        setProcessingStatus("Failed to process file")
        toast({
          title: "Processing failed",
          description: "Failed to add file to memory. Please try again.",
          variant: "destructive",
        })
        setTimeout(() => {
          setProcessingStatus("")
          setIsProcessing(false)
        }, 2000)
      }
    },
    [addToCoreMemory, toast],
  )

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        processFileForMemory(files[0])
      }
      e.target.value = ""
    },
    [processFileForMemory],
  )

  const handleAddManualMemory = useCallback(async () => {
    if (!manualMemoryText.trim() || !manualMemoryName.trim()) return

    setIsProcessing(true)
    setProcessingStatus("Processing text...")

    try {
      const memoryResponse = await fetch("/api/process-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: manualMemoryText,
          fileName: manualMemoryName,
          fileType: "text/plain",
        }),
      })

      if (!memoryResponse.ok) {
        throw new Error("Failed to process memory")
      }

      const memoryData = await memoryResponse.json()

      const memoryItem: CoreMemoryItem = {
        id: crypto.randomUUID(),
        name: manualMemoryName,
        type: "text",
        summary: memoryData.summary,
        content: manualMemoryText,
        keywords: memoryData.keywords || [],
        addedAt: Date.now(),
        category: memoryData.category || "other",
      }

      addToCoreMemory(memoryItem)
      setManualMemoryText("")
      setManualMemoryName("")
      setProcessingStatus("Added to AI memory!")

      toast({
        title: "Memory added",
        description: `"${manualMemoryName}" has been added to AI memory.`,
      })

      setTimeout(() => {
        setProcessingStatus("")
        setIsProcessing(false)
      }, 1500)
    } catch (error) {
      console.error("Manual memory error:", error)
      setProcessingStatus("Failed to add memory")
      toast({
        title: "Processing failed",
        description: "Failed to add memory. Please try again.",
        variant: "destructive",
      })
      setTimeout(() => {
        setProcessingStatus("")
        setIsProcessing(false)
      }, 2000)
    }
  }, [manualMemoryText, manualMemoryName, addToCoreMemory, toast])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleResetSettings = () => {
    resetAISettings()
    setLastSavedSettings(useHRStore.getState().aiSettings)
    toast({
      title: "Settings reset",
      description: "AI settings have been reset to defaults.",
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl",
              "bg-white shadow-2xl",
              "flex flex-col h-screen",
            )}
          >
            {/* Header - fixed height */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Settings</h2>
                  <p className="text-xs text-slate-500">Configure AI behavior & memory</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {showSaveConfirmation && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"
                    >
                      <Check className="w-3 h-3" />
                      Saved
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <Tabs defaultValue="memory" className="flex-1 flex flex-col min-h-0">
              <TabsList className="flex-shrink-0 mx-6 mt-4 grid grid-cols-2">
                <TabsTrigger value="memory" className="gap-2">
                  <Brain className="w-4 h-4" />
                  Core Memory
                </TabsTrigger>
                <TabsTrigger value="ai" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Settings
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0 overflow-y-scroll scrollbar-thin mt-4">
                {/* Core Memory Tab */}
                <TabsContent value="memory" className="mt-0 px-6 pb-8">
                  <div className="space-y-8">
                    {/* Upload Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-violet-600" />
                        <h3 className="font-medium text-slate-900">Upload to Memory</h3>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Upload company documents like handbooks, employee lists, or policies. The AI will remember this
                        context for all future conversations.
                      </p>

                      <div className="relative">
                        <input
                          type="file"
                          onChange={handleFileUpload}
                          accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.pptx"
                          className="hidden"
                          id="memory-upload"
                          disabled={isProcessing}
                        />
                        <label
                          htmlFor="memory-upload"
                          className={cn(
                            "flex flex-col items-center justify-center gap-3 p-8",
                            "border-2 border-dashed rounded-xl cursor-pointer",
                            "transition-colors duration-200",
                            isProcessing
                              ? "border-violet-300 bg-violet-50"
                              : "border-slate-200 hover:border-violet-400 hover:bg-violet-50/50",
                          )}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                              <span className="text-sm text-violet-600 font-medium">{processingStatus}</span>
                            </>
                          ) : processingStatus === "Added to AI memory!" ? (
                            <>
                              <Check className="w-10 h-10 text-green-500" />
                              <span className="text-sm text-green-600 font-medium">{processingStatus}</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-10 h-10 text-slate-400" />
                              <span className="text-sm text-slate-600 font-medium">Drop files or click to upload</span>
                              <span className="text-xs text-slate-400">PDF, DOCX, XLSX, CSV, TXT, PPTX</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Manual Text Input */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <h3 className="font-medium text-slate-900">Add Manual Information</h3>
                      </div>
                      <div className="space-y-3">
                        <Input
                          placeholder="Name (e.g., Company Vacation Policy)"
                          value={manualMemoryName}
                          onChange={(e) => setManualMemoryName(e.target.value)}
                          className="h-11"
                        />
                        <Textarea
                          placeholder="Enter information you want the AI to remember..."
                          value={manualMemoryText}
                          onChange={(e) => setManualMemoryText(e.target.value)}
                          className="min-h-28 resize-none"
                        />
                        <Button
                          onClick={handleAddManualMemory}
                          disabled={!manualMemoryText.trim() || !manualMemoryName.trim() || isProcessing}
                          className="w-full gap-2 h-11"
                        >
                          <Brain className="w-4 h-4" />
                          Add to Memory
                        </Button>
                      </div>
                    </div>

                    {/* Memory Items */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-slate-900">Stored Memories ({coreMemory.length})</h3>
                        {coreMemory.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("Clear all memories? This cannot be undone.")) {
                                useHRStore.getState().clearCoreMemory()
                                toast({
                                  title: "Memories cleared",
                                  description: "All stored memories have been removed.",
                                })
                              }
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Clear All
                          </Button>
                        )}
                      </div>

                      {coreMemory.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl">
                          <Brain className="w-14 h-14 mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium">No memories stored yet</p>
                          <p className="text-xs mt-1">Upload documents or add text to get started</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {coreMemory.map((item) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                "p-5 rounded-xl border border-slate-200",
                                "bg-gradient-to-br from-slate-50 to-white",
                              )}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    {getCategoryIcon(item.category)}
                                    <span className="font-medium text-slate-900 truncate">{item.name}</span>
                                  </div>
                                  <p className="text-sm text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                                    {item.summary}
                                  </p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="secondary" className={getCategoryColor(item.category)}>
                                      {item.category || "other"}
                                    </Badge>
                                    <span className="text-xs text-slate-400">{formatDate(item.addedAt)}</span>
                                  </div>
                                  {item.keywords.length > 0 && (
                                    <div className="flex gap-1.5 mt-3 flex-wrap">
                                      {item.keywords.slice(0, 5).map((keyword, i) => (
                                        <span
                                          key={i}
                                          className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full"
                                        >
                                          {keyword}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    removeFromCoreMemory(item.id)
                                    toast({
                                      title: "Memory removed",
                                      description: `"${item.name}" has been removed.`,
                                    })
                                  }}
                                  className="shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Spacer for extra scroll room */}
                    <div className="h-8" />
                  </div>
                </TabsContent>

                {/* AI Settings Tab */}
                <TabsContent value="ai" className="mt-0 px-6 pb-8">
                  <div className="space-y-8">
                    {/* Company Info */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <h3 className="font-medium text-slate-900">Company Information</h3>
                      </div>
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="company-name" className="text-sm">
                            Company Name
                          </Label>
                          <Input
                            id="company-name"
                            placeholder="Enter your company name"
                            value={aiSettings.companyName}
                            onChange={(e) => updateAISettings({ companyName: e.target.value })}
                            className="mt-2 h-11"
                          />
                        </div>
                        <div>
                          <Label htmlFor="industry" className="text-sm">
                            Industry
                          </Label>
                          <Input
                            id="industry"
                            placeholder="e.g., Technology, Healthcare, Finance"
                            value={aiSettings.industry}
                            onChange={(e) => updateAISettings({ industry: e.target.value })}
                            className="mt-2 h-11"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Response Settings */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-violet-600" />
                        <h3 className="font-medium text-slate-900">Response Settings</h3>
                      </div>
                      <div className="grid gap-5">
                        <div>
                          <Label className="text-sm">Model Preference</Label>
                          <Select
                            value={aiSettings.modelPreference}
                            onValueChange={(value: "balanced" | "fast" | "thorough") =>
                              updateAISettings({ modelPreference: value })
                            }
                          >
                            <SelectTrigger className="mt-2 h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fast">Fast - Quick responses</SelectItem>
                              <SelectItem value="balanced">Balanced - Best overall</SelectItem>
                              <SelectItem value="thorough">Thorough - Detailed analysis</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm">Response Length</Label>
                          <Select
                            value={aiSettings.responseLength}
                            onValueChange={(value: "concise" | "detailed" | "comprehensive") =>
                              updateAISettings({ responseLength: value })
                            }
                          >
                            <SelectTrigger className="mt-2 h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="concise">Concise - Brief and to the point</SelectItem>
                              <SelectItem value="detailed">Detailed - Balanced detail</SelectItem>
                              <SelectItem value="comprehensive">Comprehensive - Full explanations</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm">Communication Tone</Label>
                          <Select
                            value={aiSettings.tone}
                            onValueChange={(value: "professional" | "friendly" | "formal") =>
                              updateAISettings({ tone: value })
                            }
                          >
                            <SelectTrigger className="mt-2 h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="friendly">Friendly</SelectItem>
                              <SelectItem value="formal">Formal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Feature Toggles */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <h3 className="font-medium text-slate-900">Features</h3>
                      </div>
                      <div className="space-y-5">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div>
                            <Label className="text-sm font-medium">Use Core Memory</Label>
                            <p className="text-xs text-slate-500 mt-1">Include stored documents in AI context</p>
                          </div>
                          <Switch
                            checked={aiSettings.useCorememory}
                            onCheckedChange={(checked) => updateAISettings({ useCorememory: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div>
                            <Label className="text-sm font-medium">Auto-Summarize Documents</Label>
                            <p className="text-xs text-slate-500 mt-1">Automatically summarize uploaded files</p>
                          </div>
                          <Switch
                            checked={aiSettings.autoSummarize}
                            onCheckedChange={(checked) => updateAISettings({ autoSummarize: checked })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Reset */}
                    <div className="pt-4">
                      <Button variant="outline" onClick={handleResetSettings} className="w-full h-11 bg-transparent">
                        Reset to Defaults
                      </Button>
                    </div>

                    {/* Spacer for extra scroll room */}
                    <div className="h-8" />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
