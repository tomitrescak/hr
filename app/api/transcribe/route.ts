import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    console.log('Audio file details:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    })

    // Check if file size is reasonable (OpenAI has a 25MB limit)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 400 })
    }

    if (audioFile.size === 0) {
      return NextResponse.json({ error: 'Audio file is empty' }, { status: 400 })
    }

    // Create a proper filename with extension
    let filename = audioFile.name
    if (!filename.includes('.')) {
      // Add extension based on MIME type
      if (audioFile.type.includes('webm')) {
        filename += '.webm'
      } else if (audioFile.type.includes('mp4')) {
        filename += '.mp4'
      } else if (audioFile.type.includes('wav')) {
        filename += '.wav'
      } else {
        filename += '.webm' // Default fallback
      }
    }

    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    })

    console.log('Transcription successful, length:', response.text.length)
    return NextResponse.json({ text: response.text })
  } catch (error) {
    const errorDetails: any = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }
    
    if (error && typeof error === 'object' && 'response' in error && error.response) {
      errorDetails.status = (error.response as any).status
      errorDetails.data = (error.response as any).data
    }
    
    console.error('Transcription error details:', errorDetails)
    
    return NextResponse.json(
      { 
        error: 'Failed to transcribe audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
