"use client";

import { useEffect } from "react";

/**
 * Marks the page once React has hydrated it (data-hydrated on <html>). Until then a click on a link
 * is a full page load and a choice made in a select can be undone by hydration, so the end-to-end
 * tests wait for this mark after every full page load before they interact.
 */
export function HydrationMark() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);
  return null;
}
