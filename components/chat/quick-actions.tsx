"use client"

import { motion } from "framer-motion"
import { FileText, ClipboardList, Users, FileCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickActionsProps {
  onAction: (prompt: string) => void
}

const actions = [
  {
    icon: FileText,
    label: "Summarize Document",
    prompt: "Please summarize the uploaded document, highlighting key points and action items.",
  },
  {
    icon: ClipboardList,
    label: "Generate Policy",
    prompt: "Help me draft an HR policy. What type of policy would you like to create?",
  },
  {
    icon: Users,
    label: "Onboarding Checklist",
    prompt: "Create a comprehensive onboarding checklist for a new employee.",
  },
  {
    icon: FileCheck,
    label: "Review Document",
    prompt: "Please review the uploaded document for compliance and suggest improvements.",
  },
]

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {actions.map((action, index) => {
        const Icon = action.icon
        return (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onAction(action.prompt)}
            className={cn(
              "flex items-center gap-2 px-4 py-2",
              "bg-white/80 backdrop-blur-sm",
              "border border-slate-200/50",
              "rounded-xl text-sm font-medium text-slate-700",
              "hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700",
              "transition-all duration-200",
              "shadow-sm",
            )}
          >
            <Icon className="w-4 h-4" />
            {action.label}
          </motion.button>
        )
      })}
    </div>
  )
}
