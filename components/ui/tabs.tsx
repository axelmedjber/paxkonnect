"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  onValueChange?: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);

  if (!context) {
    throw new Error("Tabs components must be rendered inside <Tabs>.");
  }

  return context;
}

export function Tabs({
  children,
  className,
  defaultValue,
  onValueChange,
  value,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  value?: string;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const currentValue = value ?? internalValue;

  function handleValueChange(nextValue: string) {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  }

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex w-full gap-2 overflow-x-auto rounded-lg border border-purple-100 bg-card p-2 shadow-sm dark:border-zinc-800",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  children,
  className,
  value,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
}) {
  const context = useTabsContext();
  const active = context.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      onClick={() => context.onValueChange?.(value)}
      className={cn(
        "inline-flex min-w-fit items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:hover:bg-zinc-900",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  children,
  className,
  value,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value: string;
}) {
  const context = useTabsContext();

  if (context.value !== value) {
    return null;
  }

  return (
    <div role="tabpanel" className={cn("outline-none", className)} {...props}>
      {children}
    </div>
  );
}
