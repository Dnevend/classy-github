import { ClassValue } from "class-variance-authority/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@classy/lib";

interface Props {
  canGoPrev: boolean;
  canGoNext: boolean;
  onNext: () => void;
  onPrev: () => void;
  className?: ClassValue;
}

export const Pagination = ({
  canGoNext,
  canGoPrev,
  onNext,
  onPrev,
  className,
}: Props) => {
  return (
    <div className={cn("flex items-center gap-2 w-fit", className)}>
      <Button variant="ghost" disabled={!canGoPrev} onClick={onPrev}>
        <ChevronLeft className="h-3.5 w-3.5" />
        Prev
      </Button>
      <Button variant="ghost" disabled={!canGoNext} onClick={onNext}>
        Next
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
