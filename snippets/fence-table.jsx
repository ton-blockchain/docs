/** @param {{ children: any }} props */
export const FenceTable = ({ children }) => {
  return (
    <pre
      style={{
        fontFamily: 'monospace',
        whiteSpace: 'pre',
        overflowX: 'auto',
        fontSize: '14px',
      }}
    >
      {children}
    </pre>
  );
};
