import React from "react";
import frontendVersion from "@/version.json";
import { clientConfig } from "@/services/auth";

export default function VersionInfo() {
  return (
    <div>
      Version: {clientConfig.version}
      {frontendVersion !== clientConfig.version && ` (${frontendVersion.substring(0, 8)})`}
    </div>
  );
}
