"use client";

import { Check, Download, Share } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { BeforeInstallPromptEvent } from "@/components/pwa-lifecycle";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const initialStateTimer = window.setTimeout(() => {
      setInstalled(isStandalone());
      setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    }, 0);

    const handlePrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.clearTimeout(initialStateTimer);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  }

  if (installed) {
    return (
      <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-semibold text-primary">
        <Check aria-hidden="true" className="size-4" /> App installed
      </span>
    );
  }

  if (promptEvent) {
    return (
      <Button type="button" variant="outline" onClick={install} className="w-full sm:w-auto">
        <Download aria-hidden="true" /> Install app
      </Button>
    );
  }

  if (isIos) {
    return (
      <p className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Share aria-hidden="true" className="size-4 text-primary" /> Use Share, then Add to Home Screen
      </p>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Install from your browser menu for quick home-screen access.
    </p>
  );
}
