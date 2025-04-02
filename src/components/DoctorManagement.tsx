"use client";

import React, { useState, useEffect } from "react";
import { fetchOrganizations } from "@/lib/supabaseClient";
import { Organization } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { PlusCircle, Pencil, Trash2, Users } from "lucide-react";

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  contact_number: string | null;
  organization_id: number | null;
}

export default function DoctorManagement() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [doctorSpecialty, setDoctorSpecialty] = useState("");
  const [doctorContact, setDoctorContact] = useState("");
  const [doctorOrgId, setDoctorOrgId] = useState<string>("none");
  const [currentDoctor, setCurrentDoctor] = useState<Doctor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch doctors and organizations on component mount
  useEffect(() => {
    loadDoctors();
    loadOrganizations();
  }, []);

  const loadDoctors = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .order("name");

      if (error) throw error;
      setDoctors(data || []);
    } catch (err: any) {
      console.error("Failed to load doctors:", err);
      setError(err.message || "Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const orgs = await fetchOrganizations();
      setOrganizations(orgs);
    } catch (err: any) {
      console.error("Failed to load organizations:", err);
    }
  };

  const handleCreateDoctor = async () => {
    if (!doctorName?.trim() || !doctorSpecialty?.trim()) {
      setError("Name and specialty are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Insert new doctor
      const { data, error } = await supabase
        .from("doctors")
        .insert({
          name: doctorName.trim(),
          specialty: doctorSpecialty.trim(),
          contact_number: doctorContact.trim() || null,
          organization_id:
            doctorOrgId !== "none" ? parseInt(doctorOrgId, 10) : null,
        })
        .select();

      if (error) throw error;

      // Reload doctors
      await loadDoctors();

      // Reset form and close dialog
      resetForm();
      setIsCreateDialogOpen(false);
    } catch (err: any) {
      console.error("Failed to create doctor:", err);
      setError(err.message || "Failed to create doctor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDoctor = async () => {
    if (!currentDoctor) return;
    if (!doctorName?.trim() || !doctorSpecialty?.trim()) {
      setError("Name and specialty are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Update doctor
      const { error } = await supabase
        .from("doctors")
        .update({
          name: doctorName.trim(),
          specialty: doctorSpecialty.trim(),
          contact_number: doctorContact.trim() || null,
          organization_id:
            doctorOrgId !== "none" ? parseInt(doctorOrgId, 10) : null,
        })
        .eq("id", currentDoctor.id);

      if (error) throw error;

      // Reload doctors
      await loadDoctors();

      // Reset form and close dialog
      resetForm();
      setIsEditDialogOpen(false);
    } catch (err: any) {
      console.error("Failed to update doctor:", err);
      setError(err.message || "Failed to update doctor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDoctor = async () => {
    if (!currentDoctor) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Delete doctor
      const { error } = await supabase
        .from("doctors")
        .delete()
        .eq("id", currentDoctor.id);

      if (error) throw error;

      // Reload doctors
      await loadDoctors();

      // Reset form and close dialog
      resetForm();
      setIsDeleteDialogOpen(false);
    } catch (err: any) {
      console.error("Failed to delete doctor:", err);
      setError(err.message || "Failed to delete doctor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (doctor: Doctor) => {
    setCurrentDoctor(doctor);
    setDoctorName(doctor.name);
    setDoctorSpecialty(doctor.specialty);
    setDoctorContact(doctor.contact_number || "");
    setDoctorOrgId(
      doctor.organization_id ? doctor.organization_id.toString() : "none",
    );
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (doctor: Doctor) => {
    setCurrentDoctor(doctor);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setDoctorName("");
    setDoctorSpecialty("");
    setDoctorContact("");
    setDoctorOrgId("none");
    setCurrentDoctor(null);
    setError(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const getOrganizationName = (orgId: number | null) => {
    if (!orgId) return "None";
    const org = organizations.find((o) => o.id === orgId);
    return org ? org.name : "Unknown";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Doctor Management</h2>
        <Button onClick={openCreateDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Doctor
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center p-6">Loading doctors...</div>
      ) : doctors.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Doctors</CardTitle>
            <CardDescription>
              You haven't added any doctors yet.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={openCreateDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Doctor
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Specialty</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors.map((doctor) => (
              <TableRow key={doctor.id}>
                <TableCell className="font-medium">{doctor.name}</TableCell>
                <TableCell>{doctor.specialty}</TableCell>
                <TableCell>{doctor.contact_number || "-"}</TableCell>
                <TableCell>
                  {getOrganizationName(doctor.organization_id)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(doctor)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openDeleteDialog(doctor)}
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

      {/* Create Doctor Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Doctor</DialogTitle>
            <DialogDescription>
              Add a new doctor to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-name" className="text-right">
                Name
              </Label>
              <Input
                id="create-name"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-specialty" className="text-right">
                Specialty
              </Label>
              <Input
                id="create-specialty"
                value={doctorSpecialty}
                onChange={(e) => setDoctorSpecialty(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-contact" className="text-right">
                Contact
              </Label>
              <Input
                id="create-contact"
                value={doctorContact}
                onChange={(e) => setDoctorContact(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-organization" className="text-right">
                Organization
              </Label>
              <Select value={doctorOrgId} onValueChange={setDoctorOrgId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && (
            <div className="text-sm font-medium text-destructive">{error}</div>
          )}
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleCreateDoctor}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Doctor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Doctor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Doctor</DialogTitle>
            <DialogDescription>
              Update the doctor's information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-specialty" className="text-right">
                Specialty
              </Label>
              <Input
                id="edit-specialty"
                value={doctorSpecialty}
                onChange={(e) => setDoctorSpecialty(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-contact" className="text-right">
                Contact
              </Label>
              <Input
                id="edit-contact"
                value={doctorContact}
                onChange={(e) => setDoctorContact(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-organization" className="text-right">
                Organization
              </Label>
              <Select value={doctorOrgId} onValueChange={setDoctorOrgId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && (
            <div className="text-sm font-medium text-destructive">{error}</div>
          )}
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleEditDoctor}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Doctor Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the doctor "{currentDoctor?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDoctor}
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
