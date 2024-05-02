import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<"svg">>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: "简单使用",
    Svg: require("@site/static/img/undraw_docusaurus_mountain.svg").default,
    description: (
      <>
        无需任何部署配置，直接访问你的多种主题的个人主页和内容页面（博客/随笔/代码片段……）。
      </>
    ),
  },
  {
    title: "专注内容",
    Svg: require("@site/static/img/undraw_docusaurus_tree.svg").default,
    // TODO:
    description: <>无需注册，基于公开数据， 随时写下随笔文章，记录代码片段。</>,
  },
  {
    title: "个性化",
    Svg: require("@site/static/img/undraw_docusaurus_react.svg").default,
    description: (
      <>进阶配置，当不满足基础页面内容时，灵活定制你的个性化内容和主题样式。</>
    ),
  },
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
