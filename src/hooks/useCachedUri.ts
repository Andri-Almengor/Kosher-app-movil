import React from "react";
import { Platform } from "react-native";
import { resolveStoredUri } from "@/lib/offline/FileStorage";

export function useCachedUri(uri?: string | null) {
  const [resolvedUri, setResolvedUri] = React.useState<string | null>(uri ?? null);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      if (!uri) {
        if (mounted) setResolvedUri(null);
        return;
      }

      if (Platform.OS === "web" || !/^https?:\/\//i.test(uri)) {
        if (mounted) setResolvedUri(uri);
        return;
      }

      const finalUri = await resolveStoredUri({
        url: uri,
        kind: "image",
      });

      if (mounted) setResolvedUri(finalUri);
    })();

    return () => {
      mounted = false;
    };
  }, [uri]);

  return resolvedUri;
}