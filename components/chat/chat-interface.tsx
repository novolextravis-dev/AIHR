"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Send, Sparkles, Mic, MicOff, Brain, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useHRStore } from "@/lib/store"
import { ChatMessage } from "@/components/chat/chat-message"
import { QuickActions } from "@/components/chat/quick-actions"
import { useToast } from "@/components/ui/use-toast"

interface ChatInterfaceProps {
  minimal?: boolean
  onBack?: () => void
}

export function ChatInterface({ minimal, onBack }: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, addMessage, currentDocument, coreMemory, aiSettings } = useHRStore()
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      })

      // Use webm format which is widely supported
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4"

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())

        // Clear recording timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }
        setRecordingTime(0)

        // Process audio if we have chunks
        if (audioChunksRef.current.length > 0) {
          await transcribeAudio()
        }
      }

      mediaRecorder.onerror = () => {
        toast({
          title: "Recording error",
          description: "Failed to record audio. Please try again.",
          variant: "destructive",
        })
        setIsRecording(false)
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      toast({
        title: "Recording started",
        description: "Speak now. Click the mic button again to stop.",
      })
    } catch (error) {
      console.error("Failed to start recording:", error)
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice input.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async () => {
    setIsTranscribing(true)

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })

      // Check if audio is too short (less than 0.5 seconds worth of data)
      if (audioBlob.size < 1000) {
        toast({
          title: "Recording too short",
          description: "Please record for at least 1 second.",
          variant: "destructive",
        })
        setIsTranscribing(false)
        return
      }

      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 503) {
          toast({
            title: "Model loading",
            description: "The speech model is warming up. Please try again in a few seconds.",
          })
        } else if (data.error?.includes("API key")) {
          toast({
            title: "Configuration required",
            description: "Please add your Hugging Face API key (HUGGINGFACE_API_KEY) in environment variables.",
            variant: "destructive",
          })
        } else {
          throw new Error(data.error || "Transcription failed")
        }
        return
      }

      if (data.text && data.text.trim()) {
        setInput((prev) => (prev ? `${prev} ${data.text.trim()}` : data.text.trim()))
        toast({
          title: "Transcription complete",
          description: `"${data.text.trim().slice(0, 50)}${data.text.length > 50 ? "..." : ""}"`,
        })
      } else {
        toast({
          title: "No speech detected",
          description: "Could not detect any speech. Please try again.",
        })
      }
    } catch (error) {
      console.error("Transcription error:", error)
      toast({
        title: "Transcription failed",
        description: "Failed to transcribe audio. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsTranscribing(false)
      audioChunksRef.current = []
    }
  }

  const toggleVoiceInput = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    addMessage({ role: "user", content: userMessage })
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context: currentDocument?.content || null,
          history: messages.slice(-10),
          coreMemory: coreMemory,
          aiSettings: aiSettings,
        }),
      })

      if (!response.ok) throw new Error("Failed to get response")

      const data = await response.json()
      addMessage({ role: "assistant", content: data.response })
    } catch {
      addMessage({
        role: "assistant",
        content: "I apologize, but I encountered an error. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (action: string) => {
    setInput(action)
  }

  // Format recording time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (minimal) {
    return (
      <motion.div
        className="w-full max-w-xl mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {coreMemory.length > 0 && aiSettings.useCorememory && (
          <div className="flex items-center justify-center gap-2 mb-3 text-xs text-violet-600">
            <Brain className="w-3 h-3" />
            <span>{coreMemory.length} memories active</span>
          </div>
        )}
        <div className="relative flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-xl shrink-0",
              isRecording && "bg-red-100 hover:bg-red-200 text-red-600 animate-pulse",
              isTranscribing && "bg-blue-100 hover:bg-blue-200 text-blue-600",
            )}
            onClick={toggleVoiceInput}
            disabled={isTranscribing}
            title={isRecording ? "Stop recording" : "Start voice input"}
          >
            {isTranscribing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4 text-slate-600" />
            )}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isRecording
                ? `Recording... ${formatTime(recordingTime)}`
                : isTranscribing
                  ? "Transcribing..."
                  : "Type a message..."
            }
            className={cn(
              "w-full h-14 pl-5 pr-14",
              "bg-white/80 backdrop-blur-sm",
              "border-slate-200/50 shadow-lg shadow-black/5",
              "rounded-2xl",
              "text-base placeholder:text-slate-400",
              "focus:ring-2 focus:ring-blue-500/20",
              isRecording && "border-2 border-red-300 bg-red-50/50",
            )}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={isRecording || isTranscribing}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl hover:bg-blue-100"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isRecording || isTranscribing}
          >
            <Send className="w-4 h-4 text-slate-600" />
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="w-full max-w-3xl mx-auto max-h-[calc(100vh-120px)] flex flex-col"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-900">AI Chat</h2>
          <p className="text-sm text-slate-500">Ask me anything about HR tasks</p>
        </div>
        {coreMemory.length > 0 && aiSettings.useCorememory && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm">
            <Brain className="w-4 h-4" />
            <span>{coreMemory.length} memories</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex-shrink-0">
        <QuickActions onAction={handleQuickAction} />
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 bg-white/60 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl shadow-black/5 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-medium text-slate-900 mb-2">Start a conversation</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Ask me to draft policies, summarize documents, create checklists, or help with any HR task.
              </p>
              {coreMemory.length > 0 && (
                <p className="text-xs text-violet-600 mt-3">
                  I have access to {coreMemory.length} document{coreMemory.length > 1 ? "s" : ""} in my memory.
                </p>
              )}
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-slate-500">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-slate-200/50 p-4 flex-shrink-0">
          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center justify-center gap-2 mb-3 py-2 px-4 bg-red-50 rounded-xl border border-red-200">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-red-700 font-medium">Recording... {formatTime(recordingTime)}</span>
              <span className="text-xs text-red-500">Click mic to stop</span>
            </div>
          )}
          {isTranscribing && (
            <div className="flex items-center justify-center gap-2 mb-3 py-2 px-4 bg-blue-50 rounded-xl border border-blue-200">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-sm text-blue-700 font-medium">Transcribing with Whisper...</span>
            </div>
          )}

          <div className="relative flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-xl shrink-0",
                isRecording && "bg-red-500 hover:bg-red-600 text-white",
                isTranscribing && "bg-blue-100 hover:bg-blue-200 text-blue-600",
                !isRecording && !isTranscribing && "hover:bg-blue-100",
              )}
              onClick={toggleVoiceInput}
              disabled={isTranscribing}
              title={isRecording ? "Stop recording" : "Start voice input (Whisper)"}
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-4 h-4 animate-pulse" />
              ) : (
                <Mic className="w-4 h-4 text-slate-600" />
              )}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isRecording
                  ? `Recording... ${formatTime(recordingTime)}`
                  : isTranscribing
                    ? "Transcribing..."
                    : "Type your message or use voice input..."
              }
              className={cn(
                "flex-1 h-12 bg-slate-50 border-0 rounded-xl text-base",
                isRecording && "border-2 border-red-300 bg-red-50/50",
                isTranscribing && "border-2 border-blue-300 bg-blue-50/50",
              )}
              onKeyDown={(e) => e.key === "Enter" && !isRecording && !isTranscribing && handleSend()}
              disabled={isRecording || isTranscribing}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || isRecording || isTranscribing}
              className="h-12 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600"
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
