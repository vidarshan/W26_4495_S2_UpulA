import ClientsTable from "@/app/components/tables/ClientTable";
import React from "react";

const page = () => {
  return (
    <div>
      <ClientsTable
        clients={[
          {
            id: "c_001",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@gmail.com",
            phone: "+1 604-555-0132",
            createdAt: "2025-12-01T10:15:00Z",
          },
        ]}
      />
    </div>
  );
};

export default page;
