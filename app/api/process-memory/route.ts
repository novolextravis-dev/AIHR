import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { content, fileName, fileType } = await request.json()

    if (!content) {
      return Response.json({ error: "No content provided" }, { status: 400 })
    }

    // Truncate content for processing if too long
    const truncatedContent = content.slice(0, 15000)

    // Use AI to analyze and summarize the document for memory
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: `You are an HR document analyzer. Analyze the provided document and extract:
1. A concise summary (2-3 sentences max)
2. Key topics/keywords (up to 10)
3. Document category (one of: handbook, policy, employees, procedures, other)

Respond in JSON format:
{
  "summary": "...",
  "keywords": ["..."],
  "category": "..."
}`,
      prompt: `Analyze this document:
Filename: ${fileName}
File Type: ${fileType}

Content:
${truncatedContent}`,
      maxTokens: 500,
    })

    // Parse the AI response
    let result
    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No JSON found")
      }
    } catch {
      // Fallback if parsing fails
      result = {
        summary: `Document "${fileName}" has been processed and added to memory.`,
        keywords: [],
        category: "other",
      }
    }

    return Response.json(result)
  } catch (error) {
    console.error("Memory processing error:", error)
    return Response.json({ error: "Failed to process memory" }, { status: 500 })
  }
}
