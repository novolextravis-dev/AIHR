import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { content, structuredData, instruction, modificationType } = await request.json()

    if (!content || !instruction) {
      return Response.json({ error: "Content and instruction are required" }, { status: 400 })
    }

    let prompt = ""

    switch (modificationType) {
      case "rewrite_slide":
        prompt = `You are an expert presentation designer. Rewrite the specified slide content based on the instruction.

Current Presentation Content:
${content.slice(0, 8000)}

Instruction: ${instruction}

Provide the rewritten slide content in this format:
SLIDE [number]:
Title: [new title]
Subtitle: [new subtitle if applicable]
Content:
• [bullet point 1]
• [bullet point 2]
...
Notes: [speaker notes if applicable]`
        break

      case "add_slide":
        prompt = `You are an expert HR presentation designer. Create a new slide to add to this presentation.

Current Presentation Content:
${content.slice(0, 6000)}

Instruction: ${instruction}

Create the new slide content in this format:
NEW SLIDE:
Title: [slide title]
Subtitle: [subtitle if applicable]
Content:
• [bullet point 1]
• [bullet point 2]
• [bullet point 3]
...
Notes: [speaker notes for presenter]`
        break

      case "improve_all":
        prompt = `You are an expert HR presentation consultant. Improve the entire presentation based on the instruction.

Current Presentation:
${content.slice(0, 10000)}

Instruction: ${instruction}

Provide the improved version with clear slide-by-slide content:
---
SLIDE 1:
Title: [improved title]
Content: [improved content]
...
---
SLIDE 2:
...`
        break

      case "generate_notes":
        prompt = `You are an expert HR trainer. Generate comprehensive speaker notes for this presentation.

Presentation Content:
${content.slice(0, 10000)}

Additional Context: ${instruction}

For each slide, provide detailed speaker notes that include:
- Key talking points
- Timing suggestions
- Audience engagement tips
- Transition phrases to next slide

Format:
SLIDE [number] NOTES:
[comprehensive speaker notes]
---`
        break

      default:
        prompt = `You are an expert HR presentation editor. Modify this presentation based on the instruction.

Current Content:
${content.slice(0, 8000)}

Instruction: ${instruction}

Provide the modified content maintaining the slide structure.`
    }

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt,
      maxTokens: 3000,
    })

    return Response.json({
      success: true,
      modifiedContent: text,
      modificationType,
      originalSlideCount: structuredData?.slides?.length || 0,
    })
  } catch (error) {
    console.error("PPTX modification error:", error)
    return Response.json(
      {
        error: "Failed to modify presentation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
