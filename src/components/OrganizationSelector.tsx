"use client";

import React, { useState, useEffect } from "react";
import {
  fetchOrganizations,
  setCurrentOrganization,
  getCurrentOrganization,
} from "@/lib/supabaseClient";
import { Organization } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { PlusCircle, Settings } from "lucide-react";

export default function OrganizationSelector() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(
    getCurrentOrganization(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDescription, setNewOrgDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch organizations on component mount
  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setLoading(true);
    setError(null);
    try {
      const orgs = await fetchOrganizations();
      setOrganizations(orgs);

      // If no organization is selected and we have organizations, select the first one
      if (selectedOrgId === null && orgs.length > 0) {
        handleOrganizationChange(orgs[0].id.toString());
      }
    } catch (err: any) {
      console.error("Failed to load organizations:", err);
      setError(err.message || "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationChange = (value: string) => {
    const orgId = parseInt(value, 10);
    setSelectedOrgId(orgId);
    setCurrentOrganization(orgId);
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

      // Reload organizations
      await loadOrganizations();

      // Select the newly created organization
      if (data && data.length > 0) {
        handleOrganizationChange(data[0].id.toString());
      }

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

  return (
    <div className="flex items-center space-x-2">
      <div className="flex-1">
        <Select
          value={selectedOrgId?.toString() || ""}
          onValueChange={handleOrganizationChange}
          disabled={loading || organizations.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select organization" />
          </SelectTrigger>
          <SelectContent>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id.toString()}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" title="Add Organization">
            <PlusCircle className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Add a new organization to manage doctors and patients.
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
                onChange={(e) => setNewOrgName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={newOrgDescription}
                onChange={(e) => setNewOrgDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          {error && (
            <div className="text-sm font-medium text-destructive">{error}</div>
          )}
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleCreateOrganization}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="outline" size="icon" title="Manage Organizations">
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
}
