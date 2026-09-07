
'use server';
/**
 * @fileOverview A quizbot AI agent for the chat.
 *
 * - askQuizbot - A function that handles generating quiz questions.
 * - QuizbotInput - The input type for the askQuizbot function.
 * - QuizbotOutput - The return type for the askQuizbot function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as fs from 'fs/promises';
import * as path from 'path';

const QuizbotInputSchema = z.object({});
export type QuizbotInput = z.infer<typeof QuizbotInputSchema>;

const QuizbotOutputSchema = z.object({
    question: z.string().describe("The trivia question or scrambled word."),
    correctAnswer: z.string().describe("The correct answer. Multiple answers are separated by |"),
    wordCount: z.number().describe("The number of words in the answer."),
    hint: z.string().describe("A hint for the answer."),
    quizType: z.enum(['trivia', 'scramble']),
});
export type QuizbotOutput = z.infer<typeof QuizbotOutputSchema>;

export async function askQuizbot(input: QuizbotInput): Promise<QuizbotOutput> {
  return quizbotFlow(input);
}

function scrambleWord(word: string): string {
    if (word.length < 2) return word;

    const uniqueChars = new Set(word.split(''));
    if (uniqueChars.size === 1 && word.length > 1) {
        return word;
    }

    const characters = word.split('');
    let scrambledWord: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
        for (let i = characters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [characters[i], characters[j]] = [characters[j], characters[i]];
        }
        scrambledWord = characters.join('');
        attempts++;
    } while (scrambledWord === word && attempts < maxAttempts);
    
    return scrambledWord;
}

const quizbotFlow = ai.defineFlow(
  {
    name: 'quizbotFlow',
    inputSchema: QuizbotInputSchema,
    outputSchema: QuizbotOutputSchema,
  },
  async (input) => {
    
    const filePath = path.join(process.cwd(), 'public', 'quiz.txt');
    let fileContent;
    try {
        fileContent = await fs.readFile(filePath, 'utf-8');
    } catch (error) {
        console.error("Error reading quiz file:", error);
        throw new Error("Could not read quiz file from public/quiz.txt. Please ensure the file exists.");
    }

    const lines = fileContent.split('\n').filter(line => line.trim() !== '');

    if (lines.length === 0) {
        throw new Error("No quiz questions found in public/quiz.txt. The file is empty.");
    }

    // Select a random question
    const randomIndex = Math.floor(Math.random() * lines.length);
    const randomLine = lines[randomIndex];
    
    const parts = randomLine.split('*');

    if (parts.length < 2) {
        console.error("Invalid question format in public/quiz.txt:", randomLine);
        throw new Error("A question in the quiz file has an invalid format. Expected format: 'question*answer'");
    }
    
    let question = parts.shift()!.trim();
    const answers = parts.map(p => p.trim()).filter(Boolean);

    if (answers.length === 0) {
        console.error("Invalid question format, no answer found for:", randomLine);
        throw new Error("A question in the quiz file has an invalid format. Expected format: 'question*answer'");
    }

    const primaryAnswer = answers[0];
    let quizType: 'trivia' | 'scramble' = 'trivia';

    // 30% chance to make it a scramble if answer is a single word with no spaces and is short enough
    if (Math.random() < 0.3 && !primaryAnswer.includes(' ') && primaryAnswer.length > 2 && primaryAnswer.length <= 10) {
        quizType = 'scramble';
        question = scrambleWord(primaryAnswer); // The scrambled word is the question now
    }
    
    const wordCount = primaryAnswer.trim().split(/\s+/).length;

    // Generate hint
    let hint = '';
    const answerForHint = primaryAnswer.replace(/\s+/g, ' '); // Normalize spaces for hint generation
    if (answerForHint.length > 2) {
        const letters = answerForHint.split('');
        const revealedIndices = new Set<number>();
        revealedIndices.add(0);

        // Determine number of letters to reveal, at least 1/3, but not all
        const revealCount = Math.max(1, Math.floor(letters.length / 3));

        while (revealedIndices.size < revealCount && revealedIndices.size < letters.length) {
            const randomIndex = Math.floor(Math.random() * letters.length);
            if (letters[randomIndex] !== ' ') {
                revealedIndices.add(randomIndex);
            }
        }

        hint = letters.map((char, index) => {
            if (char === ' ') return '   '; // Represent space in hint clearly
            return revealedIndices.has(index) ? char : '_';
        }).join(' ');

    } else {
        hint = answerForHint.split('').map(() => '_').join(' ');
    }
    
    return {
        question: question,
        correctAnswer: answers.join('|'),
        wordCount: wordCount,
        hint: hint,
        quizType: quizType,
    };
  }
);
