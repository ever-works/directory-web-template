"use client";

import { ChevronDown, Layout, Sparkles } from "lucide-react";
import { useMemo, useCallback, useState, useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import {
  LayoutHome,
  ContainerWidth,
  useLayoutTheme,
} from "@/components/context/LayoutThemeContext";
import { Maximize2, Minimize2, LayoutGrid } from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useTranslations } from "next-intl";

const getLayoutMap = (isDark: boolean, t: any) =>
  ({
    Home_One: {
      name: "Home 1",
      description: t("CLASSIC_LAYOUT_DESC"),
      color: "blue",
      icon: <Layout className="w-3 h-3" />, // kept small inside panel
      preview: (
        <div className="relative w-full h-24 rounded-xl overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-linear-to-br from-theme-primary-100/20 to-theme-primary-200/20 dark:from-theme-primary-900/20 dark:to-theme-primary-800/20"></div>
          <Image
            src={isDark ? "/home-1.png" : "/home-light-1.png"}
            alt="Home 1 Layout Preview"
            fill
            className="object-cover object-top transition-all duration-700"
            sizes="(max-width: 768px) 100vw, 300px"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
            <span className="text-white text-[10px] font-semibold drop-shadow-lg">
              {t("CLASSIC_DESIGN")}
            </span>
            <div className="bg-white/20 backdrop-blur-md text-white px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-white/30">
              {t("VIEW_DEMO")}
            </div>
          </div>
        </div>
      ),
    },
    Home_Two: {
      name: "Home 2",
      description: t("GRID_LAYOUT_DESC"),
      color: "purple",
      icon: <LayoutGrid className="w-3 h-3" />,
      preview: (
        <div className="relative w-full h-24 rounded-xl overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-linear-to-br from-purple-100/20 to-pink-100/20 dark:from-purple-900/20 dark:to-pink-900/20"></div>
          <Image
            src={isDark ? "/home-2.png" : "/home-light-2.png"}
            alt="Home 2 Layout Preview"
            fill
            className="object-cover object-top transition-all duration-700"
            sizes="(max-width: 768px) 100vw, 300px"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
            <span className="text-white text-[10px] font-semibold drop-shadow-lg">
              {t("MODERN_GRID")}
            </span>
            <div className="bg-white/20 backdrop-blur-md text-white px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-white/30">
              {t("VIEW_DEMO")}
            </div>
          </div>
        </div>
      ),
    },
  }) as const;

interface LayoutSwitcherProps {
  inline?: boolean;
  iconOnly?: boolean;
}

