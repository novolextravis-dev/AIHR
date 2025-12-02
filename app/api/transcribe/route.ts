import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as Blob

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Get HF API key from environment
    const hfApiKey = process.env.HUGGINGFACE_API_KEY

    if (!hfApiKey) {
      return NextResponse.json({ error: "Hugging Face API key not configured" }, { status: 500 })
    }

    // Convert blob to array buffer for the API
    const audioBuffer = await audioFile.arrayBuffer()

    // Call Hugging Face Inference API with Whisper model
    const response = await fetch("https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfApiKey}`,
        "Content-Type": "audio/webm",
      },
      body: audioBuffer,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Hugging Face API error:", errorText)

      // Handle model loading state
      if (response.status === 503) {
        return NextResponse.json({ error: "Model is loading, please try again in a few seconds" }, { status: 503 })
      }

      return NextResponse.json({ error: "Failed to transcribe audio" }, { status: response.status })
    }

    const result = await response.json()

    // The API returns { text: "transcribed text" }
    return NextResponse.json({
      text: result.text || "",
      success: true,
    })
  } catch (error) {
    console.error("Transcription error:", error)
    return NextResponse.json({ error: "Failed to process audio" }, { status: 500 })
  }
}
