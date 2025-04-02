"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface CustomScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
}

const CustomScrollArea = React.forwardRef<HTMLDivElement, CustomScrollAreaProps>(
  ({ className, children, onScroll, ...props }, ref) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    
    // Combine the forwarded ref with our internal ref
    React.useImperativeHandle(ref, () => scrollRef.current as HTMLDivElement);
    
    return (
      <ScrollArea className={cn(className)} {...props}>
        <div 
          ref={scrollRef} 
          className="h-full overflow-auto" 
          onScroll={onScroll}
        >
          {children}
        </div>
      </ScrollArea>
    );
  }
);

CustomScrollArea.displayName = "CustomScrollArea";

export { CustomScrollArea };
