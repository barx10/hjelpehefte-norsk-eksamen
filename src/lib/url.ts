/** Lager en adresse som tar hensyn til base-stien (GitHub Pages ligger under et undernavn). */
export function url(sti = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${sti.replace(/^\//, '')}`;
}
