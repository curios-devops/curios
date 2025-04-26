import { useMemo } from "react";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import { LanguageCode } from "../types/language.ts";

type TranslationKey =
  | "home"
  | "explore"
  | "spaces"
  | "library"
  | "signUp"
  | "signIn"
  | "searchPlaceholder";

const translations: Record<LanguageCode, Record<TranslationKey, string>> = {
  en: {
    home: "Home",
    explore: "Explore",
    spaces: "Spaces",
    library: "Library",
    signUp: "Sign Up",
    signIn: "Sign In",
    searchPlaceholder: "Ask anything...",
  },
  pt: {
    home: "Início",
    explore: "Explorar",
    spaces: "Espaços",
    library: "Biblioteca",
    signUp: "Cadastrar",
    signIn: "Entrar",
    searchPlaceholder: "Pergunte qualquer coisa...",
  },
  es: {
    home: "Inicio",
    explore: "Explorar",
    spaces: "Espacios",
    library: "Biblioteca",
    signUp: "Registrarse",
    signIn: "Iniciar Sesión",
    searchPlaceholder: "Pregunta lo que quieras...",
  },
  de: {
    home: "Startseite",
    explore: "Entdecken",
    spaces: "Räume",
    library: "Bibliothek",
    signUp: "Registrieren",
    signIn: "Anmelden",
    searchPlaceholder: "Frag einfach...",
  },
  fr: {
    home: "Accueil",
    explore: "Explorer",
    spaces: "Espaces",
    library: "Bibliothèque",
    signUp: "S'inscrire",
    signIn: "Se connecter",
    searchPlaceholder: "Posez votre question...",
  },
  ca: {
    home: "Inici",
    explore: "Explorar",
    spaces: "Espais",
    library: "Biblioteca",
    signUp: "Registrar-se",
    signIn: "Iniciar sessió",
    searchPlaceholder: "Pregunta el que vulguis...",
  },
  it: {
    home: "Home",
    explore: "Esplora",
    spaces: "Spazi",
    library: "Libreria",
    signUp: "Registrati",
    signIn: "Accedi",
    searchPlaceholder: "Chiedi qualsiasi cosa...",
  },
  ru: {
    home: "Главная",
    explore: "Исследовать",
    spaces: "Пространства",
    library: "Библиотека",
    signUp: "Регистрация",
    signIn: "Войти",
    searchPlaceholder: "Спрашивайте что угодно...",
  },
  zh: {
    home: "首页",
    explore: "探索",
    spaces: "空间",
    library: "图书馆",
    signUp: "注册",
    signIn: "登录",
    searchPlaceholder: "问任何问题...",
  },
  ko: {
    home: "홈",
    explore: "탐색",
    spaces: "공간",
    library: "도서관",
    signUp: "회원가입",
    signIn: "로그인",
    searchPlaceholder: "무엇이든 물어보세요...",
  },
  ja: {
    home: "ホーム",
    explore: "探索",
    spaces: "スペース",
    library: "ライブラリ",
    signUp: "新規登録",
    signIn: "ログイン",
    searchPlaceholder: "何でも聞いてください...",
  },
};

export function useTranslation() {
  const { currentLanguage } = useLanguage();

  const t = useMemo(() => {
    return (key: TranslationKey) => {
      const lang = currentLanguage.code as LanguageCode;
      return translations[lang]?.[key] || translations.en[key] || key;
    };
  }, [currentLanguage.code]);

  return { t };
}
