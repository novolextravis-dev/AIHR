"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Play,
  Pause,
  CheckCircle2,
  FileText,
  Users,
  Mail,
  ArrowRight,
  X,
  Save,
  Trash2,
  FolderOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useHRStore, type WorkflowStep, type Workflow } from "@/lib/store"
import { useToast } from "@/components/ui/use-toast"

const stepTypes = [
  { value: "document", label: "Document Review", icon: FileText },
  { value: "email", label: "Send Email", icon: Mail },
  { value: "task", label: "Create Task", icon: CheckCircle2 },
  { value: "approval", label: "Request Approval", icon: Users },
]

const presetWorkflows = [
  {
    name: "New Employee Onboarding",
    steps: [
      { type: "document", title: "Prepare offer letter" },
      { type: "email", title: "Send welcome email" },
      { type: "task", title: "Set up workstation" },
      { type: "document", title: "Complete I-9 form" },
      { type: "task", title: "Schedule orientation" },
    ],
  },
  {
    name: "Performance Review Cycle",
    steps: [
      { type: "email", title: "Send review notification" },
      { type: "document", title: "Self-assessment" },
      { type: "document", title: "Manager assessment" },
      { type: "approval", title: "HR review" },
      { type: "task", title: "Schedule feedback meeting" },
    ],
  },
  {
    name: "Employee Offboarding",
    steps: [
      { type: "document", title: "Resignation acceptance" },
      { type: "task", title: "Schedule exit interview" },
      { type: "document", title: "Complete exit checklist" },
      { type: "task", title: "Collect company property" },
      { type: "email", title: "Send farewell email" },
    ],
  },
]

