
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from '@/components/ui/button';

export default async function LoginPage() {

  //
  return <>
          <div className="flex justify-center items-center flex-col">
        <div className="w-46 flex flex-col items-center gap-8">
          <h1 className="text-primary bg-accent w-full text-center">Hello Prisma</h1>
          <Button>Clickeable</Button>
        </div>
      </div>
  </>
}
