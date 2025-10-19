import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // Find person with photo
    const person = await db.user.findUnique({
      where: { id },
      include: {
        photo: true
      }
    })

    if (!person || !person.photo) {
      return new NextResponse('Photo not found', { status: 404 })
    }

    // Convert base64 to buffer
    const imageData = person.photo.data
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Return image with proper headers (let Next.js handle Content-Length)
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': person.photo.mimeType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    })
  } catch (error) {
    console.error('Error serving avatar photo:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}