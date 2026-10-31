"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa/register";

/** Registers the service worker once on mount; renders nothing. */
export function PwaRegister() {
  useEffect(() => {
    void registerServiceWorker({ nodeEnv: process.env.NODE_ENV, nav: navigator });
  }, []);
  return null;
}
