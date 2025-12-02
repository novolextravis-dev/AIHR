import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { documents, action } = await request.json()

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return Response.json({ error: "Documents array is required" }, { status: 400 })
    }

    if (!action || !["summarize", "analyze", "extract-data"].includes(action)) {
      return Response.json({ error: "Valid action is required (summarize, analyze, extract-data)" }, { status: 400 })
    }

    // Process documents in parallel with Promise.all
    const results = await Promise.all(
      documents.map(async (doc: { content: string; fileName: string }, index: number) => {
        try {
          let endpoint = ""
          let body: Record<string, unknown> = {}

          switch (action) {
            case "summarize":
              endpoint = "/api/summarize"
              body = { content: doc.content, type: "general" }
              break
            case "analyze":
              endpoint = "/api/analyze-document"
              body = { content: doc.content, fileName: doc.fileName }
              break
            case "extract-data":
              endpoint = "/api/analyze-document"
              body = { content: doc.content, fileName: doc.fileName }
              break
          }

          // Get the host from the request
          const host = request.headers.get("host") || "localhost:3000"
          const protocol = host.includes("localhost") ? "http" : "https"

          const response = await fetch(`${protocol}://${host}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })

          if (!response.ok) {
            throw new Error(`Failed to process: ${response.statusText}`)
          }

          const result = await response.json()

          return {
            index,
            fileName: doc.fileName,
            success: true,
            result,
          }
        } catch (error) {
          return {
            index,
            fileName: doc.fileName,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }
        }
      }),
    )

    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    return Response.json({
      success: true,
      totalProcessed: documents.length,
      successful,
      failed,
      results,
    })
  } catch (error) {
    console.error("Batch process error:", error)
    return Response.json(
      {
        error: "Failed to batch process documents",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
