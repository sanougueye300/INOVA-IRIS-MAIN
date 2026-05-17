import { Settings, RefreshCw, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSocPreferences } from "@/lib/soc-preferences";

export function ThemeCustomizer() {
  const {
    sidebarAppearance,
    setSidebarAppearance,
    navbarAppearance,
    setNavbarAppearance,
    bodyBackground,
    setBodyBackground,
    themeColor,
    setThemeColor,
  } = useSocPreferences();

  const resetToDefault = () => {
    setSidebarAppearance("default");
    setNavbarAppearance("default");
    setBodyBackground("default");
    setThemeColor("orange");
  };

  const THEMES = [
    { name: "orange", color: "bg-orange-500" },
    { name: "blue", color: "bg-blue-600" },
    { name: "green", color: "bg-emerald-600" },
    { name: "violet", color: "bg-violet-600" },
    { name: "rose", color: "bg-rose-600" },
  ] as const;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="fixed right-0 top-1/2 z-50 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl border-y border-l border-border bg-background/80 p-3 text-muted-foreground shadow-2xl backdrop-blur-md transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-primary/20">
          <Settings className="h-5 w-5 animate-[spin_4s_linear_infinite]" />
          <span style={{ writingMode: 'vertical-rl' }} className="text-xs font-semibold tracking-widest">
            CUSTOMIZE
          </span>
        </button>
      </SheetTrigger>
      <SheetContent className="w-[340px] sm:w-[400px] overflow-y-auto border-l-border bg-background/95 backdrop-blur-xl">
        <SheetHeader className="mb-6 border-b border-border pb-4">
          <SheetTitle className="flex items-center gap-2 text-xl font-bold">
            <Palette className="h-5 w-5 text-primary" /> Theme Customizer
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Personnalisez l'esthétique du tableau de bord
          </p>
        </SheetHeader>

        <div className="space-y-8">
          <Button variant="outline" className="w-full gap-2 transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/30" onClick={resetToDefault}>
            <RefreshCw className="h-4 w-4" /> Reset to default
          </Button>

          {/* Theme Color */}
          <div className="space-y-4">
            <div className="text-sm font-semibold tracking-tight">Primary Color</div>
            <div className="flex flex-wrap gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setThemeColor(t.name)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all hover:scale-110 ${
                    themeColor === t.name ? "border-foreground scale-110 shadow-md" : "border-transparent"
                  }`}
                  title={t.name}
                >
                  <span className={`h-8 w-8 rounded-full ${t.color}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-semibold tracking-tight">Sidebar Appearance</div>
            <RadioGroup
              value={sidebarAppearance}
              onValueChange={(v: any) => setSidebarAppearance(v)}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <Label
                  htmlFor="sidebar-default"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-transparent p-2 transition-all hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 [&:has([data-state=checked])]:shadow-sm"
                >
                  <RadioGroupItem value="default" id="sidebar-default" className="sr-only" />
                  <div className="h-20 w-full rounded-md border border-border bg-background flex overflow-hidden shadow-sm">
                    <div className="w-1/3 border-r border-border bg-background" />
                    <div className="flex-1 bg-secondary/30" />
                  </div>
                  <span className="text-xs font-medium">Default</span>
                </Label>
              </div>
              <div>
                <Label
                  htmlFor="sidebar-darker"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-transparent p-2 transition-all hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 [&:has([data-state=checked])]:shadow-sm"
                >
                  <RadioGroupItem value="darker" id="sidebar-darker" className="sr-only" />
                  <div className="h-20 w-full rounded-md border border-border bg-background flex overflow-hidden shadow-sm">
                    <div className="w-1/3 border-r border-zinc-800 bg-zinc-950" />
                    <div className="flex-1 bg-secondary/30" />
                  </div>
                  <span className="text-xs font-medium">Darker</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-semibold tracking-tight">Navbar Appearance</div>
            <RadioGroup
              value={navbarAppearance}
              onValueChange={(v: any) => setNavbarAppearance(v)}
              className="grid grid-cols-3 gap-2"
            >
              <div>
                <Label
                  htmlFor="navbar-default"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-transparent p-2 transition-all hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem value="default" id="navbar-default" className="sr-only" />
                  <div className="h-16 w-full rounded-md border border-border bg-background flex flex-col overflow-hidden shadow-sm">
                    <div className="h-4 border-b border-border bg-background/50" />
                    <div className="flex-1 bg-secondary/30" />
                  </div>
                  <span className="text-xs font-medium text-center">Glass</span>
                </Label>
              </div>
              <div>
                <Label
                  htmlFor="navbar-solid"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-transparent p-2 transition-all hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem value="solid" id="navbar-solid" className="sr-only" />
                  <div className="h-16 w-full rounded-md border border-border bg-background flex flex-col overflow-hidden shadow-sm">
                    <div className="h-4 border-b border-border bg-background" />
                    <div className="flex-1 bg-secondary/30" />
                  </div>
                  <span className="text-xs font-medium text-center">Solid</span>
                </Label>
              </div>
              <div>
                <Label
                  htmlFor="navbar-darker"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-transparent p-2 transition-all hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem value="darker" id="navbar-darker" className="sr-only" />
                  <div className="h-16 w-full rounded-md border border-border bg-background flex flex-col overflow-hidden shadow-sm">
                    <div className="h-4 border-b border-zinc-800 bg-zinc-950" />
                    <div className="flex-1 bg-secondary/30" />
                  </div>
                  <span className="text-xs font-medium text-center">Darker</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-semibold tracking-tight">Body Background</div>
            <RadioGroup
              value={bodyBackground}
              onValueChange={(v: any) => setBodyBackground(v)}
              className="grid grid-cols-3 gap-2"
            >
              <div>
                <Label
                  htmlFor="body-default"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-transparent p-2 transition-all hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem value="default" id="body-default" className="sr-only" />
                  <div className="h-12 w-full rounded-md border border-border bg-secondary/30 shadow-sm" />
                  <span className="text-xs font-medium">Default</span>
                </Label>
              </div>
              <div>
                <Label
                  htmlFor="body-dotted"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-transparent p-2 transition-all hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem value="dotted" id="body-dotted" className="sr-only" />
                  <div className="h-12 w-full rounded-md border border-border bg-dotted shadow-sm" />
                  <span className="text-xs font-medium">Dotted</span>
                </Label>
              </div>
              <div>
                <Label
                  htmlFor="body-grid"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-transparent p-2 transition-all hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem value="grid" id="body-grid" className="sr-only" />
                  <div className="h-12 w-full rounded-md border border-border bg-grid shadow-sm" />
                  <span className="text-xs font-medium">Grid</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
