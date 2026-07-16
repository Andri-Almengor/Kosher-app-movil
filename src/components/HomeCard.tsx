import React from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { useCachedUri } from "@/hooks/useCachedUri";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { AppFonts } from "@/theme/fonts";

type Img = any | string;

type Props =
  | {
      // modo "texto directo"
      title: string;
      subtitle: string;
      buttonText?: string;
      secondaryButtonText?: string;
      titleKey?: never;
      subtitleKey?: never;
      buttonKey?: never;
      secondaryButtonKey?: never;
      image: Img;
      onPress: () => void;
      onSecondaryPress?: () => void;
      hideButton?: boolean;
    }
  | {
      // modo "keys"
      titleKey: string;
      subtitleKey: string;
      buttonKey?: string;
      secondaryButtonKey?: string;
      title?: never;
      subtitle?: never;
      buttonText?: never;
      secondaryButtonText?: never;
      image: Img;
      onPress: () => void;
      onSecondaryPress?: () => void;
      hideButton?: boolean;
    };

export const HomeCard = React.memo(function HomeCard(props: Props) {
  const { palette: c } = useTheme();
  const { t } = useI18n();

  const cachedUri = useCachedUri(typeof props.image === "string" ? props.image : null);
  const source = typeof props.image === "string" ? (cachedUri ? { uri: cachedUri } : undefined) : props.image;

  const title = "titleKey" in props ? t(props.titleKey as any) : props.title;
  const subtitle = "subtitleKey" in props ? t(props.subtitleKey as any) : props.subtitle;
  const buttonText =
    "buttonKey" in props
      ? props.buttonKey
        ? t(props.buttonKey as any)
        : undefined
      : props.buttonText;

  const secondaryButtonText =
    "secondaryButtonKey" in props
      ? props.secondaryButtonKey
        ? t(props.secondaryButtonKey as any)
        : undefined
      : props.secondaryButtonText;

  return (
    <Pressable onPress={props.onPress} style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}> 
      <ImageBackground source={source} style={styles.bg} imageStyle={styles.bgImg}>
        <View style={styles.overlay} />
        <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {!props.hideButton ? (
          <View style={styles.buttonsRow}>
            {buttonText ? (
              <Pressable onPress={props.onPress} style={[styles.btn, { backgroundColor: c.primary }]}>
                <Text style={[styles.btnText, { color: c.primaryText }]}>{buttonText}</Text>
              </Pressable>
            ) : null}

            {secondaryButtonText && props.onSecondaryPress ? (
              <Pressable
                onPress={props.onSecondaryPress}
                style={[
                  styles.btn,
                  styles.secondaryBtn,
                  {
                    backgroundColor: "rgba(255,255,255,0.18)",
                    borderColor: "rgba(255,255,255,0.35)",
                  },
                ]}
              >
                <Text style={[styles.btnText, styles.secondaryBtnText]}>{secondaryButtonText}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        </View>
      </ImageBackground>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  bg: { height: 158, borderRadius: 18, overflow: "hidden", marginBottom: 14, justifyContent: "flex-end" },
  bgImg: { borderRadius: 18 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.30)" },
  content: { padding: 14 },
  title: { fontSize: 24, fontFamily: AppFonts.poppinsSemiBold, color: "#fff", fontWeight: "800", letterSpacing: 0.2 },
  subtitle: { marginTop: 6, fontSize: 14, fontFamily: AppFonts.poppinsRegular, color: "rgba(255,255,255,0.85)" },
  buttonsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" },
  btn: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  secondaryBtn: { borderWidth: 1 },
  btnText: { fontSize: 13, fontFamily: AppFonts.poppinsMediumItalic },
  secondaryBtnText: { color: "#fff" },
});