'use server';

import * as fs from 'fs/promises';
import * as path from 'path';

export type QuizType = 'trivia' | 'scramble';

export type QuizQuestion = {
    question: string;
    correctAnswer: string;
    wordCount: number;
    hint: string;
    quizType: QuizType;
    quizId?: string;
};

export type GetQuizQuestionsOutput = QuizQuestion[];

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

export async function getQuizQuestions(): Promise<GetQuizQuestionsOutput> {
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
        throw new Error("No quiz questions found in public/quiz.txt.");
    }
    
    const questions: QuizQuestion[] = lines.map(line => {
        const parts = line.split('*');
        if (parts.length < 2) return null;

        let question = parts.shift()!.trim();
        const answers = parts.map(p => p.trim()).filter(Boolean);

        if (answers.length === 0) return null;

        const primaryAnswer = answers[0];
        let quizType: 'trivia' | 'scramble' = 'trivia';

        if (Math.random() < 0.3 && !primaryAnswer.includes(' ') && primaryAnswer.length > 2 && primaryAnswer.length <= 10) {
            quizType = 'scramble';
            question = scrambleWord(primaryAnswer);
        }
        
        const wordCount = primaryAnswer.trim().split(/\s+/).length;

        let hint = '';
        const answerForHint = primaryAnswer.replace(/\s+/g, ' ');
        if (answerForHint.length > 2) {
            const letters = answerForHint.split('');
            const revealedIndices = new Set<number>();
            revealedIndices.add(0);

            const revealCount = Math.max(1, Math.floor(letters.length / 3));

            while (revealedIndices.size < revealCount && revealedIndices.size < letters.length) {
                const randomIndex = Math.floor(Math.random() * letters.length);
                if (letters[randomIndex] !== ' ') {
                    revealedIndices.add(randomIndex);
                }
            }

            hint = letters.map((char, index) => {
                if (char === ' ') return '   ';
                return revealedIndices.has(index) ? char : '_';
            }).join(' ');
        } else {
            hint = answerForHint.split('').map(() => '_').join(' ');
        }
    
        return {
            question,
            correctAnswer: answers.join('|'),
            wordCount,
            hint,
            quizType,
        };
    }).filter((q): q is QuizQuestion => q !== null);

    // Shuffle the questions
    for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    return questions;
}
