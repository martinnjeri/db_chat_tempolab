"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchOrganizations } from "@/lib/supabaseClient";
import { Organization } from "@/types/database";

interface OrganizationContextType {
  organizations: Organization[];
  selectedOrgIds: number[];
  setSelectedOrgIds: (ids: number[]) => void;
  selectedDoctorIds: number[];
  setSelectedDoctorIds: (ids: number[]) => void;
  loading: boolean;
  error: string | null;
}

const OrganizationContext = createContext<OrganizationContextType>({
  organizations: [],
  selectedOrgIds: [],
  setSelectedOrgIds: () => {},
  selectedDoctorIds: [],
  setSelectedDoctorIds: () => {},
  loading: true,
  error: null,
});

export const useOrganizationContext = () => useContext(OrganizationContext);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgIds, setSelectedOrgIds] = useState<number[]>([]);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrganizations = async () => {
      setLoading(true);
      setError(null);
      try {
        const orgs = await fetchOrganizations();
        setOrganizations(orgs);

        // If no organization is selected and we have organizations, select the first one
        if (selectedOrgIds.length === 0 && orgs.length > 0) {
          setSelectedOrgIds([orgs[0].id]);
        }
      } catch (err: any) {
        console.error("Failed to load organizations:", err);
        setError(err.message || "Failed to load organizations");
      } finally {
        setLoading(false);
      }
    };

    loadOrganizations();
  }, []);

  // Reset selected doctors when organizations change
  useEffect(() => {
    setSelectedDoctorIds([]);
  }, [selectedOrgIds]);

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        selectedOrgIds,
        setSelectedOrgIds,
        selectedDoctorIds,
        setSelectedDoctorIds,
        loading,
        error,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};
