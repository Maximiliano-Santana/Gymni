import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Home() {
  return (
    <>
      <h1 className="text-primary text-6xl font-bold">
        Welcome to Gym&i
      </h1>
      <Button>
        Quiero una app!
      </Button>
    </>
  );
}
