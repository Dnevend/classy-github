import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, getCurrentTheme } from "@classy/lib";
import { Theme, themeDomains } from "@classy/shared";
import { ClassValue } from "class-variance-authority/types";

export const ThemeSelect = ({
  onSelectChange,
  className,
}: {
  onSelectChange?: (theme: Theme) => void;
  className?: ClassValue;
}) => {
  return (
    <Select
      defaultValue={getCurrentTheme()}
      onValueChange={(v: Theme) => onSelectChange?.(v)}
    >
      <SelectTrigger className={cn("w-[180px]", className)}>
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(themeDomains).map(([theme]) => (
          <SelectItem key={theme} value={theme}>
            {theme}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
