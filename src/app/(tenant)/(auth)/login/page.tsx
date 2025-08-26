import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function LoginPage() {

  //
  return <>
    <h1 className="text-[var(--color-primary)]">Bienvenido a {tenant.name}</h1>
  </>
}
