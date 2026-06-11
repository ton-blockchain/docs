/**
 * Temporary, stub components for the Mintlify -> Fumadocs migration.
 */

/** @param {{
 *    title: string,
 *    href: string,
 *    icon: string,
 *    horizontal: boolean,
 *    arrow: boolean,
 *    children: any,
 *  }} props
 */
export const Card = ({
  title,
  href = '',
  icon = '',
  horizontal = false,
  arrow = false,
  children,
}) => {
  return <>{children}</>;
};

/** @param {{ children: any }} props */
export const Cards = ({ children }) => {
  return <>{children}</>;
};

/** @param {{
 *    path: string,
 *    body: string,
 *    type: string,
 *    default: any,
 *    required: boolean,
 *    children: any,
 *  }} props
 */
export const ParamField = ({
  path = '',
  body = '',
  type = '',
  required = false,
  children,
}) => (
  <div className="my-3">
    <p className="font-mono text-sm">
      <span className="font-bold">{path || body}</span>
      {type && <span className="ml-2 opacity-70">{type}</span>}
      {required && <span className="ml-2 text-red-500">required</span>}
    </p>
    {children}
  </div>
);

/** @param {{
 *    name: string,
 *    type: string,
 *    required: boolean,
 *    default: any,
 *    children: any,
 *  }} props
 */
export const ResponseField = ({
  name = '',
  type = '',
  required = false,
  children,
}) => (
  <div className="my-3">
    <p className="font-mono text-sm">
      <span className="font-bold">{name}</span>
      {type && <span className="ml-2 opacity-70">{type}</span>}
      {required && <span className="ml-2 text-red-500">required</span>}
    </p>
    {children}
  </div>
);

/** @param {{ title: string, noAnchor: boolean, children: any }} props */
export const Step = ({ title = '', children }) => (
  <div className="my-3">
    {title && <p className="font-bold">{title}</p>}
    {children}
  </div>
);

/** @param {{ children: any }} props */
export const Steps = ({ children }) => <div className="my-4">{children}</div>;

/** @param {{ cols: number, children: any }} props */
export const Columns = ({ children }) => (
  <div className="my-4 flex flex-wrap gap-4">{children}</div>
);

/** @param {{ cols: number, children: any }} props */
export const CardGroup = ({ children }) => (
  <div className="my-4 flex flex-wrap gap-4">{children}</div>
);

/** @param {{ children: any }} props */
export const AccordionGroup = ({ children }) => (
  <div className="my-4">{children}</div>
);

/** @param {{ children: any }} props */
export const CodeGroup = ({ children }) => (
  <div className="my-4">{children}</div>
);

/** @param {{ title: string, children: any }} props */
export const Expandable = ({ title = '', children }) => (
  <details className="my-4">
    {title && <summary className="font-bold">{title}</summary>}
    {children}
  </details>
);

/**
 * @param {{
 *   tip: string,
 *   cta: string,
 *   href: string,
 *   children: any
 * }} props
 */
export const Tooltip = ({ tip = '', cta = '', href = '', children }) => (
  <span title={tip}>
    {children}
    {cta && href && (
      <>
        {' '}
        <a href={href}>{cta}</a>
      </>
    )}
  </span>
);

/**
 * @param {{
 *   color: string,
 *   size: string,
 *   children: any
 * }} props
 */
export const Badge = ({ children }) => (
  <span className="inline-block rounded px-1.5 py-0.5 text-xs border">
    {children}
  </span>
);

/**
 * @param {{
 *   icon: string,
 *   size: number,
 *   iconType: string
 * }} props
 */
export const Icon = ({ icon = '', size = 16 }) => (
  <span
    className="inline-block align-middle"
    style={{ width: size, height: size }}
    aria-label={icon}
  />
);
