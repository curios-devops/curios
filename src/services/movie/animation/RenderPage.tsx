// /render/animation?key=…#s=… — the page the Cloud Run job animation-recorder opens in a headless browser
// (window size = the video's shape). It plays the animation once from the start with the narrator, records
// it (Player in recorder mode), uploads the video and its picture to Cloudinary (fields signed by the
// studio with the render secret) and reports. window.__render tells the job how it went: 'ok' or 'error: …'.
// Outside the app shell; useless without the secret (the studio refuses its reports).
import { useEffect, useState } from 'react';
import { findAnimation, renderReport, uploadSigned, type Animation } from './animationStudio.ts';
import { Player, type Film } from './AnimationScene.tsx';
import { LanguageProvider } from '../../../contexts/LanguageContext.tsx';
import { ThemeProvider } from '../../../components/theme/ThemeContext.tsx';

declare global { interface Window { __render?: string } }

// Outside the app shell, so it brings the two providers the player reads (language, theme).
export default function RenderPage() {
  return <LanguageProvider><ThemeProvider><Recorder /></ThemeProvider></LanguageProvider>;
}

function Recorder() {
  const key = new URLSearchParams(window.location.search).get('key') ?? '';
  const secret = new URLSearchParams(window.location.hash.slice(1)).get('s') ?? '';
  const [animation, setAnimation] = useState<Animation | null>(null);

  useEffect(() => {
    findAnimation(key)
      .then((f) => { if (f.animation) setAnimation(f.animation); else window.__render = 'error: not found'; })
      .catch((e) => { window.__render = `error: ${String(e)}`; });
  }, [key]);

  const onFilm = async (film: Film | null) => {
    try {
      if (!film) throw new Error('the recording broke off');
      const signed = await renderReport({ action: 'render_upload', key, secret });
      if (!signed.video || !signed.poster) throw new Error('upload not signed');
      const [videoUrl, posterUrl] = await Promise.all([uploadSigned(signed.video, film.video), film.poster ? uploadSigned(signed.poster, film.poster) : null]);
      await renderReport({ action: 'render_done', key, secret, video_url: videoUrl, poster_url: posterUrl, seconds: film.seconds });
      window.__render = 'ok';
    } catch (e) {
      window.__render = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  };

  if (!animation) return null;
  return <Player animation={animation} animationKey={key.replace(/\|portrait$/, '')} recorder={{ fill: true, onFilm: (f) => void onFilm(f) }} />;
}
