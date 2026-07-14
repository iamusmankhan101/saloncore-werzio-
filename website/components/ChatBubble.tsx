"use client";
import { useEffect } from "react";
import { Bubble } from "@typebot.io/react";

/**
 * Swaps Typebot's "Made with Typebot" watermark for our own logo. Typebot
 * renders it as `a.lite-badge` inside the open shadow root of the
 * <typebot-bubble> custom element — there's no official prop to hide it
 * (that's a paid-plan feature on their end), so this walks the shadow DOM
 * directly. It's watching an implementation detail, not a public API: if
 * Typebot changes that markup in a future release, this just quietly stops
 * matching and the original badge reappears — nothing breaks.
 */
function useReplaceTypebotBadge() {
  useEffect(() => {
    const trySwap = (root: ShadowRoot) => {
      const badge = root.querySelector<HTMLAnchorElement>("a.lite-badge");
      if (!badge || badge.dataset.scReplaced) return;
      badge.dataset.scReplaced = "true";
      badge.removeAttribute("href");
      badge.removeAttribute("target");
      badge.style.pointerEvents = "none";
      badge.innerHTML = "";

      const img = document.createElement("img");
      img.src = "/salon-central-logo.png";
      img.alt = "Salon Central";
      img.style.height = "14px";
      img.style.width = "auto";
      img.style.objectFit = "contain";

      const label = document.createElement("span");
      label.textContent = "Salon Central";
      label.style.fontSize = "12px";
      label.style.fontWeight = "600";

      badge.style.display = "inline-flex";
      badge.style.alignItems = "center";
      badge.style.gap = "6px";
      badge.append(img, label);
    };

    const observeHost = (host: Element) => {
      const root = (host as HTMLElement).shadowRoot;
      if (!root) return;
      trySwap(root);
      new MutationObserver(() => trySwap(root)).observe(root, { childList: true, subtree: true });
    };

    const existing = document.querySelector("typebot-bubble");
    if (existing) observeHost(existing);

    const bodyObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node instanceof Element && node.tagName.toLowerCase() === "typebot-bubble") {
            observeHost(node);
          }
        });
      }
    });
    bodyObserver.observe(document.body, { childList: true });

    return () => bodyObserver.disconnect();
  }, []);
}

export default function ChatBubble() {
  useReplaceTypebotBadge();
  return (
    <Bubble
      typebot="user-onboarding-46ov8w7"
      apiHost="https://typebot.io"
      theme={{ button: { backgroundColor: "#1D1D1D", iconColor: "#FFFFFF" } }}
    />
  );
}