export function LayoutSwitcher({ inline = false, iconOnly = false }: LayoutSwitcherProps) {
  const { layoutHome, setLayoutHome, containerWidth, setContainerWidth } = useLayoutTheme();
  const { theme, resolvedTheme } = useTheme();
  const t = useTranslations("common");
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const isDark =
    resolvedTheme === "dark" ||
    (theme === "system" && resolvedTheme === "dark");

  const layoutMap = useMemo(() => getLayoutMap(isDark, t), [isDark, t]);

  useEffect(() => {
    const handlePointerDownOutside = (event: PointerEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      const timeoutId = setTimeout(() => {
        document.addEventListener("pointerdown", handlePointerDownOutside, { capture: true });
        document.addEventListener("keydown", handleKeyDown);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("pointerdown", handlePointerDownOutside, { capture: true });
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen]);

  const currentLayout = useMemo(() => {
    const isValidLayout = (key: string): key is keyof typeof layoutMap => key in layoutMap;
    if (isValidLayout(layoutHome)) {
      return layoutMap[layoutHome];
    }
    return layoutMap.Home_One;
  }, [layoutMap, layoutHome]);

  const availableLayouts = useMemo(
    () =>
      Object.entries(layoutMap).map(([key, layout]) => ({
        key: key as LayoutHome,
        ...layout,
        isActive: key === layoutHome,
      })),
    [layoutMap, layoutHome]
  );

  const changeLayout = useCallback(
    (layout: LayoutHome) => {
      if (layout === layoutHome) return;
      setLayoutHome(layout);
      setIsOpen(false);
    },
    [layoutHome, setLayoutHome]
  );

  const containerWidthOptions: {
    value: ContainerWidth;
    label: string;
    icon: React.ReactNode;
    description: string;
  }[] = [
      {
        value: "fixed",
        label: t("FIXED_WIDTH"),
        icon: <Minimize2 className="w-3 h-3" />,
        description: t("FIXED_WIDTH_DESC"),
      },
      {
        value: "fluid",
        label: t("FULL_WIDTH"),
        icon: <Maximize2 className="w-3 h-3" />,
        description: t("FULL_WIDTH_DESC"),
      },
    ];

  const containerWidthSwitch = (
    <div className="mb-3 pb-2 border-b border-gray-200/50 dark:border-white/6">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Maximize2 className="w-3 h-3 text-gray-500 dark:text-gray-400" />
        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">
          {t("CONTAINER_WIDTH")}
        </span>
      </div>
      <div className="flex gap-1.5">
        {containerWidthOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setContainerWidth(option.value)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg transition-all duration-300 ${containerWidth === option.value
                ? "bg-linear-to-br from-theme-primary-500 to-theme-primary-600 text-white shadow-lg shadow-theme-primary-500/25"
                : "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/6"
              }`}
            title={option.description}
          >
            {option.icon}
            <span className="text-[10px] font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const layoutContent = (
    <div className="flex flex-col space-y-2">
      {availableLayouts.map(({ key, name, description, icon, preview, isActive }) => {
        return (
          <button
            key={key}
            className={`relative w-full p-3 rounded-lg transition-all duration-500 transform ${isActive
                ? "bg-linear-to-br from-theme-primary-50/50 via-white to-theme-primary-100/30 dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-theme-primary-950/30 border-2 border-theme-primary-400/50 dark:border-theme-primary-500/50 shadow-xl shadow-theme-primary-200/30 dark:shadow-theme-primary-900/20"
                : "bg-white/80 dark:bg-white/4 backdrop-blur-xs border border-gray-200/50 dark:border-white/6 hover:border-theme-primary-300 dark:hover:border-theme-primary-600 shadow-md hover:shadow-xl"
              }`}
            onClick={() => changeLayout(key)}
          >
            {isActive && (
              <div className="absolute inset-0 rounded-lg overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-theme-primary-400/10 via-transparent to-theme-primary-500/10 animate-gradient-shift"></div>
              </div>
            )}

            <div className="relative space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`relative p-1.5 rounded-lg transition-all duration-300 ${isActive
                        ? "bg-linear-to-br from-theme-primary-500 to-theme-primary-600 shadow-lg shadow-theme-primary-500/30"
                        : "bg-linear-to-br from-gray-100 to-gray-200 dark:from-white/6 dark:to-[#0a0a0a] group-hover:from-theme-primary-100 group-hover:to-theme-primary-200 dark:group-hover:from-theme-primary-900/30 dark:group-hover:to-theme-primary-800/30"
                      }`}
                  >
                    <div
                      className={
                        isActive
                          ? "text-white"
                          : "text-gray-600 dark:text-gray-400 group-hover:text-theme-primary-600 dark:group-hover:text-theme-primary-400"
                      }
                    >
                      {icon}
                    </div>
                    {isActive && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border-2 border-white dark:border-[#0a0a0a] animate-pulse"></div>
                    )}
                  </div>
                  <div className="text-left">
                    <h4
                      className={`font-bold text-xs transition-colors duration-300 ${isActive
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-700 dark:text-gray-200"
                        }`}
                    >
                      {name}
                    </h4>
                    <p
                      className={`text-[10px] transition-colors duration-300 ${isActive
                          ? "text-theme-primary-600 dark:text-theme-primary-400"
                          : "text-gray-500 dark:text-gray-400"
                        }`}
                    >
                      {description}
                    </p>
                  </div>
                </div>
                {isActive && (
                  <div className="flex items-center gap-1 px-2 bg-linear-to-r from-theme-primary-500 to-theme-primary-600 text-white rounded-full text-[9px] font-semibold shadow-lg animate-pulse">
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t("CURRENT")}
                  </div>
                )}
              </div>

              <div className="relative overflow-hidden rounded-md">{preview}</div>
              {!isActive && (
                <div className="absolute inset-0 bg-linear-to-t from-black/10 via-transparent to-transparent pointer-events-none"></div>
              )}
              {isActive && (
                <div className="absolute inset-0 rounded-md pointer-events-none"></div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  const showTooltip = (btn: HTMLButtonElement) => {
    const r = btn.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: r.left + r.width / 2 });
    setHovered(true);
  };

  const hideTooltip = () => setHovered(false);

  if (iconOnly) {
    return (
      <div className="relative" ref={popoverRef}>
        <button
          onClick={() => {
            hideTooltip();
            setIsOpen(!isOpen);
          }}
          onMouseEnter={(e) => showTooltip(e.currentTarget as HTMLButtonElement)}
          onMouseLeave={hideTooltip}
          onFocus={(e) => showTooltip(e.currentTarget as HTMLButtonElement)}
          onBlur={hideTooltip}
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg transition-all duration-200 text-gray-700 dark:text-gray-300 cursor-pointer"
          aria-label={t("LAYOUT")}
          aria-expanded={isOpen}
          aria-controls={isOpen ? panelId : undefined}
        >
          <Layout className="h-5 w-5" />
        </button>
        {hovered && typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed z-[9999] px-2 py-1 rounded-lg shadow-xl text-xs font-medium border pointer-events-none bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-800 dark:border-gray-300"
              style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
            >
              {t("LAYOUT")}
            </div>,
            document.body
          )}
        {isOpen && (
          <div
            id={panelId}
            className="absolute right-0 mt-2 p-3 w-[340px] max-h-[86vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full [&::-webkit-scrollbar]:w-1 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-xl border border-gray-200/50 dark:border-white/6 rounded-xl shadow-2xl z-50"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200/50 dark:border-white/6">
                <div className="relative">
                  <div className="p-1.5 bg-linear-to-br from-theme-primary-500 to-theme-primary-600 rounded-lg shadow-lg shadow-theme-primary-500/25">
                    <Layout className="h-4 w-4 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-2 border-white dark:border-[#0a0a0a] animate-pulse"></div>
                </div>
                <div>
                  <h3 className="text-xs font-bold bg-linear-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    {t("LAYOUT_SELECTION")}
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {t("CHOOSE_PREFERRED_DESIGN")}
                  </p>
                </div>
              </div>
              {containerWidthSwitch}
              {layoutContent}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (inline) {
    return layoutContent;
  }

  return (
    <div className="mx-1 relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 text-xs bg-linear-to-r from-gray-50 to-gray-100 dark:bg-[#0a0a0a] dark:text-white rounded-md hover:from-gray-100 hover:to-gray-200 dark:hover:from-white/6 dark:hover:to-white/6 transition-all duration-300 border border-gray-200 dark:border-white/6 hover:border-gray-300 dark:hover:border-white/8 group overflow-hidden shadow-xs hover:shadow-sm"
        aria-label={`Current layout: ${currentLayout.name}`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
      >
        <div className="relative z-10 flex items-center gap-1.5">
          <Layout className="h-3.5 w-3.5 text-theme-primary-500 dark:text-theme-primary-400" />
          <span className="font-medium">{t("LAYOUT")}</span>
          <ChevronDown
            className={`h-3 w-3 text-gray-500 dark:text-gray-400 transition-all duration-300 ${isOpen ? "rotate-180" : ""
              }`}
          />
        </div>
      </button>

      {isOpen && (
        <div
            id={panelId}
            className="absolute right-0 mt-2 p-3 w-[340px] max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full [&::-webkit-scrollbar]:w-1 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-xl border border-gray-200/50 dark:border-white/6 rounded-xl shadow-2xl z-50"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200/50 dark:border-white/6">
              <div className="relative">
                <div className="p-1.5 bg-linear-to-br from-theme-primary-500 to-theme-primary-600 rounded-lg shadow-lg shadow-theme-primary-500/25">
                  <Layout className="h-4 w-4 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-2 border-white dark:border-[#0a0a0a] animate-pulse"></div>
              </div>
              <div>
                <h3 className="text-xs font-bold bg-linear-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  {t("LAYOUT_SELECTION")}
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {t("CHOOSE_PREFERRED_DESIGN")}
                </p>
              </div>
            </div>
            {containerWidthSwitch}
            {layoutContent}
          </div>
        </div>
      )}
    </div>
  );
}