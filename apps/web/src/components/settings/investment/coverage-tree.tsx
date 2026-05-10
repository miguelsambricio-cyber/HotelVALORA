"use client";

import { useState } from "react";
import { ChevronDown, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { COVERAGE_TREE } from "@/lib/investment";
import type { CoverageNode } from "@/lib/investment";

/**
 * Recursive expand/collapse tree of countries → markets → submarkets.
 * Open state lives in local React state (purely UI — doesn't need to
 * persist). v1: Spain + Madrid pre-expanded so the user lands with
 * the canonical default scope visible.
 */
export function CoverageTree() {
  const [openNodes, setOpenNodes] = useState<Set<string>>(
    new Set(["es", "es-madrid"]),
  );

  const toggle = (id: string) => {
    setOpenNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {COVERAGE_TREE.map((node) => (
        <CountryNode
          key={node.id}
          node={node}
          isOpen={openNodes.has(node.id)}
          openNodes={openNodes}
          onToggle={toggle}
        />
      ))}
    </div>
  );
}

interface CountryNodeProps {
  node: CoverageNode;
  isOpen: boolean;
  openNodes: Set<string>;
  onToggle: (id: string) => void;
}

function CountryNode({ node, isOpen, openNodes, onToggle }: CountryNodeProps) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(node.id)}
        className="group flex w-full items-center justify-between py-2"
      >
        <div className="flex items-center gap-3">
          {node.flag ? (
            <span className="text-base leading-none" aria-hidden>
              {node.flag}
            </span>
          ) : (
            <Flag size={16} className="text-forest-900" strokeWidth={2.2} />
          )}
          <span className="text-sm font-bold text-slate-800 transition-colors group-hover:text-forest-900">
            {node.label}
          </span>
        </div>
        <ChevronDown
          size={18}
          className={cn(
            "text-slate-500 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && node.children && (
        <div className="ml-2.5 space-y-1 border-l-2 border-slate-200 pl-8">
          {node.children.map((child) =>
            child.children?.length ? (
              <MarketNode
                key={child.id}
                node={child}
                isOpen={openNodes.has(child.id)}
                onToggle={onToggle}
              />
            ) : (
              <div
                key={child.id}
                className="cursor-pointer py-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-forest-900"
              >
                {child.label}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function MarketNode({
  node,
  isOpen,
  onToggle,
}: {
  node: CoverageNode;
  isOpen: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(node.id);
        }}
        className="group flex w-full items-center justify-between py-1.5"
      >
        <span className="text-sm font-semibold text-slate-500 transition-colors group-hover:text-forest-900">
          {node.label}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "text-slate-500 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>
      {isOpen && node.children && (
        <div className="space-y-1 py-1">
          {node.children.map((leaf) => (
            <div
              key={leaf.id}
              className="cursor-pointer py-1 text-xs font-medium text-slate-500 transition-colors hover:text-forest-900"
            >
              {leaf.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
