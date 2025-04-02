"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Pencil, Trash2, Users } from "lucide-react";

interface Doctor {
  id: number;
  name: string;
  Specialty: string; // Note the capital 'S' to match the database schema
  contact_number: string | null;
  organization_id: number | null;
}

interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  contact_number: string | null;
  doctor_id: number | null;
}

export default function PatientManagement() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("male");
  const [patientContact, setPatientContact] = useState("");
  const [patientDoctorId, setPatientDoctorId] = useState<string>("none");
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch patients and doctors on component mount
  useEffect(() => {
    loadPatients();
    loadDoctors();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("name");

      if (error) throw error;
      setPatients(data || []);
    } catch (err: any) {
      console.error("Failed to load patients:", err);
      setError(err.message || "Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .order("name");

      if (error) throw error;
      setDoctors(data || []);
    } catch (err: any) {
      console.error("Failed to load doctors:", err);
    }
  };

  const handleCreatePatient = async () => {
    if (!patientName?.trim() || !patientAge || !patientGender) {
      setError("Name, age, and gender are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Insert new patient
      const { data, error } = await supabase
        .from("patients")
        .insert({
          name: patientName.trim(),
          age: parseInt(patientAge, 10),
          gender: patientGender,
          contact_number: patientContact.trim() || null,
          doctor_id:
            patientDoctorId !== "none" ? parseInt(patientDoctorId, 10) : null,
        })
        .select();

      if (error) throw error;

      // Reload patients
      await loadPatients();

      // Reset form and close dialog
      resetForm();
      setIsCreateDialogOpen(false);
    } catch (err: any) {
      console.error("Failed to create patient:", err);
      setError(err.message || "Failed to create patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePatient = async () => {
    if (!currentPatient) return;
    if (!patientName?.trim() || !patientAge || !patientGender) {
      setError("Name, age, and gender are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Update patient
      const { error } = await supabase
        .from("patients")
        .update({
          name: patientName.trim(),
          age: parseInt(patientAge, 10),
          gender: patientGender,
          contact_number: patientContact.trim() || null,
          doctor_id:
            patientDoctorId !== "none" ? parseInt(patientDoctorId, 10) : null,
        })
        .eq("id", currentPatient.id);

      if (error) throw error;

      // Reload patients
      await loadPatients();

      // Reset form and close dialog
      resetForm();
      setIsEditDialogOpen(false);
    } catch (err: any) {
      console.error("Failed to update patient:", err);
      setError(err.message || "Failed to update patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!currentPatient) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Delete patient
      const { error } = await supabase
        .from("patients")
        .delete()
        .eq("id", currentPatient.id);

      if (error) throw error;

      // Reload patients
      await loadPatients();

      // Reset form and close dialog
      resetForm();
      setIsDeleteDialogOpen(false);
    } catch (err: any) {
      console.error("Failed to delete patient:", err);
      setError(err.message || "Failed to delete patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (patient: Patient) => {
    setCurrentPatient(patient);
    setPatientName(patient.name);
    setPatientAge(patient.age.toString());
    setPatientGender(patient.gender);
    setPatientContact(patient.contact_number || "");
    setPatientDoctorId(
      patient.doctor_id ? patient.doctor_id.toString() : "none"
    );
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (patient: Patient) => {
    setCurrentPatient(patient);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setPatientName("");
    setPatientAge("");
    setPatientGender("male");
    setPatientContact("");
    setPatientDoctorId("none");
    setCurrentPatient(null);
    setError(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const getDoctorName = (doctorId: number | null) => {
    if (!doctorId) return "None";
    const doctor = doctors.find((d) => d.id === doctorId);
    return doctor ? doctor.name : "Unknown";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Patient Management</h2>
        <Button onClick={openCreateDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Patient
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center p-6">Loading patients...</div>
      ) : patients.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Patients</CardTitle>
            <CardDescription>
              You haven't added any patients yet.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={openCreateDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Patient
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="font-medium">{patient.name}</TableCell>
                <TableCell>{patient.age}</TableCell>
                <TableCell>{patient.gender}</TableCell>
                <TableCell>{patient.contact_number || "-"}</TableCell>
                <TableCell>{getDoctorName(patient.doctor_id)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(patient)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openDeleteDialog(patient)}
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

      {/* Create Patient Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Patient</DialogTitle>
            <DialogDescription>
              Add a new patient to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-name" className="text-right">
                Name
              </Label>
              <Input
                id="create-name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-age" className="text-right">
                Age
              </Label>
              <Input
                id="create-age"
                type="number"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-gender" className="text-right">
                Gender
              </Label>
              <Select
                value={patientGender}
                onValueChange={setPatientGender}
              >
                <SelectTrigger id="create-gender" className="col-span-3">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-contact" className="text-right">
                Contact
              </Label>
              <Input
                id="create-contact"
                value={patientContact}
                onChange={(e) => setPatientContact(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-doctor" className="text-right">
                Doctor
              </Label>
              <Select
                value={patientDoctorId}
                onValueChange={setPatientDoctorId}
              >
                <SelectTrigger id="create-doctor" className="col-span-3">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id.toString()}>
                      {doctor.name} ({doctor.Specialty})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleCreatePatient}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Patient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>
              Update the patient's information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-age" className="text-right">
                Age
              </Label>
              <Input
                id="edit-age"
                type="number"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-gender" className="text-right">
                Gender
              </Label>
              <Select
                value={patientGender}
                onValueChange={setPatientGender}
              >
                <SelectTrigger id="edit-gender" className="col-span-3">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-contact" className="text-right">
                Contact
              </Label>
              <Input
                id="edit-contact"
                value={patientContact}
                onChange={(e) => setPatientContact(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-doctor" className="text-right">
                Doctor
              </Label>
              <Select
                value={patientDoctorId}
                onValueChange={setPatientDoctorId}
              >
                <SelectTrigger id="edit-doctor" className="col-span-3">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id.toString()}>
                      {doctor.name} ({doctor.Specialty})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleUpdatePatient}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Patient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Patient Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the patient{" "}
              {currentPatient?.name && <strong>{currentPatient.name}</strong>}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePatient}
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
