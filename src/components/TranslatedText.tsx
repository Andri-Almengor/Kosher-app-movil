import React, { useEffect, useState } from "react";
import { Text, TextProps, InteractionManager } from "react-native";
import { useI18n } from "@/i18n/I18nProvider";
import { translateText } from "@/lib/translate/translateText";

/**
 * Renders dynamic backend text translated to the current UI language.
 * Uses a small queue + caching (translateText) and can defer work until after animations/gestures.
 *
 * NOTE: This is intended for short strings (titles, categories, etc).
 */
export function TranslatedText({
  text,
  maxLen = 200,
  defer = true,
  ...props
}: TextProps & { text: string; maxLen?: number; defer?: boolean }) {
  const { lang } = useI18n();
  const [out, setOut] = useState(text);

  useEffect(() => {
    let alive = true;
    const input = (text ?? "").trim();
    setOut(input);

    // No work needed
    if (!input) return () => { alive = false; };
    if (lang === "es") return () => { alive = false; };
    if (input.length > maxLen) return () => { alive = false; };

    const run = () => {
      translateText(input, lang)
        .then((t) => {
          if (alive) setOut(t);
        })
        .catch(() => {
          // ignore
        });
    };

    if (defer) {
      const task = InteractionManager.runAfterInteractions(run);
      return () => {
        alive = false;
        // @ts-ignore
        task?.cancel?.();
      };
    }

    run();
    return () => {
      alive = false;
    };
  }, [text, lang, maxLen, defer]);

  return <Text {...props}>{out}</Text>;
}
