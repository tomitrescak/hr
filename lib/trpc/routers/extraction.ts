import { z } from 'zod'
import { router, protectedProcedure, pmProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import OpenAI from 'openai'

export const extractionRouter = router({
  // Generic competency extraction endpoint
  extractCompetencies: pmProcedure
    .input(
      z.object({
        content: z.string().min(10, 'Content must be at least 10 characters'),
        contextMessage: z.string().optional(),
        entityName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!process.env.OPENAI_API_KEY) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'OpenAI API key not configured',
        })
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })

      const competencySchema = {
        type: "object",
        properties: {
          competencies: {
            type: "array",
            description: "Array of extracted competencies from the provided content",
            minItems: 5,
            maxItems: 20,
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "The name of the competency - be specific and actionable"
                },
                type: {
                  type: "string",
                  enum: ["KNOWLEDGE", "SKILL", "TECH_TOOL", "ABILITY", "VALUE", "BEHAVIOUR", "ENABLER"],
                  description: "Competency type: KNOWLEDGE (theoretical understanding), SKILL (practical abilities), TECH_TOOL (technologies/software), ABILITY (general capabilities), VALUE (principles/beliefs), BEHAVIOUR (soft skills), ENABLER (supporting capabilities)"
                },
                description: {
                  type: "string",
                  description: "Brief but clear description of what this competency entails and why it's relevant to the content"
                },
                suggestedProficiency: {
                  type: "string",
                  enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"],
                  description: "Proficiency level based on content evidence: BEGINNER (mentioned/basic), INTERMEDIATE (demonstrated use), ADVANCED (proven expertise), EXPERT (leadership/mastery)"
                }
              },
              required: ["name", "type", "description", "suggestedProficiency"],
              additionalProperties: false
            }
          }
        },
        required: ["competencies"],
        additionalProperties: false
      }

      const basePrompt = `Analyze the following content and extract competencies.

Content:
${input.content}

${input.contextMessage || ''}

Extract 5-20 relevant competencies, focusing on:
- Specific skills, technologies, and tools mentioned
- Professional abilities demonstrated through the content
- Knowledge areas evident from the information
- Soft skills and behaviors shown
- Suggest realistic proficiency levels based on evidence depth`

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: basePrompt,
          }],
          temperature: 0.3,
          max_tokens: 2500,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'competency_extraction',
              description: 'Extract competencies from content',
              schema: competencySchema,
              strict: true
            }
          }
        })

        const responseText = completion.choices[0]?.message?.content
        if (!responseText) {
          throw new Error('No response from OpenAI')
        }

        // Parse the structured JSON response
        let responseData
        try {
          responseData = JSON.parse(responseText)
        } catch (parseError) {
          console.error('Failed to parse OpenAI response:', parseError)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to parse competency extraction results',
          })
        }

        // Validate the response structure
        if (!responseData.competencies || !Array.isArray(responseData.competencies)) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Invalid response format from competency extraction',
          })
        }

        return {
          extractedCompetencies: responseData.competencies,
          entityName: input.entityName,
        }
      } catch (error: any) {
        console.error('OpenAI extraction error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to extract competencies',
        })
      }
    }),
})