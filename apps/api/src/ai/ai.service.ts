import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface AIAnalysisResult {
  category: string;
  severity: 'Low' | 'Medium' | 'High';
  description: string;
  confidence: number;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not found. AI classification will use mock mode.');
    }
    
    // Check if it's an OpenRouter key (sk-or-v1-) and configure accordingly
    const isOpenRouter = apiKey?.startsWith('sk-or-v1-');
    this.openai = new OpenAI({ 
      apiKey,
      baseURL: isOpenRouter ? 'https://openrouter.ai/api/v1' : undefined,
    });
  }

  async classifyImage(imageUrl: string): Promise<AIAnalysisResult> {
    try {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!apiKey) {
        return this.mockClassification();
      }

      this.logger.log(`Classifying image: ${imageUrl}`);

      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert at identifying civic infrastructure issues. Analyze this image and classify it into ONE of these categories:
- Broken Road (potholes, cracks, damaged pavement)
- Garbage (trash piles, littering, waste management issues)
- Water Leak (broken pipes, water leaks, flooding)
- Electrical Issue (exposed wires, broken electrical equipment)
- Street Light (broken or non-functional street lights)
- Drainage (clogged drains, sewage issues, poor drainage)

Also determine the severity: Low, Medium, or High

Respond in this exact JSON format:
{
  "category": "category name",
  "severity": "Low|Medium|High",
  "description": "brief description of the issue",
  "confidence": 0.95
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                }
              }
            ]
          }
        ],
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        this.logger.error('No content in OpenAI response');
        return this.mockClassification();
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.error('Could not extract JSON from response');
        return this.mockClassification();
      }

      const result = JSON.parse(jsonMatch[0]) as AIAnalysisResult;
      this.logger.log(`AI Classification: ${JSON.stringify(result)}`);
      
      return result;
    } catch (error) {
      this.logger.error(`AI classification failed: ${error.message}`);
      return this.mockClassification();
    }
  }

  private mockClassification(): AIAnalysisResult {
    const categories = ['Broken Road', 'Garbage', 'Water Leak', 'Electrical Issue', 'Street Light', 'Drainage'];
    const severities: ('Low' | 'Medium' | 'High')[] = ['Low', 'Medium', 'High'];
    
    return {
      category: categories[Math.floor(Math.random() * categories.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      description: 'Mock AI analysis - configure OPENAI_API_KEY for real classification',
      confidence: 0.5,
    };
  }
}
