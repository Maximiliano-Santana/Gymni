import db from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Handle GET requests
export async function GET(request: Request) {
    const users = await db.user.findMany();
    return NextResponse.json(users);
}

// Handle POST requests
export async function POST(request: Request) {
    const body = await request.json();
    
    return NextResponse.json({ message: 'Usuario creado', user: body });
}