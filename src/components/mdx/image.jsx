'use client';

import Link from 'fumadocs-core/link';
import { ImageZoom } from './image-zoom';
import { Callout } from './callout';

/**
 * @param {{
 *   src: string,
 *   darkSrc?: string,
 *   alt?: string,
 *   darkAlt?: string,
 *   href?: string,
 *   target?: '_self' | '_blank' | '_parent' | '_top' | '_unfencedTop',
 *   height?: string | number,
 *   width?: string | number,
 *   noZoom?: string | boolean,
 *   center?: string | boolean,
 *   fullWidth?: string | boolean,
 *   caption?: string,
 * }} props
 */
export const Image = ({
  src,
  darkSrc,
  alt = '',
  darkAlt,
  href,
  target,
  height = 342,
  width = 608,
  noZoom = false,
  center = true,
  fullWidth = false,
  caption = '',
}) => {
  const isSVG = src.match(/\.svg(?:[#?].*?)?$/i) !== null;
  const shouldInvert = isSVG && !darkSrc;
  const shouldCreateLink = href !== undefined;
  const minPx = 9;
  const maxPx = 900;
  const expectedPx = `a number or a string with a number that is greater than ${minPx - 1} and less than or equal to ${maxPx}`;

  /**
   * @param title {string}
   * @param received {string | number}
   * @param expected {string | number}
   */
  const createInvalidPropCallout = (title, received, expected) => {
    return (
      // @ts-ignore
      <Callout type="danger">
        <span className="font-bold">
          Invalid <code>{title.toString()}</code> passed!
        </span>
        <br />
        <span className="font-bold">Received: </span>
        {received.toString()}
        <br />
        <span className="font-bold">Expected: </span>
        {expected.toString()}
        {/* @ts-ignore */}
      </Callout>
    );
  };

  /** @param value {string | number} */
  const checkValidDimensionValue = (value) => {
    switch (typeof value) {
      case 'string':
      case 'number':
        const num = Number(value);
        return Number.isSafeInteger(num) && num >= minPx && num <= maxPx;
      default:
        return false;
    }
  };

  // Collect error callouts
  let callouts = [];

  // Invalid image height (in pixels)
  if (height && !checkValidDimensionValue(height)) {
    callouts.push(createInvalidPropCallout('height', height, expectedPx));
  }

  // Invalid image width (in pixels)
  if (width && !checkValidDimensionValue(width)) {
    callouts.push(createInvalidPropCallout('width', width, expectedPx));
  }

  // Display all errors
  if (callouts.length !== 0) {
    return callouts;
  }

  // Resulting pixel dimensions
  const heightPx = Number(height);
  const widthPx = Number(width);

  // Typecast string | boolean values to boolean-only
  const shouldCenter = center === 'true' || center === true ? true : false;
  const shouldNotZoom =
    noZoom === 'true' || noZoom === true || shouldCreateLink || shouldInvert ? true : false;
  const shouldUseFullWidth = fullWidth === 'true' || fullWidth === true ? true : false;
  const extraImageClasses = `${shouldUseFullWidth ? 'w-full h-auto' : ''} ${shouldNotZoom ? 'cursor-default' : ''}`;
  const extraWrapperClasses = `${shouldCenter ? 'flex justify-center' : ''} ${shouldUseFullWidth ? 'w-full' : ''}`;

  // Resulting images
  const images = (
    <>
      <ImageZoom
        className={`block dark:hidden ${extraImageClasses}`}
        src={src}
        alt={alt}
        height={heightPx}
        width={widthPx}
        data-rmiz-disabled={shouldNotZoom ? 'true' : undefined}
        // @ts-ignore
        {...(shouldNotZoom && {
          rmiz: { isDisabled: true },
        })}
      />
      <ImageZoom
        className={`hidden dark:block ${shouldInvert ? 'invert' : ''} ${extraImageClasses}`}
        src={darkSrc ?? src}
        alt={darkAlt ?? alt}
        height={heightPx}
        width={widthPx}
        data-rmiz-disabled={shouldNotZoom ? 'true' : undefined}
        // @ts-ignore
        {...(shouldNotZoom && {
          rmiz: { isDisabled: true },
        })}
      />
    </>
  );

  // Is a clickable link
  const mbLink = shouldCreateLink ? (
    <Link
      href={href}
      target={target ?? '_self'}
      className={shouldUseFullWidth ? 'block w-full' : undefined}
    >
      {images}
    </Link>
  ) : (
    images
  );

  // Should be centered horizontally
  const mbCentered = extraWrapperClasses.trim() ? (
    <span className={extraWrapperClasses}>{mbLink}</span>
  ) : (
    mbLink
  );

  // Has a non-empty caption
  if (caption !== '') {
    return (
      <figure className={shouldUseFullWidth ? 'w-full' : undefined}>
        {mbCentered}
        <figcaption className="mt-2 text-center text-sm italic text-fd-muted-foreground">
          {caption}
        </figcaption>
      </figure>
    );
  }

  // No caption, yet might be either clickable or centered (or both)
  return mbCentered;
};
