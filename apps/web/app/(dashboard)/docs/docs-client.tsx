"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// SwaggerUI requiere DOM — lazy load client-only
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export function DocsClient() {
  return (
    <div className="rounded-lg border bg-white p-4">
      <SwaggerUI url="/api/docs" />
    </div>
  );
}
