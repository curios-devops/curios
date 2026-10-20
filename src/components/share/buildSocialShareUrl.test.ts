import { describe, expect, it } from 'vitest';
import { buildCrawlerShareUrl, buildShareHref } from './buildSocialShareUrl';

const payload = {
  title: 'Banderas de Andorra',
  description: 'La bandera de Andorra es un tricolor vertical azul, amarillo y rojo con el escudo en el centro.',
  imageUrls: ['https://example.com/andorra.jpg'],
  deepLink: 'https://curiosai.com/movie/share/abc',
};

describe('WhatsApp share', () => {
  it('sends a link that serves its own preview (title, snippet, image), not the bare SPA page', () => {
    const link = new URL(buildCrawlerShareUrl(payload));
    expect(link.origin + link.pathname).toBe('https://curiosai.com/share');
    expect(link.searchParams.get('q')).toBe('Banderas de Andorra');
    expect(link.searchParams.get('i')).toBe('https://example.com/andorra.jpg');
    expect(link.searchParams.get('r')).toBe(payload.deepLink);
  });

  it('sends only the link, so the title shows once — in the preview card on top', () => {
    const href = new URL(buildShareHref('whatsapp', payload)!);
    expect(href.searchParams.get('text')).toBe(buildCrawlerShareUrl(payload));
  });

  it('keeps short /s/ links as they are (they already serve their own preview)', () => {
    expect(buildCrawlerShareUrl({ ...payload, deepLink: 'https://curiosai.com/s/wgA9yANdxCw' })).toBe('https://curiosai.com/s/wgA9yANdxCw');
  });
});
