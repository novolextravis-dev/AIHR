import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { message, context, history, coreMemory, aiSettings } = await request.json()

    // Build core memory context
    let coreMemoryContext = ""
    if (coreMemory && coreMemory.length > 0 && aiSettings?.useCorememory !== false) {
      coreMemoryContext = "\n\n=== CORE MEMORY (Company Knowledge Base) ===\n"
      for (const item of coreMemory) {
        coreMemoryContext += `\n--- ${item.name} (${item.category || "general"}) ---\n`
        coreMemoryContext += `Summary: ${item.summary}\n`
        // Include truncated content for context
        if (item.content) {
          coreMemoryContext += `Content: ${item.content.slice(0, 3000)}${item.content.length > 3000 ? "..." : ""}\n`
        }
      }
      coreMemoryContext += "\n=== END CORE MEMORY ===\n"
    }

    // Build company context
    let companyContext = ""
    if (aiSettings?.companyName || aiSettings?.industry) {
      companyContext = `\nCompany: ${aiSettings.companyName || "Not specified"}`
      if (aiSettings.industry) {
        companyContext += ` | Industry: ${aiSettings.industry}`
      }
      companyContext += "\n"
    }

    // Determine response style based on settings
    const responseLength = aiSettings?.responseLength || "detailed"
    const tone = aiSettings?.tone || "professional"

    const lengthInstruction = {
      concise: "Keep responses brief and to the point (2-3 sentences when possible).",
      detailed: "Provide balanced, informative responses with appropriate detail.",
      comprehensive: "Provide thorough, comprehensive responses with full explanations.",
    }[responseLength]

    const toneInstruction = {
      professional: "Maintain a professional, business-appropriate tone.",
      friendly: "Use a warm, approachable tone while remaining helpful.",
      formal: "Use formal language and structured responses.",
    }[tone]

    const systemPrompt = `You are an expert HR Manager AI Assistant. You help with:
- Drafting HR policies and procedures
- Summarizing employee documents and reports
- Creating onboarding checklists and workflows
- Analyzing performance reviews
- Answering HR-related questions
- Providing compliance guidance
${companyContext}
${lengthInstruction}
${toneInstruction}

Be helpful and accurate. Format your responses clearly with bullet points when appropriate.
${coreMemoryContext}
${context ? `\nCurrent Document Context:\n${context}\n` : ""}
`

    const conversationHistory = history
      .map((msg: { role: string; content: string }) => `${msg.role === "user" ? "Human" : "Assistant"}: ${msg.content}`)
      .join("\n")

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: systemPrompt,
      prompt: `${conversationHistory}\nHuman: ${message}\nAssistant:`,
      maxTokens: responseLength === "concise" ? 512 : responseLength === "comprehensive" ? 2048 : 1024,
    })

    return Response.json({ response: text })
  } catch (error) {
    console.error("Chat API error:", error)
    return Response.json({ error: "Failed to generate response" }, { status: 500 })
  }
}
