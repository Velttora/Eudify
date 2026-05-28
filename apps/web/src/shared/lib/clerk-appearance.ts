/** Tema visual alineado con Eudify (Pitch Deck: navy + sky). */
export const clerkFriendlyAppearance = {
  variables: {
    colorPrimary: "#2980B9",
    colorText: "#0C1E3B",
    colorTextSecondary: "#4A6080",
    colorBackground: "#EEF3FA",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#0C1E3B",
    borderRadius: "0.75rem",
    fontSize: "1.0625rem",
  },
  elements: {
    card: "shadow-none border border-[#C5D6EA] bg-white",
    headerTitle: "text-xl font-bold text-[#0C1E3B]",
    headerSubtitle: "text-[#4A6080]",
    socialButtonsBlockButton:
      "border-[#C5D6EA] bg-[#E4ECF6] text-[#0C1E3B] min-h-12",
    formButtonPrimary: "min-h-12 font-semibold text-base",
    formFieldInput: "min-h-12 text-base text-[#0C1E3B]",
    footerActionLink: "text-[#2980B9] font-medium",
    identityPreviewText: "text-[#0C1E3B]",
  },
} as const;
