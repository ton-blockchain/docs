import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import type { ImageResponseOptions } from 'next/server';

function toSvgDataUri(content: string) {
  return `data:image/svg+xml;base64,${Buffer.from(content).toString('base64')}`;
}

function truncateText(value: ReactNode, maxLength: number) {
  if (typeof value !== 'string') return value;
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

const interRegular = readFileSync('./public/fonts/Inter-Regular.ttf');
const interSemiBold = readFileSync('./public/fonts/Inter-SemiBold.ttf');
const tonDocsLogomark = toSvgDataUri(readFileSync('./public/logo/dark.svg', 'utf8'));
const bgImage = toSvgDataUri(readFileSync('./public/logo/og-image-bg.svg', 'utf8'));

export function getImageResponseOptions(): ImageResponseOptions {
  return {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Inter',
        weight: 400,
        data: interRegular,
      },
      {
        name: 'Inter',
        weight: 600,
        data: interSemiBold,
      },
    ],
  };
}

export function generate({
  title,
  url,
  description,
}: {
  title: string;
  url: string;
  description?: string | undefined;
}) {
  const primaryTextColor = 'rgb(248, 250, 252)';
  const secondaryTextColor = 'rgba(248, 250, 252, 0.85)';
  const mutedTextColor = "rgba(248, 250, 252, 0.7)"
  const cardTitle = truncateText(title, 90);
  const cardDescription = description
    ? truncateText(description, 180)
    : 'The Open Network: a fast, scalable layer-1 blockchain for smart contracts, apps, and payments.';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        fontFamily: 'Inter',
      }}
    >
      <img
        src={bgImage}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          width: '100%',
          height: '100%',
          padding: '54px 72px',
        }}
      >
        <img
          src={tonDocsLogomark}
          alt="TON Docs"
          style={{
            width: 180,
            height: 60,
            objectFit: 'contain',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            marginTop: 'auto',
            maxWidth: 900,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 70,
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: -1.8,
              color: primaryTextColor,
              wordBreak: 'break-word',
            }}
          >
            {cardTitle}
          </p>
          {cardDescription && (
            <p
              style={{
                margin: 0,
                fontSize: 30,
                lineHeight: 1.35,
                color: secondaryTextColor,
                wordBreak: 'break-word',
              }}
            >
              {cardDescription}
            </p>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              margin: 0,
              fontSize: 20,
              color: mutedTextColor,
              wordBreak: 'break-word',

            }}>
            <div
              style={{
                display: "flex",
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "#0AAAFF",
                boxShadow: "0 0 6px rgba(26, 201, 255, 0.8)",
              }}
            />
            <span>{url}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
