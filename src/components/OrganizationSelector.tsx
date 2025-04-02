"use client";

import React, { useState, useEffect } from "react";
import {
	fetchOrganizations,
	setCurrentOrganization,
	getCurrentOrganization,
	setSelectedOrganizations,
} from "@/lib/supabaseClient";
import { Organization } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabaseClient";
import { PlusCircle, Settings, Check } from "lucide-react";
import { CheckboxSelect, Option } from "@/components/ui/checkbox-select";
import { useOrganizationContext } from "@/lib/organizationContext";

export default function OrganizationSelector() {
	const {
		organizations,
		selectedOrgIds,
		setSelectedOrgIds,
		loading,
		error: contextError,
	} = useOrganizationContext();

	const [error, setError] = useState<string | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [newOrgName, setNewOrgName] = useState("");
	const [newOrgDescription, setNewOrgDescription] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Convert organizations to options for MultiSelect
	const organizationOptions: Option[] = organizations.map((org) => ({
		label: org.name,
		value: org.id.toString(),
	}));

	// Add "All Organizations" option
	const allOrganizationsOption: Option = {
		label: "All Organizations",
		value: "all",
	};

	const handleOrganizationChange = (values: string[]) => {
		console.log("Selected organization values:", values);

		// Check if "All Organizations" is selected
		if (values.includes("all")) {
			// Select all organizations
			const allOrgIds = organizations.map((org) => org.id);
			console.log("All organization IDs:", allOrgIds);
			setSelectedOrgIds(allOrgIds);
			// Also update the supabaseClient
			setSelectedOrganizations(allOrgIds);
			console.log("Setting all organization IDs:", allOrgIds);

			// Also update the legacy single organization selector for backward compatibility
			if (allOrgIds.length > 0) {
				setCurrentOrganization(allOrgIds[0]);
			}
		} else if (values.length > 0) {
			// Convert string IDs to numbers
			const orgIds = values.map((id) => parseInt(id, 10));
			console.log("Parsed organization IDs:", orgIds);
			setSelectedOrgIds(orgIds);
			// Also update the supabaseClient
			setSelectedOrganizations(orgIds);
			console.log("Setting specific organization IDs:", orgIds);

			// Also update the legacy single organization selector for backward compatibility
			setCurrentOrganization(orgIds[0]);
		} else {
			// If nothing is selected, clear the selection
			setSelectedOrgIds([]);
			// Also update the supabaseClient
			setSelectedOrganizations([]);
			setCurrentOrganization(null);
			console.log("Clearing organization selection");
		}

		// Force a re-render
		setTimeout(() => {
			console.log(
				"Current selected organization IDs after update:",
				selectedOrgIds
			);
		}, 100);
	};

	const handleCreateOrganization = async () => {
		if (!newOrgName.trim()) {
			setError("Organization name is required");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			// Insert new organization
			const { data, error } = await supabase
				.from("organizations")
				.insert({
					name: newOrgName.trim(),
					description: newOrgDescription.trim() || null,
				})
				.select();

			if (error) throw error;

			// Reset form and close dialog
			setNewOrgName("");
			setNewOrgDescription("");
			setIsDialogOpen(false);
		} catch (err: any) {
			console.error("Failed to create organization:", err);
			setError(err.message || "Failed to create organization");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Convert selectedOrgIds to string[] for MultiSelect
	const selectedOrgValues =
		selectedOrgIds.length === organizations.length &&
		organizations.length > 0
			? ["all"]
			: selectedOrgIds.map((id) => id.toString());

	console.log("OrganizationSelector - selectedOrgIds:", selectedOrgIds);
	console.log("OrganizationSelector - organizations:", organizations);
	console.log("OrganizationSelector - selectedOrgValues:", selectedOrgValues);

	return (
		<div className="flex flex-col space-y-2 w-full">
			<div className="flex items-center space-x-2">
				<div className="flex-1">
					<CheckboxSelect
						options={[
							allOrganizationsOption,
							...organizationOptions,
						]}
						selected={selectedOrgValues}
						onChange={handleOrganizationChange}
						placeholder="Select organizations..."
						disabled={loading || organizations.length === 0}
						className="w-full"
					/>
				</div>

				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogTrigger asChild>
						<Button
							variant="outline"
							size="icon"
							title="Add Organization">
							<PlusCircle className="h-4 w-4" />
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[425px]">
						<DialogHeader>
							<DialogTitle>Create New Organization</DialogTitle>
							<DialogDescription>
								Add a new organization to manage doctors and
								patients.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="name" className="text-right">
									Name
								</Label>
								<Input
									id="name"
									value={newOrgName}
									onChange={(e) =>
										setNewOrgName(e.target.value)
									}
									className="col-span-3"
								/>
							</div>
							<div className="grid grid-cols-4 items-center gap-4">
								<Label
									htmlFor="description"
									className="text-right">
									Description
								</Label>
								<Textarea
									id="description"
									value={newOrgDescription}
									onChange={(e) =>
										setNewOrgDescription(e.target.value)
									}
									className="col-span-3"
								/>
							</div>
						</div>
						{error && (
							<div className="text-sm font-medium text-destructive">
								{error}
							</div>
						)}
						<DialogFooter>
							<Button
								type="submit"
								onClick={handleCreateOrganization}
								disabled={isSubmitting}>
								{isSubmitting ? "Creating..." : "Create"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<Button
					variant="outline"
					size="icon"
					title="Manage Organizations">
					<Settings className="h-4 w-4" />
				</Button>
			</div>

			{contextError && (
				<div className="text-sm font-medium text-destructive">
					{contextError}
				</div>
			)}
		</div>
	);
}
