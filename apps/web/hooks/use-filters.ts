import { FilterContext } from "@/components/filters/context/filter-context";
import { useContext } from "react";

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be used within a FilterProvider");
  }
  return context;
}