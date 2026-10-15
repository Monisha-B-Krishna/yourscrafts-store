"use client";

import { useState } from "react";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SearchBox } from "./search-box";

/** Search icon for phones and tablets that opens a full-width search panel. */
export function MobileSearch() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-lg" className="size-10 rounded-full sm:size-11 lg:hidden" />}
        aria-label="Search"
      >
        <SearchIcon className="size-[22px]" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="top" className="max-h-dvh bg-cream px-4 pt-14 pb-6 sm:px-6">
        <SheetTitle className="sr-only">Search the shop</SheetTitle>
        <SearchBox variant="panel" autoFocus onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
