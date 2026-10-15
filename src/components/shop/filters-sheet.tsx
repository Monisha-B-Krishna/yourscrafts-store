"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/** Mobile/tablet wrapper that shows the filter form in a slide-in panel. */
export function FiltersSheet({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" className="h-11 rounded-full border-input bg-white px-4 text-sm lg:hidden" />
        }
      >
        <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto bg-cream p-6">
        <SheetTitle className="mb-2 font-serif text-2xl">Filters</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
