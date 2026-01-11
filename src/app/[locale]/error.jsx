"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FaTriangleExclamation, FaRotateRight } from "react-icons/fa6";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-8">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <FaTriangleExclamation size={32} className="text-destructive" />
          </div>
        </div>

        <h1 className="mb-2 font-cera text-2xl font-bold">
          Something went wrong
        </h1>
        <p className="mb-6 text-muted-foreground">
          An error occurred while loading this page. Please try again.
        </p>

        <Button onClick={() => reset()} className="gap-2">
          <FaRotateRight size={14} />
          Try again
        </Button>
      </div>
    </div>
  );
}
