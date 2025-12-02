import { generateText } from "ai"
import type { CoreMemoryItem, AISettings } from "@/lib/store"

export async function POST(request: Request) {
  try {
    const { content, fileName, coreMemory, aiSettings } = (await request.json()) as {
      content: string
      fileName: string
      coreMemory?: CoreMemoryItem[]
      aiSettings?: AISettings
    }

    let memoryContext = ""
    if (coreMemory && coreMemory.length > 0) {
      memoryContext = "\n\nRelevant Company Context:\n"
      for (const memory of coreMemory.slice(0, 3)) {
        memoryContext += `- ${memory.name}: ${memory.summary}\n`
      }
    }

    const tone = aiSettings?.tone || "professional"
    const responseLength = aiSettings?.responseLength || "detailed"
    const companyName = aiSettings?.companyName || "the company"

    const lengthInstruction =
      responseLength === "concise"
        ? "Keep your analysis brief and to the point."
        : responseLength === "comprehensive"
          ? "Provide a thorough and comprehensive analysis."
          : "Provide a balanced, detailed analysis."

    const toneInstruction =
      tone === "friendly"
        ? "Use a warm, approachable tone."
        : tone === "formal"
          ? "Use a formal, business-appropriate tone."
          : "Use a professional yet accessible tone."

    const prompt = `Analyze this HR document for ${companyName} and provide:
1. **Summary**: A concise overview of the document
2. **Key Points**: Main takeaways (bullet points)
3. **Action Items**: Any tasks or follow-ups needed
4. **Compliance Notes**: Any HR compliance considerations
5. **Recommendations**: Suggestions for improvement

${lengthInstruction}
${toneInstruction}
${memoryContext}

Document Name: ${fileName}
Document Content:
${content.slice(0, 8000)}${content.length > 8000 ? "\n...[truncated]" : ""}
`

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt,
      maxTokens: responseLength === "concise" ? 800 : responseLength === "comprehensive" ? 2000 : 1500,
    })

    return Response.json({ analysis: text })
  } catch (error) {
    console.error("Analyze document error:", error)
    return Response.json({ error: "Failed to analyze document" }, { status: 500 })
  }
}
