import type { NextRequest } from "next/server"
import { parsePPTX, pptxToText, pptxToStructuredJSON } from "@/lib/pptx-parser"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 })
    }

    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return Response.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 })
    }

    const fileType = file.type
    const fileName = file.name.toLowerCase()
    let content = ""
    let structuredData: object | null = null
    let preview = ""
    const metadata: Record<string, unknown> = {
      fileName: file.name,
      fileType,
      size: file.size,
      processedAt: new Date().toISOString(),
    }

    const arrayBuffer = await file.arrayBuffer()

    const isPPTX =
      fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      fileName.endsWith(".pptx")
    const isDOCX =
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".docx")
    const isXLSX =
      fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || fileName.endsWith(".xlsx")
    const isPDF = fileType === "application/pdf" || fileName.endsWith(".pdf")
    const isCSV = fileType === "text/csv" || fileName.endsWith(".csv")
    const isTXT = fileType === "text/plain" || fileName.endsWith(".txt")

    // Parse based on file type
    if (isTXT || isCSV) {
      const textContent = await file.text()
      content = textContent
      metadata.lineCount = content.split("\n").length

      if (isCSV) {
        const lines = content.split("\n").filter((line) => line.trim())
        const headers = lines[0]?.split(",").map((h) => h.trim()) || []
        metadata.headers = headers
        metadata.rowCount = lines.length - 1
      }
    } else if (isPDF) {
      content = await extractTextFromPDF(arrayBuffer)
      metadata.type = "pdf"
    } else if (isDOCX) {
      content = await extractTextFromDOCX(arrayBuffer)
      metadata.type = "docx"
    } else if (isXLSX) {
      content = await extractTextFromXLSX(arrayBuffer)
      metadata.type = "xlsx"
    } else if (isPPTX) {
      try {
        const pptxDoc = await parsePPTX(arrayBuffer)

        content = pptxToText(pptxDoc)
        structuredData = pptxToStructuredJSON(pptxDoc)
        metadata.type = "pptx"
        metadata.slideCount = pptxDoc.slides.length
        metadata.presentationTitle = pptxDoc.metadata.title
        metadata.author = pptxDoc.metadata.author
        metadata.slides = pptxDoc.slides.map((s) => ({
          number: s.slideNumber,
          title: s.title,
          hasNotes: !!s.notes,
          contentLength: s.bodyText.join(" ").length,
        }))
      } catch (pptxError) {
        console.error("PPTX parsing error:", pptxError)
        content = `PowerPoint file uploaded: ${file.name}. Parsing encountered an issue: ${pptxError instanceof Error ? pptxError.message : "Unknown error"}`
        metadata.type = "pptx"
        metadata.error = pptxError instanceof Error ? pptxError.message : "Unknown error"
      }
    } else {
      // Fallback: try to read as text
      try {
        const textContent = await file.text()
        content = textContent || "Unable to extract text from this file format."
      } catch {
        content = "File uploaded but text extraction is not supported for this format."
      }
    }

    preview = content.slice(0, 500) + (content.length > 500 ? "..." : "")

    return Response.json({
      success: true,
      content,
      structuredData,
      preview,
      metadata,
      characterCount: content.length,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    })
  } catch (error) {
    console.error("Parse document error:", error)
    return Response.json(
      {
        error: "Failed to parse document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(arrayBuffer)
    const text = new TextDecoder("utf-8", { fatal: false }).decode(uint8Array)

    const textMatches: string[] = []
    const btEtRegex = /BT[\s\S]*?ET/g
    const streams = text.match(btEtRegex) || []

    for (const stream of streams) {
      // Fixed regex - use escaped parentheses $$ and $$ instead of $$
      const tjMatches = stream.match(/$$([^)]*)$$\s*Tj/g) || []
      const tjArrayMatches = stream.match(/\[([^\]]*)\]\s*TJ/g) || []

      for (const match of tjMatches) {
        const extracted = match.match(/$$([^)]*)$$/)?.[1]
        if (extracted) textMatches.push(extracted)
      }

      for (const match of tjArrayMatches) {
        const parts = match.match(/$$([^)]*)$$/g) || []
        for (const part of parts) {
          const extracted = part.match(/$$([^)]*)$$/)?.[1]
          if (extracted) textMatches.push(extracted)
        }
      }
    }

    const plainTextRegex = /[A-Za-z][A-Za-z0-9\s.,;:!?'"()-]{20,}/g
    const plainMatches = text.match(plainTextRegex) || []

    const allText = [...textMatches, ...plainMatches].join(" ")

    if (allText.trim().length > 50) {
      return cleanExtractedText(allText)
    }

    return "PDF text extraction completed. For complex PDFs with images or special formatting, content may be limited."
  } catch (error) {
    console.error("PDF extraction error:", error)
    return "PDF uploaded successfully. Text extraction encountered an issue."
  }
}

