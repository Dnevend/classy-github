import SyntaxHighlighter from "react-syntax-highlighter";
import { SyntaxHighlighterProps } from "react-syntax-highlighter";
import { a11yLight } from "react-syntax-highlighter/dist/esm/styles/hljs";

export const CodeRender = ({
  children,
}: {
  children: SyntaxHighlighterProps["children"];
}) => {
  return <SyntaxHighlighter style={a11yLight}>{children}</SyntaxHighlighter>;
};
