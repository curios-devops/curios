import { describe, it, expect } from 'vitest';
import { isMovieQuery } from './movieDetection.ts';

describe('isMovieQuery (Movie 🍿 specialization of Video)', () => {
  // A bare franchise name is the core case: the user typed a film, not a topic.
  it('detects franchise names with no film word', () => {
    expect(isMovieQuery('Star Wars')).toBe(true);
    expect(isMovieQuery('¿Cómo termina El Señor de los Anillos?')).toBe(true);
  });

  it('detects explicit film words in several languages', () => {
    expect(isMovieQuery('mejor película de 2025')).toBe(true);
    expect(isMovieQuery('trailer de la nueva de Nolan')).toBe(true);
    expect(isMovieQuery('who played Gandalf')).toBe(true);
  });

  // Actors, directors and what's on in cinemas are movie questions too.
  it('detects actor, director and showtime questions', () => {
    expect(isMovieQuery('mejor actriz de 2025')).toBe(true);
    expect(isMovieQuery('filmografía de Almodóvar')).toBe(true);
    expect(isMovieQuery('cartelera de cine en Santiago')).toBe(true);
    expect(isMovieQuery('showtimes near me')).toBe(true);
  });

  // Titles that are also history/science must keep their normal Video route.
  it('leaves ambiguous titles and normal curiosity questions alone', () => {
    expect(isMovieQuery('¿Por qué se hundió el Titanic?')).toBe(false);
    expect(isMovieQuery('how do black holes form')).toBe(false);
    expect(isMovieQuery('what is an avatar')).toBe(false);
  });

  // Buying merch belongs to Search (sponsor carousel), not the film experience.
  it('does not hijack shopping queries', () => {
    expect(isMovieQuery('comprar lego star wars')).toBe(false);
    expect(isMovieQuery('star wars toys price')).toBe(false);
  });
});
