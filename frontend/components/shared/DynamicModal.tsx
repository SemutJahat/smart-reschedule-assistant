"use client";

import { cn } from "@/lib/utils";
import { type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface DynamicModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function DynamicModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  bodyClassName,
}: DynamicModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "sm:max-w-[600px] max-h-[90vh] flex flex-col",
          className,
        )}>
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="text-xl text-[#1E293B]">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-xs text-[#64748B]">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Konten modal fleksibel tanpa scrollbar luar yang kasar */}
        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto py-1 pr-1 custom-scrollbar",
            bodyClassName,
          )}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
