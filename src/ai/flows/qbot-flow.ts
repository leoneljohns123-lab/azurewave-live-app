
'use server';
/**
 * @fileOverview A Qbot AI agent for the chat that generates quiz questions.
 *
 * - askQbotQuizQuestion - A function that generates a quiz question using an AI model.
 * - QbotQuizQuestion - The output type for the askQbotQuizQuestion function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const QbotQuizQuestionSchema = z.object({
  question: z.string().describe('A unique and interesting trivia question.'),
  correctAnswer: z.string().describe('The correct answer to the question. If there are multiple correct answers, separate them with a | character.'),
  category: z.string().describe('The category of the trivia question (e.g., "History", "Science", "Movies").'),
  hint: z.string().describe('A clever hint for the question, but not too obvious.'),
  wordCount: z.number().describe('The number of words in the correct answer.'),
});
export type QbotQuizQuestion = z.infer<typeof QbotQuizQuestionSchema>;

export async function askQbotQuizQuestion(): Promise<QbotQuizQuestion> {
  return qbotFlow();
}

const qbotPrompt = ai.definePrompt({
  name: 'qbotQuizPrompt',
  output: { schema: QbotQuizQuestionSchema },
  prompt: `You are Qbot, an AI quizmaster. Generate a single, unique, and interesting trivia question suitable for a general audience.
  
  Your response should be quick and short.
  The question and hint should be very short and concise.

  Ensure the question is not too easy or too obscure.
  Provide a category for the question (e.g., "History", "Science", "Movies", "General Knowledge").
  Provide a short, clever hint that helps but doesn't give away the answer immediately.
  Provide the correct answer. If there are multiple possible correct answers, separate them with a pipe character (|).
  Provide the number of words in the correct answer.
  
  Do not repeat questions you have generated before.
  
  Generate the quiz question now.`,
});

const qbotFlow = ai.defineFlow(
  {
    name: 'qbotFlow',
    inputSchema: z.void(),
    outputSchema: QbotQuizQuestionSchema,
  },
  async () => {
    const { output } = await qbotPrompt();
    if (!output) {
      throw new Error("Qbot failed to generate a quiz question.");
    }
    
    let parsedOutput: QbotQuizQuestion;
    // Handle cases where the model returns a string instead of an object
    const rawOutput = output as any;
    if (typeof rawOutput === 'string') {
        const cleaned = rawOutput.replace(/^```json\n?/, '').replace(/```$/, '');
        try {
            parsedOutput = JSON.parse(cleaned);
        } catch (e) {
            console.error("Failed to parse Qbot output:", e);
            throw new Error("Qbot returned invalid JSON.");
        }
    } else {
        parsedOutput = rawOutput;
    }
    
    // Ensure wordCount is present if not provided by the model
    if (parsedOutput.correctAnswer && !parsedOutput.wordCount) {
        const primaryAnswer = parsedOutput.correctAnswer.split('|')[0].trim();
        parsedOutput.wordCount = primaryAnswer.split(/\s+/).length;
    }

    return parsedOutput;
  }
);
