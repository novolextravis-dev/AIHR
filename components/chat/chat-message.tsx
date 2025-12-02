"use client"

import { motion } from "framer-motion"
import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Message } from "@/lib/store"

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === "assistant"

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isAssistant ? "justify-start" : "justify-end")}
    >
      {isAssistant && (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] px-4 py-3 rounded-2xl",
          isAssistant
            ? "bg-slate-100 text-slate-900 rounded-tl-sm"
            : "bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-tr-sm",
        )}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>

      {!isAssistant && (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center">
          <User className="w-4 h-4 text-slate-600" />
        </div>
      )}
    </motion.div>
  )
}
