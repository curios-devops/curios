// Back arrows return to the page that opened this one (e.g. Search → song → back to that
// Search). Opened straight from a link (no earlier page in the app) → Home.
import { useNavigate } from 'react-router-dom';

export function useGoBack() {
  const navigate = useNavigate();
  return () => {
    // React Router keeps the entry's position in history.state.idx (0 = first page of the visit).
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/');
  };
}