export function WorkflowBuilder() {
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [workflowName, setWorkflowName] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [showSavedWorkflows, setShowSavedWorkflows] = useState(false)

  const { addTask, workflows, addWorkflow, updateWorkflow, removeWorkflow, currentWorkflow, setCurrentWorkflow } =
    useHRStore()
  const { toast } = useToast()

  useEffect(() => {
    if (currentWorkflow) {
      setSteps(currentWorkflow.steps)
      setWorkflowName(currentWorkflow.name)
    }
  }, [currentWorkflow])

  const addStep = (type: string, title: string) => {
    const newStep: WorkflowStep = {
      id: Date.now().toString(),
      type: type as WorkflowStep["type"],
      title,
      status: "pending",
    }
    setSteps([...steps, newStep])
  }

  const removeStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id))
  }

  const loadPreset = (preset: (typeof presetWorkflows)[0]) => {
    const workflowSteps: WorkflowStep[] = preset.steps.map((step, index) => ({
      id: `${Date.now()}-${index}`,
      type: step.type as WorkflowStep["type"],
      title: step.title,
      status: "pending",
    }))
    setSteps(workflowSteps)
    setWorkflowName(preset.name)
    setCurrentWorkflow(null)
  }

  const saveWorkflow = () => {
    if (!workflowName.trim() || steps.length === 0) {
      toast({
        title: "Cannot save workflow",
        description: "Please add a name and at least one step.",
        variant: "destructive",
      })
      return
    }

    if (currentWorkflow) {
      // Update existing workflow
      updateWorkflow(currentWorkflow.id, {
        name: workflowName,
        steps: steps.map((s) => ({ ...s, status: "pending" })),
      })
      toast({
        title: "Workflow updated",
        description: `"${workflowName}" has been saved.`,
      })
    } else {
      // Create new workflow
      const newWorkflow: Workflow = {
        id: `workflow-${Date.now()}`,
        name: workflowName,
        steps: steps.map((s) => ({ ...s, status: "pending" })),
        createdAt: Date.now(),
      }
      addWorkflow(newWorkflow)
      setCurrentWorkflow(newWorkflow)
      toast({
        title: "Workflow saved",
        description: `"${workflowName}" has been created.`,
      })
    }
  }

  const loadWorkflow = (workflow: Workflow) => {
    setCurrentWorkflow(workflow)
    setSteps(workflow.steps.map((s) => ({ ...s, status: "pending" })))
    setWorkflowName(workflow.name)
    setShowSavedWorkflows(false)
  }

  const deleteWorkflow = (id: string) => {
    removeWorkflow(id)
    if (currentWorkflow?.id === id) {
      setCurrentWorkflow(null)
      setSteps([])
      setWorkflowName("")
    }
    toast({
      title: "Workflow deleted",
      description: "The workflow has been removed.",
    })
  }

  const clearWorkflow = () => {
    setCurrentWorkflow(null)
    setSteps([])
    setWorkflowName("")
  }

  const runWorkflow = async () => {
    setIsRunning(true)

    if (currentWorkflow) {
      updateWorkflow(currentWorkflow.id, { lastRun: Date.now() })
    }

    for (let i = 0; i < steps.length; i++) {
      setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "active" } : s)))

      await new Promise((resolve) => setTimeout(resolve, 1500))

      setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "complete" } : s)))

      addTask({
        id: steps[i].id,
        title: steps[i].title,
        status: "complete",
        type: "workflow",
      })
    }

    setIsRunning(false)
    toast({
      title: "Workflow complete",
      description: `"${workflowName || "Workflow"}" has finished running.`,
    })
  }

  const getStepIcon = (type: string) => {
    const stepType = stepTypes.find((t) => t.value === type)
    return stepType?.icon || FileText
  }

  return (
    <div className="space-y-6">
      {workflows.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-700">Saved Workflows ({workflows.length})</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSavedWorkflows(!showSavedWorkflows)}
              className="text-xs"
            >
              <FolderOpen className="w-3 h-3 mr-1" />
              {showSavedWorkflows ? "Hide" : "Show"}
            </Button>
          </div>

          <AnimatePresence>
            {showSavedWorkflows && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 mb-4"
              >
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border",
                      currentWorkflow?.id === workflow.id ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200",
                    )}
                  >
                    <button onClick={() => loadWorkflow(workflow)} className="flex-1 text-left">
                      <p className="font-medium text-slate-900 text-sm">{workflow.name}</p>
                      <p className="text-xs text-slate-500">
                        {workflow.steps.length} steps
                        {workflow.lastRun && ` • Last run ${new Date(workflow.lastRun).toLocaleDateString()}`}
                      </p>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteWorkflow(workflow.id)}
                      className="h-8 w-8 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Preset Workflows */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">Quick Start Templates</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {presetWorkflows.map((preset) => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset)}
              className={cn(
                "p-4 rounded-2xl text-left",
                "bg-slate-50 border border-slate-200/50",
                "hover:bg-blue-50 hover:border-blue-200",
                "transition-all duration-200",
              )}
            >
              <p className="font-medium text-slate-900 text-sm">{preset.name}</p>
              <p className="text-xs text-slate-500 mt-1">{preset.steps.length} steps</p>
            </button>
          ))}
        </div>
      </div>

      {/* Workflow Steps */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <h4 className="text-sm font-medium text-slate-700">Workflow Steps</h4>
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Workflow name..."
              className="max-w-[200px] h-8 text-sm rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2">
            {steps.length > 0 && (
              <>
                <Button onClick={clearWorkflow} variant="ghost" size="sm" className="rounded-xl text-slate-500">
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
                <Button onClick={saveWorkflow} variant="outline" size="sm" className="rounded-xl bg-transparent">
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button
                  onClick={runWorkflow}
                  disabled={isRunning}
                  size="sm"
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500"
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Run
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {steps.map((step, index) => {
              const Icon = getStepIcon(step.type)
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl",
                    "bg-white border border-slate-200/50",
                    step.status === "active" && "ring-2 ring-blue-500 border-blue-500",
                    step.status === "complete" && "bg-green-50 border-green-200",
                  )}
                >
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-xs font-medium">{index + 1}</span>
                    {index < steps.length - 1 && <ArrowRight className="w-3 h-3" />}
                  </div>

                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      step.status === "complete"
                        ? "bg-green-100"
                        : step.status === "active"
                          ? "bg-blue-100"
                          : "bg-slate-100",
                    )}
                  >
                    {step.status === "complete" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Icon className={cn("w-5 h-5", step.status === "active" ? "text-blue-600" : "text-slate-500")} />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-medium text-slate-900 text-sm">{step.title}</p>
                    <p className="text-xs text-slate-500 capitalize">{step.type}</p>
                  </div>

                  {!isRunning && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(step.id)}
                      className="rounded-xl h-8 w-8 text-slate-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Add Step */}
          <AddStepForm onAdd={addStep} />
        </div>
      </div>
    </div>
  )
}

function AddStepForm({ onAdd }: { onAdd: (type: string, title: string) => void }) {
  const [type, setType] = useState("")
  const [title, setTitle] = useState("")

  const handleAdd = () => {
    if (type && title.trim()) {
      onAdd(type, title.trim())
      setTitle("")
      setType("")
    }
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300">
      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="w-40 rounded-xl border-0 bg-white">
          <SelectValue placeholder="Step type" />
        </SelectTrigger>
        <SelectContent>
          {stepTypes.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Step description"
        className="flex-1 rounded-xl border-0 bg-white"
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
      />

      <Button
        onClick={handleAdd}
        disabled={!type || !title.trim()}
        size="icon"
        className="rounded-xl bg-blue-500 hover:bg-blue-600"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  )
}
