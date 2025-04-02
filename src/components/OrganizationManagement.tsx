"use client";

import React, { useState, useEffect } from "react";
import {
  fetchOrganizations,
  setCurrentOrganization,
} from "@/lib/supabaseClient";
import { Organization } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabaseClient";
import { PlusCircle, Pencil, Trash2, Users } from "lucide-react";

export default function OrganizationManagement() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
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
    } catch (err: any) {
      console.error("Failed to load organizations:", err);
      setError(err.message || "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
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
          name: orgName.trim(),
          description: orgDescription ? orgDescription.trim() : null,
        })
        .select();

      if (error) throw error;

      // Reload organizations
      await loadOrganizations();

      // Reset form and close dialog
      resetForm();
      setIsCreateDialogOpen(false);
    } catch (err: any) {
      console.error("Failed to create organization:", err);
      setError(err.message || "Failed to create organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOrganization = async () => {
    if (!currentOrg) return;
    if (!orgName.trim()) {
      setError("Organization name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Update organization
      const { error } = await supabase
        .from("organizations")
        .update({
          name: orgName.trim(),
          description: orgDescription ? orgDescription.trim() : null,
        })
        .eq("id", currentOrg.id);

      if (error) throw error;

      // Reload organizations
      await loadOrganizations();

      // Reset form and close dialog
      resetForm();
      setIsEditDialogOpen(false);
    } catch (err: any) {
      console.error("Failed to update organization:", err);
      setError(err.message || "Failed to update organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!currentOrg) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // First, update any doctors that belong to this organization
      const { error: doctorsError } = await supabase
        .from("doctors")
        .update({ organization_id: null })
        .eq("organization_id", currentOrg.id);

      if (doctorsError) throw doctorsError;

      // Then delete the organization
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", currentOrg.id);

      if (error) throw error;

      // Reload organizations
      await loadOrganizations();

      // Reset form and close dialog
      resetForm();
      setIsDeleteDialogOpen(false);
    } catch (err: any) {
      console.error("Failed to delete organization:", err);
      setError(err.message || "Failed to delete organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (org: Organization) => {
    setCurrentOrg(org);
    setOrgName(org.name);
    setOrgDescription(org.description || "");
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (org: Organization) => {
    setCurrentOrg(org);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setOrgName("");
    setOrgDescription("");
    setCurrentOrg(null);
    setError(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Organization Management</h2>
        <Button onClick={openCreateDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Organization
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center p-6">Loading organizations...</div>
      ) : organizations.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Organizations</CardTitle>
            <CardDescription>
              You haven't created any organizations yet.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={openCreateDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Your First
              Organization
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((org) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell>{org.description || "-"}</TableCell>
                <TableCell>
                  {org.created_at
                    ? new Date(org.created_at).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(org)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openDeleteDialog(org)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create Organization Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Add a new organization to manage doctors and patients.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-name" className="text-right">
                Name
              </Label>
              <Input
                id="create-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="create-description"
                value={orgDescription}
                onChange={(e) => setOrgDescription(e.target.value)}
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

      {/* Edit Organization Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update the organization details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="edit-description"
                value={orgDescription}
                onChange={(e) => setOrgDescription(e.target.value)}
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
              onClick={handleEditOrganization}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Organization Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the organization "{currentOrg?.name}
              ". Any doctors assigned to this organization will be unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrganization}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
