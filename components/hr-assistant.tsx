"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { AnimatePresence } from "framer-motion"
import { OrbCore } from "@/components/orb/orb-core"
import { FloatingNav } from "@/components/orb/floating-nav"
import { ChatInterface } from "@/components/chat/chat-interface"
import { DocumentUpload } from "@/components/documents/document-upload"
import { TaskSidebar } from "@/components/tasks/task-sidebar"
import { Header } from "@/components/layout/header"
import { SettingsPanel } from "@/components/settings/settings-panel"
import { useHRStore } from "@/lib/store"

export function HRAssistant() {
  const [activeView, setActiveView] = useState<"orb" | "chat" | "upload" | "tasks">("orb")
  const [isOrbExpanded, setIsOrbExpanded] = useState(false)
  const { isDraggingFile, setIsDraggingFile, isSettingsOpen, setIsSettingsOpen } = useHRStore()

  const handleOrbClick = useCallback(() => {
    setIsOrbExpanded(!isOrbExpanded)
  }, [isOrbExpanded])

  const handleNavAction = useCallback((action: string) => {
    if (action === "chat") setActiveView("chat")
    else if (action === "upload") setActiveView("upload")
    else if (action === "tasks") setActiveView("tasks")
    setIsOrbExpanded(false)
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingFile(true)
    },
    [setIsDraggingFile],
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingFile(false)
    },
    [setIsDraggingFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingFile(false)
      setActiveView("upload")
    },
    [setIsDraggingFile],
  )

  return (
    <div
      className="min-h-screen overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/20"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-200/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="sticky top-0 z-50">
        <Header />
      </div>

      <main className="relative flex flex-col items-center justify-start min-h-[calc(100vh-80px)] px-4 pt-24 pb-24">
        <AnimatePresence mode="wait">
          {activeView === "orb" && (
            <div className="relative flex flex-col items-center mt-12">
              <FloatingNav isExpanded={isOrbExpanded} onAction={handleNavAction} />
              <OrbCore onClick={handleOrbClick} isExpanded={isOrbExpanded} isDragging={isDraggingFile} />
              <ChatInterface minimal />
            </div>
          )}

          {activeView === "chat" && <ChatInterface onBack={() => setActiveView("orb")} />}

          {activeView === "upload" && <DocumentUpload onBack={() => setActiveView("orb")} />}
        </AnimatePresence>

        <TaskSidebar isOpen={activeView === "tasks"} onClose={() => setActiveView("orb")} />
      </main>

      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <div className="h-8" aria-hidden="true" />
    </div>
  )
}
