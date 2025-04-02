"use client";

import React from "react";
import OrganizationSelector from "./OrganizationSelector";
import DoctorSelector from "./DoctorSelector";

export default function FilterSelectors() {
  return (
    <div className="flex flex-col space-y-4 p-4 bg-card rounded-lg border">
      <div>
        <h3 className="text-sm font-medium mb-2">Organizations</h3>
        <OrganizationSelector />
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Doctors</h3>
        <DoctorSelector />
      </div>
    </div>
  );
}
