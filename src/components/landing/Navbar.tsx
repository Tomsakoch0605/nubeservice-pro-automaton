import { Button } from "@/components/ui/button";
import { Calendar, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">
            Nube<span className="text-primary">Service</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Funcionalidades</a>
          <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Cómo Funciona</a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Precios</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth">Iniciar Sesión</Link>
          </Button>
          <Button variant="hero" size="default" asChild>
            <Link to="/onboarding">Comenzar Gratis</Link>
          </Button>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3">
          <a href="#features" className="block text-muted-foreground hover:text-foreground text-sm">Funcionalidades</a>
          <a href="#how-it-works" className="block text-muted-foreground hover:text-foreground text-sm">Cómo Funciona</a>
          <a href="#pricing" className="block text-muted-foreground hover:text-foreground text-sm">Precios</a>
          <Button variant="hero" size="lg" className="w-full" asChild>
            <Link to="/onboarding">Comenzar Gratis</Link>
          </Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
