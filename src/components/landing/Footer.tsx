import { Calendar } from "lucide-react";

const Footer = () => (
  <footer className="bg-accent text-accent-foreground py-12">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg">NubeService</span>
        </div>
        <p className="text-accent-foreground/60 text-sm">
          © {new Date().getFullYear()} Nube Service Now. Todos los derechos reservados.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
