const pages = new Set(['courses', 'colleges', 'categories', 'calculator', 'saved', 'account', 'study']);

export function routeView(route: string) {
  const [page, query] = route.replace(/^#\//, '').split('?');
  // Retain course links shared before the three-tool homepage was introduced.
  if (!page) return query !== undefined ? 'courses' : 'home';
  if (page === 'study/log') return 'study';
  return pages.has(page) ? page : 'home';
}
