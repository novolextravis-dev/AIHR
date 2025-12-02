// Robust PPTX parser that extracts structured slide data
export interface SlideContent {
  slideNumber: number
  title: string
  subtitle: string
  bodyText: string[]
  notes: string
  shapes: ShapeContent[]
  tables: TableContent[]
}

export interface ShapeContent {
  type: string
  text: string
  position?: { x: number; y: number }
}

export interface TableContent {
  rows: string[][]
}

export interface PPTXDocument {
  slides: SlideContent[]
  metadata: {
    title: string
    author: string
    slideCount: number
    createdAt: string
    modifiedAt: string
  }
  rawXml: Map<string, string>
}

export async function parsePPTX(arrayBuffer: ArrayBuffer): Promise<PPTXDocument> {
  try {
    const JSZip = (await import("jszip")).default

    const zip = await JSZip.loadAsync(arrayBuffer)

    const slides: SlideContent[] = []
    const rawXml = new Map<string, string>()

    // Get slide files sorted by number
    const slideFiles = Object.keys(zip.files)
      .filter((name) => name.match(/ppt\/slides\/slide\d+\.xml$/))
      .sort((a, b) => {
        const numA = Number.parseInt(a.match(/slide(\d+)/)?.[1] || "0")
        const numB = Number.parseInt(b.match(/slide(\d+)/)?.[1] || "0")
        return numA - numB
      })

    // Parse each slide
    for (const slideFile of slideFiles) {
      const xmlContent = await zip.file(slideFile)?.async("string")
      if (!xmlContent) {
        continue
      }

      const slideNum = Number.parseInt(slideFile.match(/slide(\d+)/)?.[1] || "0")
      rawXml.set(slideFile, xmlContent)

      // Parse slide notes if available
      const notesFile = `ppt/notesSlides/notesSlide${slideNum}.xml`
      let notesContent = ""
      if (zip.files[notesFile]) {
        const notesXml = await zip.file(notesFile)?.async("string")
        if (notesXml) {
          notesContent = extractTextElements(notesXml).join(" ")
        }
      }

      const slideContent = parseSlideXml(xmlContent, slideNum, notesContent)
      slides.push(slideContent)
    }

    // Get document metadata
    const corePropsXml = await zip.file("docProps/core.xml")?.async("string")
    const metadata = parseMetadata(corePropsXml || "")

    return {
      slides,
      metadata: {
        ...metadata,
        slideCount: slides.length,
      },
      rawXml,
    }
  } catch (error) {
    console.error("parsePPTX error:", error)
    throw error
  }
}

function parseSlideXml(xml: string, slideNumber: number, notes: string): SlideContent {
  const title = extractTitle(xml)
  const subtitle = extractSubtitle(xml)
  const bodyText = extractBodyText(xml)
  const shapes = extractShapes(xml)
  const tables = extractTables(xml)

  return {
    slideNumber,
    title,
    subtitle,
    bodyText,
    notes,
    shapes,
    tables,
  }
}

function extractTextElements(xml: string): string[] {
  const texts: string[] = []

  // Extract from <a:t> tags (DrawingML text)
  const aTextRegex = /<a:t>([^<]*)<\/a:t>/g
  let match
  while ((match = aTextRegex.exec(xml)) !== null) {
    if (match[1].trim()) {
      texts.push(match[1].trim())
    }
  }

  return texts
}

function extractTitle(xml: string): string {
  // Look for title placeholder type
  const titleMatch = xml.match(/<p:ph[^>]*type="title"[^>]*>[\s\S]*?<a:t>([^<]*)<\/a:t>/i)
  if (titleMatch) return titleMatch[1].trim()

  // Look for centered title placeholder
  const ctrTitleMatch = xml.match(/<p:ph[^>]*type="ctrTitle"[^>]*>[\s\S]*?<a:t>([^<]*)<\/a:t>/i)
  if (ctrTitleMatch) return ctrTitleMatch[1].trim()

  // Fallback: find first text in a shape that looks like a title
  const spMatches = xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || []
  for (const sp of spMatches) {
    if (sp.includes('type="title"') || sp.includes('type="ctrTitle"')) {
      const textMatch = sp.match(/<a:t>([^<]*)<\/a:t>/)
      if (textMatch) return textMatch[1].trim()
    }
  }

  // Last resort: first significant text
  const allTexts = extractTextElements(xml)
  return allTexts[0] || ""
}

function extractSubtitle(xml: string): string {
  const subtitleMatch = xml.match(/<p:ph[^>]*type="subTitle"[^>]*>[\s\S]*?<a:t>([^<]*)<\/a:t>/i)
  if (subtitleMatch) return subtitleMatch[1].trim()

  // Look for subtitle in shapes
  const spMatches = xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || []
  for (const sp of spMatches) {
    if (sp.includes('type="subTitle"')) {
      const texts = extractTextElements(sp)
      return texts.join(" ")
    }
  }

  return ""
}

