import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { content, structuredData, fileName, analysisType } = await request.json()

    if (!content) {
      return Response.json({ error: "No content provided" }, { status: 400 })
    }

    let prompt = ""

    switch (analysisType) {
      case "summary":
        prompt = `Analyze this PowerPoint presentation and provide a comprehensive summary:

Presentation: ${fileName}

Content:
${content.slice(0, 12000)}

Please provide:
1. **Executive Summary** - A brief overview of the entire presentation
2. **Key Themes** - Main topics and themes covered
3. **Slide-by-Slide Highlights** - Important points from each section
4. **Target Audience** - Who this presentation appears to be for
5. **Recommendations** - Suggestions for improvement or follow-up actions`
        break

      case "hr_review":
        prompt = `Review this HR presentation for compliance and best practices:

Presentation: ${fileName}

Content:
${content.slice(0, 12000)}

Please analyze and provide:
1. **HR Compliance Check** - Any policy or legal concerns
2. **Best Practices** - What follows HR best practices
3. **Areas for Improvement** - What could be enhanced
4. **Missing Elements** - Important HR topics not covered
5. **Accessibility** - Is the content inclusive and accessible?`
        break

      case "extract_data":
        prompt = `Extract structured data from this PowerPoint presentation:

Presentation: ${fileName}

Content:
${content.slice(0, 12000)}

Please extract and organize:
1. **Key Statistics** - Any numbers, percentages, or metrics mentioned
2. **Names and Roles** - People mentioned and their positions
3. **Dates and Deadlines** - Any temporal information
4. **Action Items** - Tasks or to-dos mentioned
5. **Contact Information** - Emails, phone numbers, etc.
6. **Key Terms** - Important terminology or definitions`
        break

      default:
        prompt = `Analyze this HR presentation and provide insights:

Presentation: ${fileName}

Content:
${content.slice(0, 12000)}

Provide a comprehensive analysis including:
1. **Summary** - Overview of the presentation
2. **Key Points** - Main takeaways for HR managers
3. **Action Items** - Recommended next steps
4. **Compliance Notes** - Any HR-related compliance considerations
5. **Improvement Suggestions** - How to enhance the presentation`
    }

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt,
      maxTokens: 2000,
    })

    return Response.json({
      success: true,
      analysis: text,
      analysisType,
      slideCount: structuredData?.slides?.length || 0,
    })
  } catch (error) {
    console.error("PPTX analysis error:", error)
    return Response.json(
      {
        error: "Failed to analyze presentation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
