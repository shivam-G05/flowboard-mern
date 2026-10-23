import { useEffect } from 'react';

function setMeta(name, content) {
  let tag = document.head.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

/**
 * Per-page <title>, description and robots directive.
 * Private pages pass noindex so search engines never index a signed-in dashboard.
 * (This runs client-side: crawlers that don't execute JS only see index.html — see README "SEO".)
 */
export function useDocumentMeta({ title, description, noindex = false }) {
  useEffect(() => {
    document.title = title ? `${title} · Flowboard` : 'Flowboard — Task management with workflows and SLAs';
    if (description) setMeta('description', description);
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');
  }, [title, description, noindex]);
}