function extractBodyText(xml: string): string[] {
  const bodyTexts: string[] = []

  // Look for body placeholder
  const bodyMatch = xml.match(/<p:ph[^>]*type="body"[^>]*>[\s\S]*?<\/p:sp>/gi) || []
  for (const body of bodyMatch) {
    const texts = extractTextElements(body)
    bodyTexts.push(...texts)
  }

  // Also get text from paragraphs within shapes
  const paragraphRegex = /<a:p>[\s\S]*?<\/a:p>/g
  const paragraphs = xml.match(paragraphRegex) || []

  for (const para of paragraphs) {
    // Skip if already captured as title/subtitle
    if (para.includes('type="title"') || para.includes('type="subTitle"')) continue

    const texts = extractTextElements(para)
    const paraText = texts.join(" ").trim()
    if (paraText && !bodyTexts.includes(paraText)) {
      bodyTexts.push(paraText)
    }
  }

  return bodyTexts
}

function extractShapes(xml: string): ShapeContent[] {
  const shapes: ShapeContent[] = []
  const spMatches = xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || []

  for (const sp of spMatches) {
    const texts = extractTextElements(sp)
    if (texts.length === 0) continue

    // Determine shape type
    let type = "text"
    if (sp.includes('type="title"')) type = "title"
    else if (sp.includes('type="subTitle"')) type = "subtitle"
    else if (sp.includes('type="body"')) type = "body"

    shapes.push({
      type,
      text: texts.join("\n"),
    })
  }

  return shapes
}

function extractTables(xml: string): TableContent[] {
  const tables: TableContent[] = []
  const tableMatches = xml.match(/<a:tbl>[\s\S]*?<\/a:tbl>/g) || []

  for (const tableXml of tableMatches) {
    const rows: string[][] = []
    const rowMatches = tableXml.match(/<a:tr[^>]*>[\s\S]*?<\/a:tr>/g) || []

    for (const rowXml of rowMatches) {
      const cells: string[] = []
      const cellMatches = rowXml.match(/<a:tc[^>]*>[\s\S]*?<\/a:tc>/g) || []

      for (const cellXml of cellMatches) {
        const texts = extractTextElements(cellXml)
        cells.push(texts.join(" "))
      }

      if (cells.length > 0) {
        rows.push(cells)
      }
    }

    if (rows.length > 0) {
      tables.push({ rows })
    }
  }

  return tables
}

function parseMetadata(coreXml: string): { title: string; author: string; createdAt: string; modifiedAt: string } {
  const titleMatch = coreXml.match(/<dc:title>([^<]*)<\/dc:title>/)
  const authorMatch = coreXml.match(/<dc:creator>([^<]*)<\/dc:creator>/)
  const createdMatch = coreXml.match(/<dcterms:created[^>]*>([^<]*)<\/dcterms:created>/)
  const modifiedMatch = coreXml.match(/<dcterms:modified[^>]*>([^<]*)<\/dcterms:modified>/)

  return {
    title: titleMatch?.[1] || "",
    author: authorMatch?.[1] || "",
    createdAt: createdMatch?.[1] || "",
    modifiedAt: modifiedMatch?.[1] || "",
  }
}

// Convert parsed PPTX to readable text format
export function pptxToText(doc: PPTXDocument): string {
  const lines: string[] = []

  if (doc.metadata.title) {
    lines.push(`Presentation: ${doc.metadata.title}`)
    lines.push("")
  }

  for (const slide of doc.slides) {
    lines.push(`--- Slide ${slide.slideNumber} ---`)

    if (slide.title) {
      lines.push(`Title: ${slide.title}`)
    }

    if (slide.subtitle) {
      lines.push(`Subtitle: ${slide.subtitle}`)
    }

    if (slide.bodyText.length > 0) {
      lines.push("")
      lines.push("Content:")
      for (const text of slide.bodyText) {
        lines.push(`  • ${text}`)
      }
    }

    if (slide.tables.length > 0) {
      for (const table of slide.tables) {
        lines.push("")
        lines.push("Table:")
        for (const row of table.rows) {
          lines.push(`  | ${row.join(" | ")} |`)
        }
      }
    }

    if (slide.notes) {
      lines.push("")
      lines.push(`Notes: ${slide.notes}`)
    }

    lines.push("")
  }

  return lines.join("\n")
}

// Convert parsed PPTX to structured JSON for AI processing
export function pptxToStructuredJSON(doc: PPTXDocument): object {
  return {
    metadata: doc.metadata,
    slides: doc.slides.map((slide) => ({
      slideNumber: slide.slideNumber,
      title: slide.title,
      subtitle: slide.subtitle,
      content: slide.bodyText,
      tables: slide.tables,
      notes: slide.notes,
    })),
  }
}
