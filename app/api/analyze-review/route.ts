import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // Define the JSON schema for structured output
    const responseSchema = {
      type: 'object',
      properties: {
        notes: {
          type: 'string',
          description: 'A comprehensive summary of the main discussion points, key takeaways, decisions made, and overall meeting outcomes. This should capture the essence of the conversation and provide context for future reference.'
        },
        competencies: {
          type: 'string', 
          description: 'A comma-separated list of skills, technologies, tools, frameworks, methodologies, or professional competencies that were discussed, mentioned, or are relevant to the person\'s role and development. Include both technical and soft skills.'
        },
        positive: {
          type: 'string',
          description: 'Positive feedback, achievements, accomplishments, strengths, successful outcomes, praise, or areas where the person is excelling. Focus on what is going well and should be celebrated or continued.'
        },
        negative: {
          type: 'string', 
          description: 'Areas for improvement, challenges faced, concerns raised, constructive feedback, obstacles, or issues that need to be addressed. Focus on growth opportunities and areas that require attention or development.'
        },
        tasks: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'An array of specific, actionable items, follow-up tasks, commitments, or next steps that were agreed upon during the meeting. Each task should be clear and actionable.'
        }
      },
      required: ['notes', 'competencies', 'positive', 'negative', 'tasks'],
      additionalProperties: false
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: 'You are an expert HR analyst who specializes in extracting structured information from 1:1 meeting transcripts. Your role is to analyze conversations between managers and team members to identify key insights, action items, and development opportunities. Always provide comprehensive yet concise analysis.'
        },
        {
          role: 'user',
          content: `Please analyze the following 1:1 meeting transcript and extract structured information according to the provided schema:

${text}

Focus on:
- Main discussion points and decisions
- Skills and competencies mentioned or relevant
- Positive feedback and achievements
- Areas for improvement and challenges
- Specific action items and next steps`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'meeting_analysis',
          schema: responseSchema,
          strict: true
        }
      },
      // temperature: 0.2,
      // max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content returned from OpenAI')
    }

    const analyzedData = JSON.parse(content)
    return NextResponse.json(analyzedData)
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze transcript' },
      { status: 500 }
    )
  }
}