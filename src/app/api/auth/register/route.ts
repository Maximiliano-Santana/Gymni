import { RegisterDTO, RegisterSchema } from "@/features/auth/types/forms";
import db from "@/lib/prisma";
import { validateRequest } from "@/app/api/lib/validation";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  //Validación de datos
  const reqBody: RegisterDTO = await request.json();
  const validation = validateRequest(RegisterSchema, reqBody)
  if(!validation.success){
    return NextResponse.json({ message: validation.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Saved" }, { status: 200 });
}
