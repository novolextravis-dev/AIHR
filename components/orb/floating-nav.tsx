"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Upload, MessageCircle, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FloatingNavProps {
  isExpanded: boolean
  onAction: (action: string) => void
}

const navItems = [
  {
    id: "upload",
    label: "Upload Document",
    icon: Upload,
    position: { x: -180, y: -60 },
    description: "PDF, DOCX, XLSX, PPTX, CSV",
  },
  {
    id: "chat",
    label: "AI Chat",
    icon: MessageCircle,
    position: { x: -200, y: 80 },
    description: "Drag and drop a file here",
  },
  {
    id: "tasks",
    label: "Task Automation",
    icon: Settings2,
    position: { x: 180, y: 0 },
    description: "Manage HR workflows",
  },
]

export function FloatingNav({ isExpanded, onAction }: FloatingNavProps) {
  return (
    <AnimatePresence>
      {isExpanded &&
        navItems.map((item, index) => (
          <motion.div
            key={item.id}
            className="absolute z-20"
            initial={{
              opacity: 0,
              x: 0,
              y: 0,
              scale: 0.5,
            }}
            animate={{
              opacity: 1,
              x: item.position.x,
              y: item.position.y,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              x: 0,
              y: 0,
              scale: 0.5,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              delay: index * 0.05,
            }}
          >
            <NavButton item={item} onAction={onAction} />
          </motion.div>
        ))}
    </AnimatePresence>
  )
}

function NavButton({
  item,
  onAction,
}: {
  item: (typeof navItems)[0]
  onAction: (action: string) => void
}) {
  const Icon = item.icon

  return (
    <motion.button
      onClick={() => onAction(item.id)}
      className={cn(
        "group relative flex items-center gap-3",
        "bg-white/90 backdrop-blur-sm",
        "px-4 py-3 rounded-2xl",
        "shadow-lg shadow-black/5",
        "border border-slate-200/50",
        "hover:bg-white hover:shadow-xl",
        "transition-all duration-200",
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Connection Line */}
      <svg
        className="absolute -z-10 stroke-slate-300"
        style={{
          width: Math.abs(item.position.x) + 40,
          height: Math.abs(item.position.y) + 40,
          left: item.position.x > 0 ? -20 : "auto",
          right: item.position.x < 0 ? -20 : "auto",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        <line
          x1={item.position.x > 0 ? 0 : "100%"}
          y1="50%"
          x2={item.position.x > 0 ? "100%" : 0}
          y2="50%"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      </svg>

      <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-blue-100 transition-colors">
        <Icon className="w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors" />
      </div>

      <div className="text-left">
        <p className="text-sm font-medium text-slate-900">{item.label}</p>
        {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
      </div>
    </motion.button>
  )
}
