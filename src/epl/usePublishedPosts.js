import { useEffect, useState } from 'react';

export default function usePublishedPosts(fallbackPosts) {
  const [posts, setPosts] = useState(fallbackPosts);
  const [state, setState] = useState({ loading: true, source: 'mock', error: null });

  useEffect(() => {
    let alive = true;

    fetch('/api/feed')
      .then(response => {
        if (!response.ok) throw new Error(`Feed API returned ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (!alive) return;
        if (Array.isArray(data.items) && data.items.length > 0) {
          setPosts(data.items);
          setState({ loading: false, source: 'api', error: null });
        } else {
          setPosts(fallbackPosts);
          setState({ loading: false, source: 'mock', error: null });
        }
      })
      .catch(error => {
        if (!alive) return;
        setPosts(fallbackPosts);
        setState({ loading: false, source: 'mock', error: error.message });
      });

    return () => {
      alive = false;
    };
  }, [fallbackPosts]);

  return { posts, ...state };
}
