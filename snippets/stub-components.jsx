import Link from 'fumadocs-core/link';

/**
 * Shim component for the Mintlify -> Fumadocs migration.
 * TODO: keep it as is or take from OpenAPI
 *
 * @param {{
 *    path: string,
 *    body: string,
 *    type: string,
 *    default: any,
 *    required: boolean,
 *    children: any,
 *  }} props
 */
export const ParamField = ({ path = '', body = '', type = '', required = false, children }) => (
  <div className="my-3">
    <p className="font-mono text-sm">
      <span className="font-bold">{path || body}</span>
      {type && <span className="ml-2 opacity-70">{type}</span>}
      {required && <span className="ml-2 text-red-500">required</span>}
    </p>
    {children}
  </div>
);

/**
 * Shim component for the Mintlify -> Fumadocs migration.
 * TODO: keep it as is or take from OpenAPI
 *
 * @param {{
 *    name: string,
 *    type: string,
 *    required: boolean,
 *    default: any,
 *    children: any,
 *  }} props
 */
export const ResponseField = ({ name = '', type = '', required = false, children }) => (
  <div className="my-3">
    <p className="font-mono text-sm">
      <span className="font-bold">{name}</span>
      {type && <span className="ml-2 opacity-70">{type}</span>}
      {required && <span className="ml-2 text-red-500">required</span>}
    </p>
    {children}
  </div>
);

/**
 * Shim component for the Mintlify -> Fumadocs migration.
 * TODO: Lightweight shim, enhance further.
 *
 * @param {{
 *   tip: string,
 *   cta: string,
 *   href: string,
 *   children: any
 * }} props
 */
export const Tooltip = ({ tip = '', cta = '', href = '', children }) => (
  <span title={tip} className="underline decoration-dotted decoration-fd-muted-foreground">
    {children}
    {cta && href && (
      <>
        {' '}
        <Link href={href}>{cta}</Link>
      </>
    )}
  </span>
);
