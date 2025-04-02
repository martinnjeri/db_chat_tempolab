"use client";

import React, { useState, useEffect } from "react";
import { supabase, setSelectedDoctors } from "@/lib/supabaseClient";
import { CheckboxSelect, Option } from "@/components/ui/checkbox-select";
import { useOrganizationContext } from "@/lib/organizationContext";
import { Users } from "lucide-react";

interface Doctor {
	id: number;
	name: string;
	Specialty: string; // Note the capital 'S' to match the database schema
	organization_id: number | null;
}

export default function DoctorSelector() {
	const { selectedOrgIds, selectedDoctorIds, setSelectedDoctorIds } =
		useOrganizationContext();
	const [doctors, setDoctors] = useState<Doctor[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Fetch doctors when selected organizations change
	useEffect(() => {
		if (selectedOrgIds.length === 0) {
			setDoctors([]);
			return;
		}

		const fetchDoctors = async () => {
			setLoading(true);
			setError(null);
			try {
				let query = supabase.from("doctors").select("*").order("name");

				// Filter by selected organizations
				if (selectedOrgIds.length > 0) {
					query = query.in("organization_id", selectedOrgIds);
				}

				const { data, error } = await query;

				if (error) throw error;
				setDoctors(data || []);

				// Clear selected doctors that are no longer in the list
				const availableDoctorIds = new Set(
					(data || []).map((d) => d.id)
				);
				const filteredDoctorIds = selectedDoctorIds.filter((id) =>
					availableDoctorIds.has(id)
				);
				if (filteredDoctorIds.length !== selectedDoctorIds.length) {
					setSelectedDoctorIds(filteredDoctorIds);
				}
			} catch (err: any) {
				console.error("Failed to load doctors:", err);
				setError(err.message || "Failed to load doctors");
			} finally {
				setLoading(false);
			}
		};

		fetchDoctors();
	}, [selectedOrgIds, setSelectedDoctorIds, selectedDoctorIds]);

	// Convert doctors to options for MultiSelect
	const doctorOptions: Option[] = doctors.map((doctor) => ({
		label: `${doctor.name} (${doctor.Specialty})`, // Note the capital 'S' to match the database schema
		value: doctor.id.toString(),
	}));

	// Add "All Doctors" option
	const allDoctorsOption: Option = {
		label: "All Doctors",
		value: "all",
	};

	const handleDoctorChange = (values: string[]) => {
		console.log("Selected doctor values:", values);

		// Check if "All Doctors" is selected
		if (values.includes("all")) {
			// Select all doctors
			const allDoctorIds = doctors.map((doctor) => doctor.id);
			setSelectedDoctorIds(allDoctorIds);
			// Also update the supabaseClient
			setSelectedDoctors(allDoctorIds);
			console.log("Setting all doctor IDs:", allDoctorIds);
		} else if (values.length > 0) {
			// Convert string IDs to numbers
			const doctorIds = values.map((id) => parseInt(id, 10));
			setSelectedDoctorIds(doctorIds);
			// Also update the supabaseClient
			setSelectedDoctors(doctorIds);
			console.log("Setting specific doctor IDs:", doctorIds);
		} else {
			// If nothing is selected, clear the selection
			setSelectedDoctorIds([]);
			// Also update the supabaseClient
			setSelectedDoctors([]);
			console.log("Clearing doctor selection");
		}
	};

	// Convert selectedDoctorIds to string[] for MultiSelect
	const selectedDoctorValues =
		selectedDoctorIds.length === doctors.length && doctors.length > 0
			? ["all"]
			: selectedDoctorIds.map((id) => id.toString());

	return (
		<div className="flex flex-col space-y-2 w-full">
			<div className="flex items-center space-x-2">
				<div className="flex-1">
					<CheckboxSelect
						options={
							doctors.length > 0
								? [allDoctorsOption, ...doctorOptions]
								: []
						}
						selected={selectedDoctorValues}
						onChange={handleDoctorChange}
						placeholder="Select doctors..."
						disabled={loading || doctors.length === 0}
						className="w-full"
					/>
				</div>
			</div>

			{error && (
				<div className="text-sm font-medium text-destructive">
					{error}
				</div>
			)}

			{!loading && doctors.length === 0 && selectedOrgIds.length > 0 && (
				<div className="text-sm text-muted-foreground flex items-center">
					<Users className="h-4 w-4 mr-2" />
					No doctors found for the selected organization(s)
				</div>
			)}
		</div>
	);
}
