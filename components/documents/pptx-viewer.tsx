"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Presentation,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Edit3,
  FileText,
  Download,
  X,
  Loader2,
  Plus,
  Wand2,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Document } from "@/lib/store"

interface PPTXViewerProps {
  document: Document
  onClose: () => void
  onUpdate: (doc: Document) => void
}

interface SlideData {
  number: number
  title: string
  hasNotes: boolean
  contentLength: number
}

type AnalysisType = "summary" | "hr_review" | "extract_data"
type ModificationType = "rewrite_slide" | "add_slide" | "improve_all" | "generate_notes"

export function PPTXViewer({ document, onClose, onUpdate }: PPTXViewerProps) {
  const [currentSlide, setCurrentSlide] = useState(1)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isModifying, setIsModifying] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [modifiedContent, setModifiedContent] = useState<string | null>(null)
  const [instruction, setInstruction] = useState("")
  const [activeTab, setActiveTab] = useState<"view" | "analyze" | "edit">("view")

  const slides: SlideData[] = document.metadata?.slides || []
  const totalSlides = slides.length || document.metadata?.slideCount || 1

  const handleAnalyze = async (type: AnalysisType) => {
    setIsAnalyzing(true)
    setAnalysis(null)

    try {
      const response = await fetch("/api/analyze-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: document.content,
          structuredData: document.structuredData,
          fileName: document.name,
          analysisType: type,
        }),
      })

      if (!response.ok) throw new Error("Analysis failed")

      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (error) {
      console.error("Analysis error:", error)
      setAnalysis("Failed to analyze presentation. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleModify = async (type: ModificationType) => {
    if (!instruction.trim()) return

    setIsModifying(true)
    setModifiedContent(null)

    try {
      const response = await fetch("/api/modify-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: document.content,
          structuredData: document.structuredData,
          instruction,
          modificationType: type,
        }),
      })

      if (!response.ok) throw new Error("Modification failed")

      const data = await response.json()
      setModifiedContent(data.modifiedContent)
    } catch (error) {
      console.error("Modification error:", error)
      setModifiedContent("Failed to modify presentation. Please try again.")
    } finally {
      setIsModifying(false)
    }
  }

  const getCurrentSlideContent = () => {
    if (!document.content) return null

    const slideRegex = new RegExp(`--- Slide ${currentSlide} ---([\\s\\S]*?)(?=--- Slide \\d|$)`)
    const match = document.content.match(slideRegex)
    return match ? match[1].trim() : null
  }

  const slideContent = getCurrentSlideContent()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-orange-50 to-amber-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Presentation className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{document.name}</h3>
              <p className="text-xs text-slate-500">
                {totalSlides} slides
                {document.metadata?.author && ` • By ${document.metadata.author}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex bg-slate-100 rounded-lg p-1">
              {[
                { id: "view", label: "View", icon: FileText },
                { id: "analyze", label: "Analyze", icon: Sparkles },
                { id: "edit", label: "Edit", icon: Edit3 },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as typeof activeTab)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors",
                    activeTab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === "view" && (
              <>
                {/* Slide Viewer */}
                <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
                  <div className="bg-slate-900 rounded-xl p-8 min-h-[300px] text-white">
                    <div className="text-xs text-slate-400 mb-4">
                      Slide {currentSlide} of {totalSlides}
                    </div>
                    {slideContent ? (
                      <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {slideContent.split("\n").map((line, i) => {
                          if (line.startsWith("Title:")) {
                            return (
                              <h2 key={i} className="text-2xl font-bold text-white mb-2">
                                {line.replace("Title:", "").trim()}
                              </h2>
                            )
                          }
                          if (line.startsWith("Subtitle:")) {
                            return (
                              <p key={i} className="text-lg text-slate-300 mb-4">
                                {line.replace("Subtitle:", "").trim()}
                              </p>
                            )
                          }
                          if (line.startsWith("  •")) {
                            return (
                              <p key={i} className="ml-4 mb-1 text-slate-200">
                                {line}
                              </p>
                            )
                          }
                          if (line.startsWith("Notes:")) {
                            return (
                              <div key={i} className="mt-6 pt-4 border-t border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">Speaker Notes</p>
                                <p className="text-sm text-slate-300">{line.replace("Notes:", "").trim()}</p>
                              </div>
                            )
                          }
                          return (
                            <p key={i} className="text-slate-200 mb-1">
                              {line}
                            </p>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-slate-400">No content available for this slide</p>
                    )}
                  </div>
                </div>

                {/* Slide Navigation */}
                <div className="p-4 border-t bg-slate-50 flex items-center justify-between shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentSlide(Math.max(1, currentSlide - 1))}
                    disabled={currentSlide === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(totalSlides, 10) }).map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentSlide(i + 1)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                          currentSlide === i + 1
                            ? "bg-orange-500 text-white"
                            : "bg-white border hover:bg-slate-50 text-slate-600",
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                    {totalSlides > 10 && <span className="text-slate-400 text-sm">...</span>}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentSlide(Math.min(totalSlides, currentSlide + 1))}
                    disabled={currentSlide === totalSlides}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </>
            )}

            {activeTab === "analyze" && (
              <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
                <div className="mb-6">
                  <h4 className="font-medium text-slate-900 mb-3">Choose Analysis Type</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { type: "summary", label: "Full Summary", icon: FileText, desc: "Complete overview" },
                      { type: "hr_review", label: "HR Review", icon: Sparkles, desc: "Compliance check" },
                      { type: "extract_data", label: "Extract Data", icon: Download, desc: "Pull key info" },
                    ].map(({ type, label, icon: Icon, desc }) => (
                      <button
                        key={type}
                        onClick={() => handleAnalyze(type as AnalysisType)}
                        disabled={isAnalyzing}
                        className={cn(
                          "p-4 rounded-xl border-2 text-left transition-all",
                          "hover:border-orange-300 hover:bg-orange-50",
                          isAnalyzing ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                        )}
                      >
                        <Icon className="w-5 h-5 text-orange-500 mb-2" />
                        <p className="font-medium text-slate-900">{label}</p>
                        <p className="text-xs text-slate-500">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {isAnalyzing && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                    <span className="ml-3 text-slate-600">Analyzing presentation...</span>
                  </div>
                )}

                {analysis && !isAnalyzing && (
                  <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
                    <h4 className="font-medium text-orange-900 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI Analysis Results
                    </h4>
                    <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">{analysis}</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "edit" && (
              <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
                <div className="mb-6">
                  <h4 className="font-medium text-slate-900 mb-3">Modification Instructions</h4>
                  <Textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Describe what changes you want to make to the presentation..."
                    className="min-h-[100px] resize-none"
                  />
                </div>

                <div className="mb-6">
                  <h4 className="font-medium text-slate-900 mb-3">Choose Action</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { type: "rewrite_slide", label: "Rewrite Slide", icon: Edit3, desc: "Modify specific slide" },
                      { type: "add_slide", label: "Add New Slide", icon: Plus, desc: "Create additional content" },
                      { type: "improve_all", label: "Improve All", icon: Wand2, desc: "Enhance entire deck" },
                      {
                        type: "generate_notes",
                        label: "Generate Notes",
                        icon: MessageSquare,
                        desc: "Add speaker notes",
                      },
                    ].map(({ type, label, icon: Icon, desc }) => (
                      <button
                        key={type}
                        onClick={() => handleModify(type as ModificationType)}
                        disabled={isModifying || !instruction.trim()}
                        className={cn(
                          "p-4 rounded-xl border-2 text-left transition-all",
                          "hover:border-blue-300 hover:bg-blue-50",
                          isModifying || !instruction.trim() ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                        )}
                      >
                        <Icon className="w-5 h-5 text-blue-500 mb-2" />
                        <p className="font-medium text-slate-900">{label}</p>
                        <p className="text-xs text-slate-500">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {isModifying && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <span className="ml-3 text-slate-600">Modifying presentation...</span>
                  </div>
                )}

                {modifiedContent && !isModifying && (
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                    <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                      <Edit3 className="w-4 h-4" />
                      Modified Content
                    </h4>
                    <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap bg-white rounded-lg p-4 border">
                      {modifiedContent}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(modifiedContent)
                        }}
                      >
                        Copy to Clipboard
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Slide Thumbnails Sidebar */}
          {activeTab === "view" && (
            <div className="w-48 border-l bg-slate-50 p-3 overflow-y-auto scrollbar-thin shrink-0">
              <p className="text-xs font-medium text-slate-500 mb-3">Slides</p>
              <div className="space-y-2">
                {slides.map((slide, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(slide.number || i + 1)}
                    className={cn(
                      "w-full p-2 rounded-lg text-left transition-all",
                      "border-2",
                      currentSlide === (slide.number || i + 1)
                        ? "border-orange-500 bg-orange-50"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <div className="text-xs font-medium text-slate-500 mb-1">Slide {slide.number || i + 1}</div>
                    <div className="text-sm font-medium text-slate-900 truncate">{slide.title || "Untitled Slide"}</div>
                    {slide.hasNotes && (
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        Has notes
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
