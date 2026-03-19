"use client";

import Link from "next/link";
import { FiTag } from "react-icons/fi";
import { Chip } from "@heroui/react";
import { usePathname } from "next/navigation";

export function Tag({ name }: { name: string }) {
  const pathname = usePathname();
  const tagLink = `/tags/${encodeURIComponent(name)}`;
  const isActive = pathname === tagLink || pathname.startsWith(`${tagLink}/`);

  return (
    <Link href={tagLink} passHref>
      <Chip
        size="sm"
        variant="flat"
        color={isActive ? "primary" : "secondary"}
        className="px-2 py-1 text-xs font-medium gap-1 inline-flex items-center cursor-pointer hover:shadow-xs transition-all dark:text-default-200"
        startContent={<FiTag className="w-3 h-3" />}
      >
        {name}
      </Chip>
    </Link>
  );
}

export function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 my-4">
      {tags.map((tag, index) => (
        <Tag key={index} name={tag} />
      ))}
    </div>
  );
}
