"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Menu, Settings, HelpCircle, Brain, X, FileText, MessageSquare, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useHRStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"

export function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const { setIsSettingsOpen, coreMemory, documents, messages, tasks } = useHRStore()

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { documents: [], messages: [], tasks: [] }

    const query = searchQuery.toLowerCase()

    return {
      documents: documents
        .filter((doc) => doc.name.toLowerCase().includes(query) || doc.content?.toLowerCase().includes(query))
        .slice(0, 3),
      messages: messages.filter((msg) => msg.content.toLowerCase().includes(query)).slice(0, 3),
      tasks: tasks.filter((task) => task.title.toLowerCase().includes(query)).slice(0, 3),
    }
  }, [searchQuery, documents, messages, tasks])

  const hasResults =
    searchResults.documents.length > 0 || searchResults.messages.length > 0 || searchResults.tasks.length > 0

  const handleCloseSearch = () => {
    setIsSearchOpen(false)
    setSearchQuery("")
  }

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "px-6 py-4",
          "bg-white/60 backdrop-blur-xl",
          "border-b border-slate-200/50",
        )}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">HR</span>
            </div>
            <div>
              <h1 className="font-semibold text-slate-900">HR Manager</h1>
              <p className="text-xs text-slate-500">Super Assistant</p>
            </div>
          </div>

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-8 relative">
            {isSearchOpen ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                className="relative w-full"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search documents, tasks, or conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-10 bg-slate-100/50 border-0 rounded-xl"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg"
                  onClick={handleCloseSearch}
                >
                  <X className="w-4 h-4 text-slate-400" />
                </Button>

                <AnimatePresence>
                  {searchQuery.trim() && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
                    >
                      {!hasResults ? (
                        <div className="p-4 text-center text-sm text-slate-500">
                          No results found for "{searchQuery}"
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto">
                          {searchResults.documents.length > 0 && (
                            <div className="p-2">
                              <p className="text-xs font-medium text-slate-500 px-2 mb-1">Documents</p>
                              {searchResults.documents.map((doc) => (
                                <button
                                  key={doc.id}
                                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-left"
                                  onClick={handleCloseSearch}
                                >
                                  <FileText className="w-4 h-4 text-blue-500" />
                                  <span className="text-sm text-slate-700 truncate">{doc.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {searchResults.messages.length > 0 && (
                            <div className="p-2 border-t border-slate-100">
                              <p className="text-xs font-medium text-slate-500 px-2 mb-1">Messages</p>
                              {searchResults.messages.map((msg, idx) => (
                                <button
                                  key={idx}
                                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-left"
                                  onClick={handleCloseSearch}
                                >
                                  <MessageSquare className="w-4 h-4 text-violet-500" />
                                  <span className="text-sm text-slate-700 truncate">{msg.content.slice(0, 50)}...</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {searchResults.tasks.length > 0 && (
                            <div className="p-2 border-t border-slate-100">
                              <p className="text-xs font-medium text-slate-500 px-2 mb-1">Tasks</p>
                              {searchResults.tasks.map((task) => (
                                <button
                                  key={task.id}
                                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-left"
                                  onClick={handleCloseSearch}
                                >
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  <span className="text-sm text-slate-700 truncate">{task.title}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setIsSearchOpen(true)}
                className="gap-2 text-slate-500 hover:text-slate-700"
              >
                <Search className="w-4 h-4" />
                <span className="text-sm">Search...</span>
              </Button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-xl"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <Search className="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="rounded-xl relative">
              <Settings className="w-5 h-5" />
              {coreMemory.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                  <Brain className="w-2.5 h-2.5 text-white" />
                </span>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
                  <Settings className="w-4 h-4" />
                  Settings
                  {coreMemory.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {coreMemory.length} memories
                    </Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setIsHelpOpen(true)}>
                  <HelpCircle className="w-4 h-4" />
                  Help & Support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 cursor-pointer text-slate-500" disabled>
                  <span className="text-xs">HR Manager Super Assistant v1.0</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.header>

      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Help & Support</DialogTitle>
            <DialogDescription>Get help with using HR Manager Super Assistant</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-blue-50 rounded-xl">
              <h4 className="font-medium text-blue-900 mb-2">Getting Started</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Upload documents using the Documents button</li>
                <li>• Chat with AI to ask questions or generate content</li>
                <li>• Add important documents to Core Memory for context</li>
                <li>• Create workflows to automate HR tasks</li>
              </ul>
            </div>
            <div className="p-4 bg-violet-50 rounded-xl">
              <h4 className="font-medium text-violet-900 mb-2">Tips</h4>
              <ul className="text-sm text-violet-800 space-y-1">
                <li>• Use voice input by clicking the mic button</li>
                <li>• Search across all documents and messages</li>
                <li>• Customize AI behavior in Settings</li>
              </ul>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <h4 className="font-medium text-slate-900 mb-2">Need More Help?</h4>
              <p className="text-sm text-slate-600">
                Contact support at support@example.com or visit our documentation.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
