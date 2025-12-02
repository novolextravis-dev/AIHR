import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { content, type } = await request.json()

    let prompt = ""

    switch (type) {
      case "performance":
        prompt = `Summarize this performance review document, highlighting:
- Overall performance rating
- Key strengths
- Areas for improvement
- Goals achieved
- Recommended actions

Document:
${content}`
        break

      case "general":
      default:
        prompt = `Provide a concise summary of this HR document:
- Main points
- Key decisions or actions
- Important dates or deadlines
- Follow-up items

Document:
${content}`
    }

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt,
      maxTokens: 800,
    })

    return Response.json({ summary: text })
  } catch (error) {
    console.error("Summarize error:", error)
    return Response.json({ error: "Failed to summarize" }, { status: 500 })
  }
}
