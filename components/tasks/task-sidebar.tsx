"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle2, Clock, AlertCircle, FileText, Bot, ClipboardList, Workflow } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useHRStore } from "@/lib/store"
import { WorkflowBuilder } from "./workflow-builder"

interface TaskSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const taskTypeIcons = {
  document: FileText,
  ai: Bot,
  workflow: ClipboardList,
}

const statusConfig = {
  pending: { icon: Clock, color: "text-orange-500", bg: "bg-orange-100" },
  "in-progress": { icon: Clock, color: "text-blue-500", bg: "bg-blue-100" },
  complete: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-100" },
  error: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-100" },
}

export function TaskSidebar({ isOpen, onClose }: TaskSidebarProps) {
  const { tasks, removeTask } = useHRStore()
  const [activeTab, setActiveTab] = useState("tasks")

  const clearCompleted = () => {
    tasks.filter((t) => t.status === "complete").forEach((t) => removeTask(t.id))
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
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed right-0 top-0 bottom-0 w-full max-w-lg z-50",
              "bg-white/95 backdrop-blur-xl",
              "border-l border-slate-200/50",
              "shadow-2xl",
              "flex flex-col h-screen",
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200/50 flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Task Automation</h2>
                <p className="text-sm text-slate-500">Manage your HR workflows</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Tabs - added proper flex layout for scrolling */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
              <TabsList className="grid w-full grid-cols-2 p-2 mx-6 mt-4 bg-slate-100 rounded-xl max-w-[calc(100%-48px)] flex-shrink-0">
                <TabsTrigger value="tasks" className="rounded-lg">
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="workflows" className="rounded-lg">
                  Workflows
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="flex-1 min-h-0 mt-0 px-6 overflow-hidden">
                <div className="h-full overflow-y-auto py-4 space-y-3 scrollbar-thin pb-24">
                  {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <ClipboardList className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="font-medium text-slate-900 mb-2">No tasks yet</h3>
                      <p className="text-sm text-slate-500 max-w-xs">
                        Upload documents or start a chat to create automated tasks.
                      </p>
                    </div>
                  ) : (
                    tasks.map((task) => {
                      const TypeIcon = taskTypeIcons[task.type as keyof typeof taskTypeIcons] || FileText
                      const status = statusConfig[task.status as keyof typeof statusConfig]
                      const StatusIcon = status.icon

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "p-4 rounded-2xl",
                            "bg-slate-50/80 border border-slate-200/50",
                            "hover:bg-slate-100/80 transition-colors",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", status.bg)}>
                              <TypeIcon className={cn("w-5 h-5", status.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate">{task.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <StatusIcon className={cn("w-3 h-3", status.color)} />
                                <span className={cn("text-xs capitalize", status.color)}>
                                  {task.status.replace("-", " ")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="workflows" className="flex-1 min-h-0 mt-0 px-6 overflow-hidden">
                <div className="h-full overflow-y-auto py-4 scrollbar-thin pb-24">
                  <WorkflowBuilder />
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer Actions */}
            <div className="flex-shrink-0 p-6 border-t border-slate-200/50 bg-white/80 backdrop-blur-sm">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="rounded-xl h-11 bg-transparent"
                  onClick={clearCompleted}
                  disabled={!tasks.some((t) => t.status === "complete")}
                >
                  Clear Completed
                </Button>
                <Button
                  className="rounded-xl h-11 bg-gradient-to-r from-blue-500 to-violet-500"
                  onClick={() => setActiveTab("workflows")}
                >
                  <Workflow className="w-4 h-4 mr-2" />
                  New Workflow
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
