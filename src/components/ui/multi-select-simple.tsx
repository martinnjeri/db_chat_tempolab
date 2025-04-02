"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface Option {
  label: string;
  value: string;
  disabled?: boolean;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    console.log("MultiSelect handleSelect called with value:", value);
    
    if (value === "all") {
      // If "All" is selected, toggle between all and none
      if (selected.includes("all")) {
        onChange([]);
      } else {
        onChange(["all"]);
      }
    } else {
      // If a specific item is selected
      if (selected.includes(value)) {
        // If already selected, remove it
        onChange(selected.filter((item) => item !== value));
      } else {
        // If not selected, add it
        const newSelected = [...selected, value];
        
        // If all individual items are selected, replace with "all"
        const nonAllOptions = options.filter(opt => opt.value !== "all" && !opt.disabled);
        if (newSelected.length === nonAllOptions.length) {
          onChange(["all"]);
        } else {
          // Remove "all" if it was previously selected
          const filteredSelected = newSelected.filter(item => item !== "all");
          onChange(filteredSelected);
        }
      }
    }
  };

  // Get labels for selected items
  const selectedLabels = selected.map(value => {
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  }).join(", ");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selected.length > 0 ? (
            <span className="truncate">{selectedLabels}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search options..." />
          <CommandEmpty>No options found.</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-auto">
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                onSelect={() => {
                  handleSelect(option.value);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-sm border",
                    selected.includes(option.value) ? "bg-primary border-primary" : "border-muted"
                  )}>
                    {selected.includes(option.value) && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  {option.label}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
