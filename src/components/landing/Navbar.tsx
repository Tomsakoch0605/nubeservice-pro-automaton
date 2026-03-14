import { Button } from "@/components/ui/button";
import { Menu, X, ArrowLeft, LayoutDashboard, LogOut, User, Briefcase } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const isLanding = location.pathname === "/";
  const isAuth = location.pathname === "/auth";
  const isDashboard = location.pathname === "/dashboard";
  const isInnerPage = !isLanding && !isAuth;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setUserName(session.user.user_metadata?.full_name || session.user.email || "");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setUserName(session.user.user_metadata?.full_name || session.user.email || "");
      } else {
        setUserName("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const showBackButton = isInnerPage && !isDashboard;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Left: Logo + Back */}
        <div className="flex items-center gap-2">
          {showBackButton &&
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate(-1)}
            aria-label="Volver">
            
              <ArrowLeft className="w-4 h-4" />
            </Button>
          }
          <Link to={session ? "/dashboard" : "/"} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">
              Nube<span className="text-primary">Service</span>
            </span>
          </Link>
        </div>

        {/* Center: Landing links (only on landing) */}
        {isLanding &&
        <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Funcionalidades</a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Cómo Funciona</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Precios</a>
          </div>
        }

        {/* Center: Inner page nav links (when logged in and not on landing) */}
        {session && isInnerPage &&
        <div className="hidden md:flex items-center gap-6">
            <Link to="/dashboard" className={`text-sm font-medium transition-colors ${isDashboard ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              Dashboard
            </Link>
            <Link to="/clients" className={`text-sm font-medium transition-colors ${location.pathname === "/clients" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              Clientes
            </Link>
            <Link to="/calendar" className={`text-sm font-medium transition-colors ${location.pathname === "/calendar" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              Calendario
            </Link>
            <Link to="/services" className={`text-sm font-medium transition-colors ${location.pathname === "/services" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              Servicios
            </Link>
            <Link to="/payments" className={`text-sm font-medium transition-colors ${location.pathname === "/payments" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              Pagos
            </Link>
          </div>
        }

        {/* Right: Auth actions */}
        <div className="hidden md:flex items-center gap-3">
          {session ?
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className="max-w-[120px] truncate text-sm">{userName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu> :

          <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Iniciar Sesión</Link>
              </Button>
              <Button variant="hero" size="default" asChild>
                <Link to="/auth">Comenzar Gratis</Link>
              </Button>
            </>
          }
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open &&
      <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3">
          {isLanding && !session &&
        <>
              <a href="#features" className="block text-muted-foreground hover:text-foreground text-sm">Funcionalidades</a>
              <a href="#how-it-works" className="block text-muted-foreground hover:text-foreground text-sm">Cómo Funciona</a>
              <a href="#pricing" className="block text-muted-foreground hover:text-foreground text-sm">Precios</a>
            </>
        }
          {session &&
        <>
              <Link to="/dashboard" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Dashboard</Link>
              <Link to="/clients" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Clientes</Link>
              <Link to="/calendar" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Calendario</Link>
              <Link to="/services" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Servicios</Link>
              <Link to="/payments" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Pagos</Link>
              <Button variant="outline" size="sm" className="w-full gap-2 text-destructive" onClick={handleLogout}>
                <LogOut className="w-4 h-4" /> Cerrar Sesión
              </Button>
            </>
        }
          {!session &&
        <Button variant="hero" size="lg" className="w-full" asChild>
              <Link to="/auth">Comenzar Gratis</Link>
            </Button>
        }
        </div>
      }
    </nav>);

};

export default Navbar;