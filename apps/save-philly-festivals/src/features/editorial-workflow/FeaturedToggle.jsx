"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FeaturedToggle({ festivalId, featured: initial }) {
  const [featured, setFeatured] = useState(Boolean(initial));
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      const res = await fetch("/api/festivals/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: festivalId, featured: !featured }),
      });
      if (!res.ok) throw new Error("Failed to update featured status");
      setFeatured((value) => !value);
    } catch {
      // Surface silently; the button just snaps back on the next render.
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      disabled={pending}
      aria-pressed={featured}
      aria-label={featured ? "Remove from featured" : "Feature this festival"}
      title={featured ? "Remove from featured" : "Feature this festival"}
      className={featured ? "text-amber-500 hover:text-amber-600" : "text-slate-300 hover:text-amber-500"}
    >
      <Star className="size-4 fill-current" />
    </Button>
  );
}
