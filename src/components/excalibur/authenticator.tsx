"use client";

import * as React from "react";
import { useVault } from "@/lib/store";
import { SetupScreen } from "./setup-screen";
import { LockScreen } from "./lock-screen";
import { ProfilesScreen } from "./profiles-screen";
import { MainScreen } from "./main-screen";
import { ConfirmProvider } from "./confirm-provider";

/**
 * Top-level authenticator component. Routes between setup / profiles / lock /
 * main screens based on the vault store.
 */
export function Authenticator() {
  const screen = useVault((s) => s.screen);
  const init = useVault((s) => s.init);
  const [booted, setBooted] = React.useState(false);

  React.useEffect(() => {
    init().finally(() => setBooted(true));
  }, [init]);

  if (!booted) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <ConfirmProvider>
      {screen === "setup" && <SetupScreen />}
      {screen === "profiles" && <ProfilesScreen />}
      {screen === "lock" && <LockScreen />}
      {screen === "main" && <MainScreen />}
    </ConfirmProvider>
  );
}
