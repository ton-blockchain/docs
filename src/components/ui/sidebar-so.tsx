'use client';

import { useEffect } from 'react';

export function SidebarSingleOpen() {
  const selector = 'aside#nd-sidebar > div > div > div > div[data-state]';
  useEffect(() => {
    const sidebar = document.querySelector('aside#nd-sidebar');
    if (!sidebar) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const foldersBefore = Array.from(document.querySelectorAll<HTMLElement>(selector));
      const clickedFolder = target.closest<HTMLElement>(selector);
      const clickedIndex = clickedFolder ? foldersBefore.indexOf(clickedFolder) : -1;
      if (clickedIndex === -1) return;

      requestAnimationFrame(() => {
        const folders = Array.from(document.querySelectorAll<HTMLElement>(selector));
        const clicked = folders[clickedIndex];
        if (!clicked || clicked.dataset.state !== 'open') return;

        folders.forEach((folder, index) => {
          if (index === clickedIndex || folder.dataset.state !== 'open') return;
          const trigger = folder.querySelector<HTMLElement>(
            ':scope > button[aria-expanded="true"], :scope > a[aria-expanded="true"]',
          );
          trigger?.click();
        });
      });
    };

    // @ts-ignore
    sidebar.addEventListener('click', onClick);
    // @ts-ignore
    return () => sidebar.removeEventListener('click', onClick);
  }, []);

  return null;
}
