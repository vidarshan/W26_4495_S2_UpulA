"use client";
import { useJob } from "@/hooks/useJob";
import { useParams } from "next/navigation";
import React, { ReactNode } from "react";

const JobLayout = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export default JobLayout;
