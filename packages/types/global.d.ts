import { Theme } from "@classy/shared";

type ClassyConfig = {
  theme: Theme;
  profile: {
    repos: {
      visible: boolean;
      showCount: number;
    };
    cover: string;
    showFollowers: boolean;
    showFollowing: boolean;
  };
  gists: {
    prefix: `Classy` | string;
    split: string;
    default: string;
    type: {
      name: string;
      desc?: string;
    }[];
  };
  links?: {
    title: string;
    href: string;
  }[];
};
