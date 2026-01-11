"use client";

import { UserProvider } from "@/contexts/UserContext";
import { ReactNode, useEffect } from "react";
import { registerServiceWorker } from "@/lib/register-sw";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return <UserProvider>{children}</UserProvider>;
}
