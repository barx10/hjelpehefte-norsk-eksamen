/** Lager en adresse som tar hensyn til base-stien (GitHub Pages ligger under et undernavn). */
export function url(sti = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${sti.replace(/^\//, '')}`;
}

/** Adresse til en side under et nivå, for eksempel nurl(nivaa, 'hefte/'). */
export function nurl(nivaa: { id: string }, sti = ''): string {
  return url(`${nivaa.id}/${sti.replace(/^\//, '')}`);
}
