import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  introSidebar: [
    "index",
    {
      type: "category",
      label: "Overview",
      items: ["overview/platform", "overview/template"],
    },
    "comparison",
    "glossary",
    "faq",
    "support",
    "contributing",
    "changelog",
    "roadmap",
  ],
};

export default sidebars;
