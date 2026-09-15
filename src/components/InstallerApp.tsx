"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type AvantInstall = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function dejaInstallee() {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function appareilApple() {
  const ua = window.navigator.userAgent;
  const iphone = /iPhone|iPad|iPod/i.test(ua);
  const ipadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iphone || ipadOs;
}

export function InstallerApp() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [promptEvent, setPromptEvent] = useState<AvantInstall | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }
    if (dejaInstallee() || window.localStorage.getItem("hcgf-pwa-hide") === "1") return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as AvantInstall);
      setIos(false);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    if (appareilApple()) {
      setIos(true);
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible) return null;

  async function installer() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choix = await promptEvent.userChoice;
    if (choix.outcome === "accepted") fermer();
  }

  function fermer() {
    setVisible(false);
    window.localStorage.setItem("hcgf-pwa-hide", "1");
  }

  return (
    <aside className="pwa-banner" role="dialog" aria-label="Installer l’application">
      <div>
        <p className="pwa-banner-kicker">Application mobile</p>
        <p className="pwa-banner-title">Ajouter HCGF à l’écran d’accueil</p>
        <p className="pwa-banner-text">
          {ios
            ? "iPhone / iPad : bouton Partager, puis « Sur l’écran d’accueil »."
            : "Android : installez l’app pour l’ouvrir hors du navigateur."}
        </p>
      </div>
      <div className="pwa-banner-actions">
        {ios ? (
          <span className="pwa-banner-ios">
            <Share size={16} />
            Partager → Accueil
          </span>
        ) : promptEvent ? (
          <button type="button" className="btn btn-primary" onClick={installer}>
            <Download size={16} />
            Installer
          </button>
        ) : (
          <span className="pwa-banner-ios">Menu Chrome → Installer</span>
        )}
        <button type="button" className="icon-btn" aria-label="Fermer" onClick={fermer}>
          <X size={16} />
        </button>
      </div>
    </aside>
  );
}
