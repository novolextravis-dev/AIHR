"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface OrbCoreProps {
  onClick: () => void
  isExpanded: boolean
  isDragging: boolean
}

export function OrbCore({ onClick, isExpanded, isDragging }: OrbCoreProps) {
  return (
    <motion.div
      className="relative cursor-pointer select-none"
      onClick={onClick}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{
        scale: isDragging ? 1.1 : 1,
        opacity: 1,
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Outer Glow */}
      <div
        className={cn(
          "absolute inset-0 rounded-full transition-all duration-500",
          isDragging
            ? "bg-gradient-to-br from-cyan-400/40 to-violet-400/40 blur-xl scale-125"
            : "bg-gradient-to-br from-blue-400/20 to-violet-400/20 blur-lg scale-110",
        )}
      />

      {/* Main Orb */}
      <div
        className={cn(
          "relative w-56 h-56 md:w-72 md:h-72 rounded-full",
          "bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500",
          "shadow-2xl shadow-blue-500/30",
          "flex items-center justify-center",
          "overflow-hidden",
          isDragging && "ring-4 ring-cyan-300/50 ring-offset-4 ring-offset-transparent",
        )}
      >
        {/* Inner Highlights */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="absolute top-8 left-8 w-16 h-16 rounded-full bg-white/20 blur-md" />

        {/* Animated Ring */}
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-white/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />

        {/* Pulse Effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-white/10"
          animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
        />

        {/* Text Content */}
        <div className="relative z-10 text-center px-8">
          <motion.p
            className="text-white/90 text-lg md:text-xl font-medium leading-relaxed text-balance"
            animate={{ opacity: isDragging ? 0.5 : 1 }}
          >
            {isDragging ? "Drop file here" : "How can I assist you today?"}
          </motion.p>
        </div>
      </div>

      {/* Click Indicator */}
      <motion.div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isExpanded ? 0 : 1, y: isExpanded ? 10 : 0 }}
        transition={{ delay: 1 }}
      >
        Click to explore
      </motion.div>
    </motion.div>
  )
}
