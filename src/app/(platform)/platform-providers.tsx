"use client";
import { SessionProvider } from "next-auth/react";

export function PlatformProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
