import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return NextResponse.json({ success: false, message: 'The quiz cron job has been disabled.' }, { status: 404 });
}
