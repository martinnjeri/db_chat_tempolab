"use client";

import * as React from "react";
import { X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

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
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [open, setOpen] = React.useState(false);
	const [inputValue, setInputValue] = React.useState("");

	const handleUnselect = (value: string) => {
		if (value === "all") {
			// If "all" is unselected, clear all selections
			onChange([]);
		} else {
			// If a specific item is unselected, just remove it
			onChange(selected.filter((item) => item !== value));
		}
	};

	const handleSelect = (value: string) => {
		console.log("MultiSelect handleSelect called with value:", value);
		console.log("Current selected values:", selected);
		console.log("Available options:", options);

		if (value === "all") {
			// If "All" is selected, toggle between all and none
			if (
				selected.includes("all") ||
				selected.length === options.length - 1
			) {
				console.log("Selecting none");
				onChange([]);
			} else {
				console.log("Selecting all");
				onChange(["all"]);
			}
		} else {
			// If a specific item is selected
			if (selected.includes(value)) {
				// If already selected, remove it
				console.log("Removing selected item");
				handleUnselect(value);
			} else {
				// If not selected, add it
				console.log("Adding new item");
				const newSelected = [...selected, value];

				// If all individual items are selected, replace with "all"
				if (
					newSelected.length === options.length - 1 &&
					!newSelected.includes("all")
				) {
					console.log("All items selected, using 'all' shortcut");
					onChange(["all"]);
				} else {
					// Remove "all" if it was previously selected
					const filteredSelected = newSelected.filter(
						(item) => item !== "all"
					);
					console.log(
						"Setting filtered selection:",
						filteredSelected
					);
					onChange(filteredSelected);
				}
			}
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		const input = inputRef.current;
		if (input) {
			if (e.key === "Delete" || e.key === "Backspace") {
				if (input.value === "" && selected.length > 0) {
					const lastSelected = selected[selected.length - 1];
					handleUnselect(lastSelected);
				}
			}
			// This is not a default behavior of the input element
			if (e.key === "Escape") {
				input.blur();
			}
		}
	};

	const selectables = options.filter(
		(option) => !selected.includes(option.value) || option.value === "all"
	);

	return (
		<Command
			onKeyDown={handleKeyDown}
			className={cn("overflow-visible bg-transparent", className)}>
			<div
				className={cn(
					"group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
					disabled && "opacity-50 pointer-events-none"
				)}>
				<div className="flex gap-1 flex-wrap">
					{selected.map((value) => {
						const option = options.find(
							(opt) => opt.value === value
						);
						if (!option) return null;

						return (
							<Badge
								key={value}
								variant="secondary"
								className="rounded-sm px-1 font-normal">
								{option.label}
								<button
									type="button"
									className="ml-1 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
									onClick={() => handleUnselect(value)}>
									<X className="h-3 w-3" />
									<span className="sr-only">
										Remove {option.label}
									</span>
								</button>
							</Badge>
						);
					})}
					<CommandPrimitive.Input
						ref={inputRef}
						value={inputValue}
						onValueChange={setInputValue}
						onBlur={() => setOpen(false)}
						onFocus={() => setOpen(true)}
						placeholder={selected.length === 0 ? placeholder : ""}
						disabled={disabled}
						className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
					/>
				</div>
			</div>
			<div className="relative">
				{open && selectables.length > 0 && (
					<div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
						<CommandGroup className="h-full overflow-auto max-h-[200px]">
							{selectables.map((option) => {
								const isSelected = selected.includes(
									option.value
								);
								return (
									<CommandItem
										key={option.value}
										onSelect={() => {
											console.log(
												"CommandItem onSelect triggered for:",
												option.value
											);
											handleSelect(option.value);
										}}
										className="flex items-center gap-2 cursor-pointer">
										<div
											className={cn(
												"border mr-2 flex h-4 w-4 items-center justify-center rounded-sm",
												isSelected
													? "bg-primary border-primary text-primary-foreground"
													: "opacity-50 border-muted-foreground"
											)}>
											{isSelected && (
												<Check className="h-3 w-3" />
											)}
										</div>
										{option.label}
									</CommandItem>
								);
							})}
						</CommandGroup>
					</div>
				)}
			</div>
		</Command>
	);
}
