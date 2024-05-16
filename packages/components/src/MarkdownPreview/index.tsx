import UiwMarkdownPreview, {
  MarkdownPreviewProps,
} from "@uiw/react-markdown-preview";
import { isAbsolutePath } from "@classy/lib";
import { Element } from "hast";

export const MarkdownPreview = (
  props: MarkdownPreviewProps & {
    pathRewrite?: {
      absPath?: string;
      relativePath?: string;
    };
  }
) => {
  const { pathRewrite, ...originProps } = props;

  /**
   * 替换Markdown中的地址
   * 图片：替换相对路径为绝对路径地址
   * 链接：替换相对路径为绝对路径地址
   */
  const rewritePath = (node: Element) => {
    const { absPath = "", relativePath = "" } = pathRewrite || {};

    if (node.tagName === "img") {
      const { src, height, style = "" } = node.properties;

      if (Number.isInteger(height)) {
        node.properties.style = `${style} height: ${height}px`;
      }

      if (src && !isAbsolutePath(String(src))) {
        node.properties.src = `${absPath}${relativePath}${src}`;
      }
    }

    if (node.tagName === "a") {
      const { href } = node.properties;
      if (
        href &&
        !String(href).startsWith("#") &&
        !isAbsolutePath(String(href))
      ) {
        node.properties.href = `?file=${relativePath}${href}`;
      }
    }
  };

  return (
    <UiwMarkdownPreview
      {...originProps}
      rehypeRewrite={(node: Element, index, parent) => {
        if (node.tagName === "a") {
          const { href } = node.properties;
          if (isAbsolutePath(String(href))) {
            node.properties.target = "_blank";
          }
        }

        props.rehypeRewrite?.(node, index, parent);

        if (pathRewrite !== undefined) {
          rewritePath(node);
        }
      }}
    />
  );
};
