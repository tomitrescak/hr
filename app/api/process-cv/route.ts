import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Parse the multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type - only PDF allowed
    const allowedTypes = ['application/pdf']
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload PDF files only.' 
      }, { status: 400 })
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 })
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    console.log('Uploading file to OpenAI...')
    // Step 1: Upload the file to OpenAI
    const uploadedFile = await openai.files.create({
      file: new File([buffer], file.name, { type: file.type }),
      purpose: 'user_data'
    })
    console.log('File uploaded successfully:', uploadedFile.id)

    // Step 2: Use the file content with vision model for document processing
    console.log('Processing CV...')
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: `You are a CV/Resume processing assistant. Please extract and convert this document into clean, well-formatted markdown text.

Instructions:
1. Extract ALL relevant information from the CV/Resume document
2. Structure it as clean markdown with appropriate headers
3. Include sections like: Personal Info, Summary/Objective, Experience, Education, Skills, etc.
4. Preserve all important details while making it readable
5. Use proper markdown formatting (headers, lists, bold text, etc.)
6. Do not add any commentary or analysis - just convert to markdown format

Return ONLY the markdown content, no additional text or explanations.`
            },
            { 
              type: 'file',
              file: {
                file_id: uploadedFile.id
              }
            }
          ]
        }
      ],
      //max_tokens: 4000,
      // temperature: 0.1
    })

    const markdownContent = response.choices[0]?.message?.content || 'Failed to process CV content'
    console.log('CV processing completed')

    // Clean up the uploaded file
    try {
      await openai.files.delete(uploadedFile.id)
      console.log('Uploaded file cleaned up')
    } catch (cleanupError) {
      console.warn('Failed to cleanup uploaded file:', cleanupError)
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      content: markdownContent
    })

  } catch (error: any) {
    console.error('CV processing error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to process CV file' 
    }, { status: 500 })
  }
}