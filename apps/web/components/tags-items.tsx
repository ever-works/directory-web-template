"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronUpIcon, SearchIcon } from "lucide-react";

export type TagOption = {
  id: string;
  name: string;
};

export type SortOption = {
  value: string;
  label: string;
};

export type TagsFilterProps = {
  tags: TagOption[];
  onTagsChange: (selectedTags: string[]) => void;
  onSortChange: (sortOption: string) => void;
  className?: string;
};

const sortOptions: SortOption[] = [
  { value: "time-desc", label: "Sort by Time (dsc)" },
  { value: "time-asc", label: "Sort by Time (asc)" },
  { value: "name-desc", label: "Sort by Name (dsc)" },
  { value: "name-asc", label: "Sort by Name (asc)" },
];

export default function TagsFilter({
  tags,
  onTagsChange,
  onSortChange,
  className,
}: TagsFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState(sortOptions[0]);

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selectedTags.length === filteredTags.length) {
      setSelectedTags([]);
    } else {
      setSelectedTags(filteredTags.map((tag) => tag.id));
    }
  };

  const handleTagSelection = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((id) => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleSortSelection = (sortOption: SortOption) => {
    setSelectedSort(sortOption);
    setSortMenuOpen(false);
    onSortChange(sortOption.value);
  };

  useEffect(() => {
    onTagsChange(selectedTags);
  }, [selectedTags, onTagsChange]);

  return (
    <div className={cn("flex flex-col rounded-lg bg-gray-900", className)}>
      <div className="relative p-3 pb-2">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tags..."
            className="w-full bg-gray-800/50 text-gray-100 text-sm rounded-md py-2 pl-9 pr-3 focus:outline-hidden focus:ring-1 focus:ring-theme-primary-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="px-2 py-1 max-h-60 overflow-y-auto">
        <label className="flex items-center px-2 py-1.5 hover:bg-gray-800/50 rounded-sm cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded-sm border-gray-600 bg-gray-800 text-theme-primary-500 focus:ring-theme-primary-500 focus:ring-offset-gray-900"
            checked={
              selectedTags.length === filteredTags.length &&
              filteredTags.length > 0
            }
            onChange={handleSelectAll}
          />
          <span className="ml-2 text-gray-300 text-sm">Select all</span>
        </label>

        {filteredTags.map((tag) => (
          <label
            key={tag.id}
            className="flex items-center px-2 py-1.5 hover:bg-gray-800/50 rounded-sm cursor-pointer"
          >
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                className={cn(
                  "h-4 w-4 rounded-sm border-gray-600 bg-gray-800 focus:ring-offset-gray-900",
                  selectedTags.includes(tag.id)
                    ? "text-theme-primary-500 focus:ring-theme-primary-500"
                    : "text-gray-600"
                )}
                checked={selectedTags.includes(tag.id)}
                onChange={() => handleTagSelection(tag.id)}
              />
              {selectedTags.includes(tag.id) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-3 w-3 bg-theme-primary-500 rounded-xs" />
                </div>
              )}
            </div>
            <span className="ml-2 text-gray-300 text-sm">{tag.name}</span>
          </label>
        ))}

        {filteredTags.length === 0 && (
          <div className="text-center py-2 text-gray-400 text-sm">
            No tags found
          </div>
        )}
      </div>

      <div className="px-2 mt-2">
        <div className="relative">
          <button
            onClick={() => setSortMenuOpen(!sortMenuOpen)}
            className="w-full flex items-center justify-between p-2.5 bg-gray-800/70 hover:bg-gray-800 text-gray-200 rounded-md text-sm"
          >
            <span className="flex items-center gap-1 font-medium">
              {selectedSort.label}
            </span>
            {sortMenuOpen ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </button>

          {sortMenuOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-gray-800 rounded-md overflow-hidden shadow-lg">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  className={cn(
                    "w-full text-left px-3 py-2.5 text-sm",
                    option.value === selectedSort.value
                      ? "bg-gray-700 text-theme-primary-400"
                      : "text-gray-300 hover:bg-gray-700"
                  )}
                  onClick={() => handleSortSelection(option)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
