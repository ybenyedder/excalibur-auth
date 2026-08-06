/**
 * Excalibur — minimal i18n (EN default + FR, matching original).
 * Toggle from settings. Stored in localStorage.
 */

export type Lang = "en" | "fr";

export const DEFAULT_LANG: Lang = "en";

export const STRINGS = {
  en: {
    appName: "Excalibur",
    tagline: "Verification codes",
    offline: "Offline",

    // Setup
    setupTitle: "Create your vault",
    setupSubtitle:
      "Choose a master passphrase. It encrypts your vault on this device (AES-256-GCM) and is never stored anywhere — if you lose it, the vault is unrecoverable.",
    passphrase: "Passphrase",
    confirmPassphrase: "Confirm passphrase",
    createVault: "Create vault",
    passTooShort: "Passphrase must be at least 8 characters.",
    passMismatch: "Passphrases do not match.",

    // Profiles
    whoAreYou: "Who are you?",
    noProfiles: "No profiles on this server yet.",
    newProfile: "New profile",
    profileName: "Profile name",
    profileNameHint: "Lowercase, digits, dashes — visible to others on this server.",
    switchProfile: "← Switch profile",
    lastUsed: "Last used",

    // Lock
    vaultLocked: "Vault locked",
    unlock: "Unlock",
    invalidPass: "Invalid passphrase.",
    tooManyAttempts: "Too many attempts. Try again in {s}s.",

    // Main
    search: "Search accounts",
    addAccount: "Add account",
    noAccounts: "No accounts yet",
    noAccountsHint: "Add your first code with an otpauth:// link, a QR code, or manual entry.",
    addFirst: "Add an account",
    accounts: "accounts",
    escapeLocks: "Esc locks",
    settings: "Settings",
    lock: "Lock",
    filter: "Filter…",

    // Add account
    addTitle: "Add account",
    editTitle: "Edit account",
    tabUri: "otpauth link",
    tabManual: "Manual entry",
    tabQr: "Scan QR",
    uriLabel: "otpauth:// link",
    uriPlaceholder: "otpauth://totp/Service:account?secret=…",
    uriHint:
      "On the service's site, choose “can't scan the QR code” to get this link — or scan it directly.",
    issuerLabel: "Service (issuer)",
    issuerPlaceholder: "GitHub",
    accountLabel: "Account",
    accountPlaceholder: "you@example.com",
    secretLabel: "Secret (Base32)",
    secretPlaceholder: "JBSW Y3DP EHPK 3PXP",
    advanced: "Advanced options",
    algorithm: "Algorithm",
    digits: "Digits",
    period: "Period (s)",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    copyLink: "Copy link",
    showQr: "Show QR",
    invalidLink: "Invalid link",
    invalidSecret: "Invalid Base32 secret",
    accountSaved: "Account saved",
    accountDeleted: "Account deleted",
    linkCopied: "Link copied to clipboard",
    confirmDelete: "Delete this account?",

    // Card
    tapToReveal: "Tap to reveal",
    copied: "Code copied",
    pinned: "Pinned",

    // Settings
    settingsTitle: "Settings",
    sectionLock: "Auto-lock",
    autolockAfter: "Lock after inactivity",
    lockOnHide: "Lock when tab is hidden",
    sectionPrivacy: "Privacy",
    hideCodes: "Hide codes until tapped",
    clipboardClear: "Auto-clear clipboard",
    sectionBackup: "Backup",
    backupHint:
      "The backup is the encrypted vault as-is — unreadable without the passphrase.",
    exportVault: "Export vault",
    importVault: "Import…",
    sectionPassphrase: "Change passphrase",
    currentPass: "Current passphrase",
    newPass: "New passphrase",
    confirmNew: "Confirm",
    changePass: "Change passphrase",
    passChanged: "Passphrase changed",
    sectionDanger: "Danger zone",
    wipeHint: "Type DELETE then confirm to destroy the vault on this device.",
    wipePlaceholder: "DELETE",
    wipeAll: "Erase everything",
    sectionAppearance: "Appearance",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    language: "Language",
    sectionStats: "Statistics",
    close: "Close",

    // QR scanner
    qrScanTitle: "Scan QR code",
    qrScanHint: "Point your camera at the otpauth QR code.",
    qrNoCamera: "Camera unavailable. Use a secure context (HTTPS) and grant permission.",
    qrStop: "Stop",

    // Toasts
    imported: "Vault imported",
    exported: "Vault exported",
    wiped: "Vault erased",
    importedNeedsPass: "Enter the backup passphrase to install it",

    // Misc
    seconds: "s",
    now: "now",
    updated: "updated",
    copiedN: "Copied {code}",
  },
  fr: {
    appName: "Excalibur",
    tagline: "Codes de vérification",
    offline: "Hors ligne",

    setupTitle: "Créer votre coffre",
    setupSubtitle:
      "Choisissez une phrase de passe maîtresse. Elle chiffre votre coffre sur cet appareil (AES-256-GCM) et n'est stockée nulle part — si vous la perdez, le coffre est irrécupérable.",
    passphrase: "Phrase de passe",
    confirmPassphrase: "Confirmez",
    createVault: "Créer le coffre",
    passTooShort: "La phrase doit faire au moins 8 caractères.",
    passMismatch: "Les phrases ne correspondent pas.",

    whoAreYou: "Qui êtes-vous ?",
    noProfiles: "Aucun profil sur ce serveur pour l'instant.",
    newProfile: "Nouveau profil",
    profileName: "Nom du profil",
    profileNameHint: "Minuscules, chiffres, tirets — visible par les autres du serveur.",
    switchProfile: "← Changer de profil",
    lastUsed: "Dernière utilisation",

    vaultLocked: "Coffre verrouillé",
    unlock: "Déverrouiller",
    invalidPass: "Phrase de passe invalide.",
    tooManyAttempts: "Trop de tentatives. Réessayez dans {s}s.",

    search: "Filtrer les comptes",
    addAccount: "Ajouter un compte",
    noAccounts: "Aucun compte pour l'instant",
    noAccountsHint: "Ajoutez votre premier code avec un lien otpauth://, un QR code ou une saisie manuelle.",
    addFirst: "Ajouter un compte",
    accounts: "comptes",
    escapeLocks: "Échap verrouille",
    settings: "Réglages",
    lock: "Verrouiller",
    filter: "Filtrer…",

    addTitle: "Ajouter un compte",
    editTitle: "Modifier le compte",
    tabUri: "Lien otpauth",
    tabManual: "Saisie manuelle",
    tabQr: "Scanner QR",
    uriLabel: "Lien otpauth://",
    uriPlaceholder: "otpauth://totp/Service:compte?secret=…",
    uriHint:
      "Sur le site du service, choisissez « impossible de scanner le QR code » pour obtenir ce lien — ou scannez-le directement.",
    issuerLabel: "Service (émetteur)",
    issuerPlaceholder: "GitHub",
    accountLabel: "Compte",
    accountPlaceholder: "vous@exemple.fr",
    secretLabel: "Secret (Base32)",
    secretPlaceholder: "JBSW Y3DP EHPK 3PXP",
    advanced: "Options avancées",
    algorithm: "Algorithme",
    digits: "Chiffres",
    period: "Période (s)",
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    copyLink: "Copier le lien",
    showQr: "Afficher QR",
    invalidLink: "Lien invalide",
    invalidSecret: "Secret Base32 invalide",
    accountSaved: "Compte enregistré",
    accountDeleted: "Compte supprimé",
    linkCopied: "Lien copié dans le presse-papiers",
    confirmDelete: "Supprimer ce compte ?",

    tapToReveal: "Touchez pour révéler",
    copied: "Code copié",
    pinned: "Épinglé",

    settingsTitle: "Réglages",
    sectionLock: "Verrouillage",
    autolockAfter: "Verrouiller après inactivité",
    lockOnHide: "Verrouiller quand l'onglet est masqué",
    sectionPrivacy: "Confidentialité",
    hideCodes: "Masquer les codes jusqu'au tap",
    clipboardClear: "Auto-effacer le presse-papiers",
    sectionBackup: "Sauvegarde",
    backupHint: "La sauvegarde est le coffre chiffré tel quel — illisible sans la phrase de passe.",
    exportVault: "Exporter le coffre",
    importVault: "Importer…",
    sectionPassphrase: "Changer la phrase de passe",
    currentPass: "Phrase actuelle",
    newPass: "Nouvelle phrase",
    confirmNew: "Confirmez",
    changePass: "Changer la phrase de passe",
    passChanged: "Phrase de passe changée",
    sectionDanger: "Zone dangereuse",
    wipeHint: "Tapez EFFACER puis confirmez pour détruire le coffre de cet appareil.",
    wipePlaceholder: "EFFACER",
    wipeAll: "Tout effacer",
    sectionAppearance: "Apparence",
    theme: "Thème",
    themeLight: "Clair",
    themeDark: "Sombre",
    themeSystem: "Système",
    language: "Langue",
    sectionStats: "Statistiques",
    close: "Fermer",

    qrScanTitle: "Scanner un QR code",
    qrScanHint: "Pointez votre caméra vers le QR code otpauth.",
    qrNoCamera: "Caméra indisponible. Utilisez un contexte sécurisé (HTTPS) et accordez la permission.",
    qrStop: "Arrêter",

    imported: "Coffre importé",
    exported: "Coffre exporté",
    wiped: "Coffre effacé",
    importedNeedsPass: "Saisissez la phrase de passe de la sauvegarde pour l'installer",

    seconds: "s",
    now: "maintenant",
    updated: "mis à jour",
    copiedN: "Copié {code}",
  },
} as const;

export type StringKey = keyof (typeof STRINGS)["en"];

export function t(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string {
  let s: string = (STRINGS[lang] as Record<StringKey, string>)[key] || (STRINGS.en as Record<StringKey, string>)[key] || key;
  if (vars) {
    for (const k of Object.keys(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
    }
  }
  return s;
}
