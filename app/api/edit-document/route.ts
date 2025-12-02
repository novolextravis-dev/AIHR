import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { content, instruction, documentType } = await request.json()

    if (!content || !instruction) {
      return Response.json({ error: "Content and instruction are required" }, { status: 400 })
    }

    const prompt = `You are an expert HR document editor. Your task is to edit the following document based on the given instruction.

Document Type: ${documentType || "HR Document"}
Edit Instruction: ${instruction}

Original Document:
---
${content.slice(0, 10000)}
---

Please provide the edited document. Maintain the original structure and formatting where appropriate. Only make changes that are relevant to the instruction.

Edited Document:`

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt,
      maxTokens: 4000,
    })

    return Response.json({
      success: true,
      editedContent: text,
      originalLength: content.length,
      editedLength: text.length,
    })
  } catch (error) {
    console.error("Edit document error:", error)
    return Response.json(
      {
        error: "Failed to edit document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
