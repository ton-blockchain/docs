'use client';

import Image from 'next/image';
import logoDark from '@/public/logo/dark.svg';
import logoLight from '@/public/logo/light.svg';
import styles from './logo.module.css';

export function ThemeLogo() {
  return (
    <>
      <Image
        alt="TON Docs"
        src={logoLight}
        width={100}
        height={100}
        sizes="32px"
        className={`h-8 w-auto ${styles.lightLogo}`}
        aria-label="TON Docs"
      />
      <Image
        alt="TON Docs"
        src={logoDark}
        width={100}
        height={100}
        sizes="32px"
        className={`h-8 w-auto ${styles.darkLogo}`}
        aria-label="TON Docs"
      />
    </>
  );
}
