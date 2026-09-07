import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, addDoc, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { getQuizQuestions } from '@/ai/flows/get-quiz-questions-flow';

export const maxDuration = 60; // 1 minute execution limit for Vercel

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function initializeFirebase() {
    if (!getApps().length) {
        return initializeApp(firebaseConfig);
    }
    return getApp();
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.warn('Unauthorized cron attempt');
    }

    const app = initializeFirebase();
    const db = getFirestore(app);

    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('id', '==', 'quizbot'), where('role', '==', 'Bot'), where('isEnabled', '==', true));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return NextResponse.json({ success: true, message: 'Quizbot is not active or enabled.' });
        }

        const quizbot = querySnapshot.docs[0].data();
        if (!quizbot.assignedRoomId) {
             return NextResponse.json({ success: true, message: 'Quizbot has no assigned room.' });
        }

        await handleQuizbotCycle(db, quizbot.assignedRoomId);

        return NextResponse.json({ success: true, message: 'Quizbot cycle processed.' });
    } catch (error: any) {
        console.error('Quiz cron error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

async function handleQuizbotCycle(db: any, roomId: string) {
    const sessionRef = doc(db, 'quiz_sessions', roomId);
    let sessionSnap = await getDoc(sessionRef);
    let session: any;

    if (!sessionSnap.exists()) {
        const questions = await getQuizQuestions();
        session = {
            roomId,
            currentIndex: 0,
            questions: questions.slice(0, 50),
            lastActionTime: new Date().toISOString()
        };
        await setDoc(sessionRef, session);
    } else {
        session = sessionSnap.data();
    }

    if (session.currentIndex >= session.questions.length) {
        const questions = await getQuizQuestions();
        session.currentIndex = 0;
        session.questions = questions.slice(0, 50);
    }

    const questionData = session.questions[session.currentIndex];
    const quizId = new Date().toISOString();
    const messagesRef = collection(db, 'squares', roomId, 'messages');

    // Post Question
    await addDoc(messagesRef, {
        squareId: roomId,
        senderId: 'quizbot',
        content: questionData.question,
        timestamp: quizId,
        messageType: 'quiz_question',
        quiz: { ...questionData, quizId: quizId }
    });

    await sleep(20000); // 20 seconds for hint

    if (await checkWinner(db, roomId, quizId)) {
        await advanceQuizSession(sessionRef, session);
        return;
    }

    // Post Hint
    await addDoc(messagesRef, {
        squareId: roomId,
        senderId: 'quizbot',
        content: 'Hint: ' + questionData.hint,
        timestamp: new Date().toISOString(),
        messageType: 'quiz_hint',
        quiz: { hint: questionData.hint, quizId: quizId }
    });

    await sleep(35000); // Wait until ~60s total

    if (await checkWinner(db, roomId, quizId)) {
        await advanceQuizSession(sessionRef, session);
        return;
    }

    // Post Answer
    const primaryAnswer = questionData.correctAnswer.split('|')[0];
    await addDoc(messagesRef, {
        squareId: roomId,
        senderId: 'quizbot',
        content: `Time's up! The correct answer was: ${primaryAnswer}`,
        timestamp: new Date().toISOString(),
        messageType: 'quiz_answer',
        quiz: { correctAnswer: primaryAnswer, quizId: quizId }
    });

    await advanceQuizSession(sessionRef, session);
}

async function checkWinner(db: any, roomId: string, quizId: string) {
    const messagesRef = collection(db, 'squares', roomId, 'messages');
    const q = query(messagesRef, where('quiz.quizId', '==', quizId), where('messageType', '==', 'quiz_winner'));
    const winnerSnapshot = await getDocs(q);
    return !winnerSnapshot.empty;
}

async function advanceQuizSession(sessionRef: any, session: any) {
    await updateDoc(sessionRef, {
        currentIndex: session.currentIndex + 1,
        lastActionTime: new Date().toISOString()
    });
}
