import SyntaxHighlighter from "react-syntax-highlighter";
import { SyntaxHighlighterProps } from "react-syntax-highlighter";
import {
  a11yLight,
  a11yDark,
} from "react-syntax-highlighter/dist/esm/styles/hljs";

const themeMap = {
  a11yLight: a11yLight,
  a11yDark: a11yDark,
};

export const CodeRender = (
  props: SyntaxHighlighterProps & { theme?: "a11yLight" | "a11yDark" }
) => {
  const { theme = "a11yLight", ...originProps } = props;

  return (
    <SyntaxHighlighter style={themeMap[theme]} {...originProps}>
      {props.children}
    </SyntaxHighlighter>
  );
};
