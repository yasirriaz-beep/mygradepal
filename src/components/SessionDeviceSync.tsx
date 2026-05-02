"use client";

import { useEffect } from "react";

import { syncUserSessionDevice } from "@/lib/syncUserSession";
import { supabase } from "@/lib/supabase";

/** Registers this browser with session limits after login & on navigations when still signed in. */
export default function SessionDeviceSync() {
  useEffect(() => {
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const result = await syncUserSessionDevice();
      if (!result.ok && result.maxDevices) {
        alert(result.error);
        await supabase.auth.signOut();
        window.location.href = "/login?reason=max_devices";
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN") return;
      void syncUserSessionDevice().then(async (result) => {
        if (!result.ok && result.maxDevices) {
          alert(result.error);
          await supabase.auth.signOut();
          window.location.href = "/login?reason=max_devices";
        }
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
