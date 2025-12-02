import type { NextRequest } from "next/server"
import * as XLSX from "xlsx"
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx"

export async function POST(request: NextRequest) {
  try {
    const { content, format, fileName } = await request.json()

    if (!content || !format) {
      return Response.json({ error: "Content and format are required" }, { status: 400 })
    }

    let fileBuffer: Buffer
    let mimeType: string
    let extension: string

    switch (format) {
      case "docx": {
        // Create DOCX document
        const paragraphs = content.split("\n").map((line: string) => {
          // Check if line is a heading
          if (line.startsWith("# ")) {
            return new Paragraph({
              text: line.replace("# ", ""),
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 },
            })
          } else if (line.startsWith("## ")) {
            return new Paragraph({
              text: line.replace("## ", ""),
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 150 },
            })
          } else if (line.startsWith("### ")) {
            return new Paragraph({
              text: line.replace("### ", ""),
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 100 },
            })
          } else if (line.startsWith("- ") || line.startsWith("* ")) {
            return new Paragraph({
              children: [new TextRun({ text: line.substring(2) })],
              bullet: { level: 0 },
              spacing: { after: 50 },
            })
          } else if (line.match(/^\d+\. /)) {
            return new Paragraph({
              children: [new TextRun({ text: line.replace(/^\d+\. /, "") })],
              numbering: { reference: "default-numbering", level: 0 },
              spacing: { after: 50 },
            })
          } else if (line.startsWith("**") && line.endsWith("**")) {
            return new Paragraph({
              children: [new TextRun({ text: line.slice(2, -2), bold: true })],
              spacing: { after: 100 },
            })
          } else {
            return new Paragraph({
              children: [new TextRun({ text: line || " " })],
              spacing: { after: 100 },
            })
          }
        })

        const doc = new Document({
          sections: [
            {
              properties: {},
              children: paragraphs,
            },
          ],
          numbering: {
            config: [
              {
                reference: "default-numbering",
                levels: [
                  {
                    level: 0,
                    format: "decimal",
                    text: "%1.",
                    alignment: "start",
                  },
                ],
              },
            ],
          },
        })

        fileBuffer = Buffer.from(await Packer.toBuffer(doc))
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        extension = "docx"
        break
      }

      case "xlsx": {
        // Parse content as table data
        const lines = content.split("\n").filter((l: string) => l.trim())
        const data = lines.map((line: string) => line.split("|").map((cell: string) => cell.trim()))

        const worksheet = XLSX.utils.aoa_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1")

        fileBuffer = Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }))
        mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        extension = "xlsx"
        break
      }

      case "txt": {
        fileBuffer = Buffer.from(content, "utf-8")
        mimeType = "text/plain"
        extension = "txt"
        break
      }

      case "csv": {
        // Convert content to CSV format
        const lines = content.split("\n").filter((l: string) => l.trim())
        const csvContent = lines
          .map((line: string) => {
            const cells = line.split("|").map((cell: string) => {
              const trimmed = cell.trim()
              // Escape quotes and wrap in quotes if contains comma
              if (trimmed.includes(",") || trimmed.includes('"')) {
                return `"${trimmed.replace(/"/g, '""')}"`
              }
              return trimmed
            })
            return cells.join(",")
          })
          .join("\n")

        fileBuffer = Buffer.from(csvContent, "utf-8")
        mimeType = "text/csv"
        extension = "csv"
        break
      }

      default:
        return Response.json({ error: `Unsupported export format: ${format}` }, { status: 400 })
    }

    // Return as base64 for download
    return Response.json({
      success: true,
      file: fileBuffer.toString("base64"),
      mimeType,
      fileName: `${fileName || "export"}.${extension}`,
    })
  } catch (error) {
    console.error("Export document error:", error)
    return Response.json(
      {
        error: "Failed to export document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
