"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { Check } from "lucide-react";
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
	badgeClassName?: string;
	disabled?: boolean;
}

export function MultiSelect({
	options,
	selected,
	onChange,
	placeholder = "Select options...",
	className,
	badgeClassName,
	disabled = false,
}: MultiSelectProps) {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [open, setOpen] = React.useState(false);
	const [inputValue, setInputValue] = React.useState("");

	const handleUnselect = React.useCallback(
		(value: string) => {
			if (value === "all") {
				// If "all" is unselected, clear all selections
				onChange([]);
			} else {
				// If a specific item is unselected, just remove it
				onChange(selected.filter((item) => item !== value));
			}
		},
		[onChange, selected]
	);

	const handleKeyDown = React.useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			const input = inputRef.current;
			if (input) {
				if (e.key === "Delete" || e.key === "Backspace") {
					if (input.value === "") {
						const newSelected = [...selected];
						newSelected.pop();
						onChange(newSelected);
					}
				}
				// This is not a default behavior of the <input /> field
				if (e.key === "Escape") {
					input.blur();
				}
			}
		},
		[onChange, selected]
	);

	// Always include the "all" option if it exists
	const selectables = options.filter(
		(option) =>
			(!selected.includes(option.value) && !option.disabled) ||
			option.value === "all"
	);

	return (
		<Command
			onKeyDown={handleKeyDown}
			className={cn("overflow-visible bg-transparent", className)}>
			<div
				className={cn(
					"group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
					disabled && "cursor-not-allowed opacity-50"
				)}>
				<div className="flex flex-wrap gap-1">
					{selected.map((value) => {
						const option = options.find(
							(option) => option.value === value
						);
						return (
							<Badge
								key={value}
								className={cn(
									"data-[disabled]:bg-muted-foreground data-[disabled]:text-muted data-[disabled]:hover:bg-muted-foreground",
									badgeClassName
								)}
								data-disabled={disabled}>
								{option?.label}
								{!disabled && (
									<button
										className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												handleUnselect(value);
											}
										}}
										onMouseDown={(e) => {
											e.preventDefault();
											e.stopPropagation();
										}}
										onClick={() => handleUnselect(value)}>
										<X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
									</button>
								)}
							</Badge>
						);
					})}
					<CommandPrimitive.Input
						ref={inputRef}
						value={inputValue}
						onValueChange={setInputValue}
						onBlur={() => setOpen(false)}
						onFocus={() => setOpen(true)}
						placeholder={
							selected.length === 0 ? placeholder : undefined
						}
						disabled={disabled}
						className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
					/>
				</div>
			</div>
			<div className="relative">
				{open && selectables.length > 0 ? (
					<div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
						<CommandGroup className="h-full overflow-auto max-h-[200px]">
							{selectables.map((option) => {
								return (
									<CommandItem
										key={option.value}
										onMouseDown={(e) => {
											e.preventDefault();
											e.stopPropagation();
										}}
										onSelect={() => {
											setInputValue("");
											if (option.value === "all") {
												// If "all" is selected, toggle between all options and none
												if (
													selected.includes("all") ||
													selected.length ===
														options.filter(
															(opt) =>
																opt.value !==
																"all"
														).length
												) {
													onChange([]);
												} else {
													onChange(["all"]);
												}
											} else {
												// If a specific item is selected
												const newSelected = [
													...selected,
													option.value,
												];

												// If all individual items are selected, replace with "all"
												const nonAllOptions =
													options.filter(
														(opt) =>
															opt.value !==
																"all" &&
															!opt.disabled
													);
												if (
													newSelected.length ===
													nonAllOptions.length
												) {
													onChange(["all"]);
												} else {
													// Remove "all" if it was previously selected
													const filteredSelected =
														newSelected.filter(
															(item) =>
																item !== "all"
														);
													onChange(filteredSelected);
												}
											}
										}}
										className={"cursor-pointer"}>
										{option.label}
									</CommandItem>
								);
							})}
						</CommandGroup>
					</div>
				) : null}
			</div>
		</Command>
	);
}
