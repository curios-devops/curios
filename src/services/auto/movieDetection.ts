// Movie 🍿 detection — an automatic specialization of Video, not a separate mode.
// Local and instant (no LLM call): explicit film words or an unambiguous franchise
// name. Deliberately conservative — titles that double as everyday words or history
// (Titanic, Avatar, Frozen, Dune, Alien…) are left out so "why did the Titanic sink"
// stays a history Video.

const FILM_WORDS =
  /\b(movies?|films?|pel[ií]culas?|pelis?|filmes?|trailers?|tr[aá]ilers?|sequels?|prequels?|secuelas?|precuelas?|box office|taquilla|cast of|reparto de|who played|qui[eé]n interpret[oó])\b|映画/i;

const FRANCHISES =
  /\b(star wars|harry potter|lord of the rings|se[ñn]or de los anillos|the hobbit|el hobbit|jurassic (park|world)|toy story|avengers|vengadores|spider-?man|batman|superman|james bond|indiana jones|back to the future|volver al futuro|the godfather|el padrino|pirates of the caribbean|piratas del caribe|fast (and|&) furious|r[aá]pidos y furiosos|mission:? impossible|misi[oó]n:? imposible|star trek|terminator|shrek|pixar|studio ghibli|interstellar)\b/i;

// Shopping for merchandise isn't a question about the film.
const SHOPPING = /\b(buy|comprar|price|precio|lego|toys?|juguetes?|deals?|ofertas?)\b/i;

export function isMovieQuery(query: string): boolean {
  if (SHOPPING.test(query)) return false;
  return FILM_WORDS.test(query) || FRANCHISES.test(query);
}
