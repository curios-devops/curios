// Which language to listen and answer in. With Auto Detect on (Settings) the question's own language
// wins; when it can't be told, the app's language; with no app language, the browser's.
export const browserLanguage = () => navigator.language.split('-')[0] || 'en';

export function answerLanguage(detected: string | null, autoDetect: boolean, appLanguage: string | null | undefined): string {
  return (autoDetect && detected) || appLanguage || browserLanguage();
}

/** Speech-to-text: 'auto' lets the engine tell the spoken language when Auto Detect is on. */
export const listenLanguage = (autoDetect: boolean, appLanguage: string | null | undefined): string =>
  autoDetect ? 'auto' : appLanguage || browserLanguage();
