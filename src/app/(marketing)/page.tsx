import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1 className="text-primary text-6xl font-bold">Welcome to Gym&i</h1>
      <Button asChild>
        <Link href="/login">Quiero una app!</Link>
      </Button>
    </>
  );
}
