"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Option {
	label: string;
	value: string;
	disabled?: boolean;
}

interface CheckboxSelectProps {
	options: Option[];
	selected: string[];
	onChange: (selected: string[]) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

export function CheckboxSelect({
	options,
	selected,
	onChange,
	placeholder = "Select options...",
	className,
	disabled = false,
}: CheckboxSelectProps) {
	const [open, setOpen] = React.useState(false);
	const [searchQuery, setSearchQuery] = React.useState("");

	const handleSelect = (value: string, checked: boolean) => {
		console.log(
			"CheckboxSelect handleSelect called with value:",
			value,
			"checked:",
			checked
		);

		if (value === "all") {
			// If "All" is selected
			if (checked) {
				onChange(["all"]);
			} else {
				onChange([]);
			}
		} else {
			if (checked) {
				// Add to selection
				const newSelected = [
					...selected.filter((item) => item !== "all"),
					value,
				];

				// If all individual items are selected, replace with "all"
				const nonAllOptions = options.filter(
					(opt) => opt.value !== "all" && !opt.disabled
				);
				if (newSelected.length === nonAllOptions.length) {
					onChange(["all"]);
				} else {
					onChange(newSelected);
				}
			} else {
				// Remove from selection
				const newSelected = selected.filter(
					(item) => item !== value && item !== "all"
				);
				onChange(newSelected);
			}
		}
	};

	// Get labels for selected items
	const selectedLabels = selected
		.map((value) => {
			if (value === "all") return "All";
			const option = options.find((opt) => opt.value === value);
			return option ? option.label : value;
		})
		.join(", ");

	// Filter options based on search query
	const filteredOptions = options.filter((option) =>
		option.label.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn("w-full justify-between", className)}
					disabled={disabled}
					onClick={() => setOpen(!open)}>
					{selected.length > 0 ? (
						<span className="truncate">{selectedLabels}</span>
					) : (
						<span className="text-muted-foreground">
							{placeholder}
						</span>
					)}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-full p-0" align="start">
				<div className="p-2">
					<Input
						placeholder="Search options..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="mb-2"
					/>
					<ScrollArea className="h-[200px]">
						<div className="space-y-2 p-2">
							{filteredOptions.map((option) => (
								<div
									key={option.value}
									className="flex items-center space-x-2">
									<Checkbox
										id={`option-${option.value}`}
										checked={
											selected.includes(option.value) ||
											(option.value !== "all" &&
												selected.includes("all"))
										}
										onCheckedChange={(checked) => {
											if (typeof checked === "boolean") {
												console.log(
													`Checkbox ${option.label} (${option.value}) changed to ${checked}`
												);
												handleSelect(
													option.value,
													checked
												);
											}
										}}
										disabled={
											option.disabled ||
											(option.value !== "all" &&
												selected.includes("all"))
										}
									/>
									<label
										htmlFor={`option-${option.value}`}
										className={cn(
											"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
											(option.disabled ||
												(option.value !== "all" &&
													selected.includes(
														"all"
													))) &&
												"opacity-50"
										)}>
										{option.label}
									</label>
								</div>
							))}
							{filteredOptions.length === 0 && (
								<div className="text-sm text-muted-foreground py-2 text-center">
									No options found
								</div>
							)}
						</div>
					</ScrollArea>
				</div>
			</PopoverContent>
		</Popover>
	);
}
