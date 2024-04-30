import Markdown, { type Options } from "react-markdown";

import SyntaxHighlighter from "react-syntax-highlighter";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

export const MarkdownRender = ({
  children,
}: {
  children: Options["children"];
}) => {
  return (
    <Markdown
      components={{
        code(props) {
          const { children } = props;
          return (
            <SyntaxHighlighter PreTag="div" style={a11yDark}>
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          );
        },
      }}
    >
      {children}
    </Markdown>
  );
};