// Extract text from DOCX (Office Open XML)
async function extractTextFromDOCX(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const JSZip = (await import("jszip")).default
    const zip = await JSZip.loadAsync(arrayBuffer)

    const documentXml = await zip.file("word/document.xml")?.async("string")
    if (!documentXml) {
      return "DOCX file uploaded but no document.xml found."
    }

    const parts = documentXml.split(/<w:p[^>]*>/)
    const paragraphs: string[] = []

    for (const part of parts) {
      const texts = part.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []
      const paragraphText = texts.map((t) => t.replace(/<[^>]+>/g, "")).join("")

      if (paragraphText.trim()) {
        paragraphs.push(paragraphText)
      }
    }

    return paragraphs.join("\n\n") || "Document processed successfully."
  } catch (error) {
    console.error("DOCX extraction error:", error)
    return "DOCX uploaded successfully. Text extraction encountered an issue."
  }
}

// Extract text from XLSX
async function extractTextFromXLSX(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const JSZip = (await import("jszip")).default
    const zip = await JSZip.loadAsync(arrayBuffer)

    const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("string")
    const sharedStrings: string[] = []

    if (sharedStringsXml) {
      const stringMatches = sharedStringsXml.match(/<t[^>]*>([^<]*)<\/t>/g) || []
      for (const match of stringMatches) {
        const text = match.replace(/<[^>]+>/g, "")
        if (text.trim()) sharedStrings.push(text)
      }
    }

    const sheets: string[] = []
    const sheetFiles = Object.keys(zip.files).filter((name) => name.match(/xl\/worksheets\/sheet\d+\.xml$/))

    for (const sheetFile of sheetFiles) {
      const sheetXml = await zip.file(sheetFile)?.async("string")
      if (!sheetXml) continue

      const sheetName = sheetFile.match(/sheet(\d+)/)?.[1] || "?"
      const rows: string[] = []
      const rowMatches = sheetXml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || []

      for (const row of rowMatches.slice(0, 100)) {
        const cellValues: string[] = []
        const cellMatches = row.match(/<c[^>]*>[\s\S]*?<\/c>/g) || []

        for (const cell of cellMatches) {
          const isSharedString = cell.includes('t="s"')
          const valueMatch = cell.match(/<v>([^<]*)<\/v>/)

          if (valueMatch) {
            if (isSharedString) {
              const index = Number.parseInt(valueMatch[1])
              cellValues.push(sharedStrings[index] || valueMatch[1])
            } else {
              cellValues.push(valueMatch[1])
            }
          }
        }

        if (cellValues.length > 0) {
          rows.push(cellValues.join(" | "))
        }
      }

      if (rows.length > 0) {
        sheets.push(`=== Sheet ${sheetName} ===\n${rows.join("\n")}`)
      }
    }

    return sheets.join("\n\n") || sharedStrings.join(", ") || "Spreadsheet processed successfully."
  } catch (error) {
    console.error("XLSX extraction error:", error)
    return "XLSX uploaded successfully. Text extraction encountered an issue."
  }
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .trim()
}
