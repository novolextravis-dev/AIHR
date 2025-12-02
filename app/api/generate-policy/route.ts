import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { policyType, context, companyName } = await request.json()

    const prompt = `You are an expert HR policy writer. Generate a professional, comprehensive HR policy for the following:

Policy Type: ${policyType}
Company Name: ${companyName || "[Company Name]"}
Additional Context: ${context || "Standard corporate environment"}

The policy should include:
1. **Policy Title**
2. **Purpose**: Why this policy exists
3. **Scope**: Who this policy applies to
4. **Policy Statement**: The main policy content
5. **Procedures**: Step-by-step implementation
6. **Responsibilities**: Who is responsible for what
7. **Compliance**: Legal and regulatory considerations
8. **Effective Date**: When the policy takes effect
9. **Review Schedule**: When the policy should be reviewed

Write in a professional, clear, and legally sound manner. Use formal language appropriate for corporate HR documentation.`

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt,
      maxTokens: 2000,
    })

    return Response.json({ policy: text })
  } catch (error) {
    console.error("Generate policy error:", error)
    return Response.json({ error: "Failed to generate policy" }, { status: 500 })
  }
}
