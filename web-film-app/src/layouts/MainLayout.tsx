import { Outlet } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";

export function MainLayout() {
  return (
    <div className="relative min-h-screen bg-dark text-light">
      <div className="pointer-events-none absolute inset-0 bg-gradient-radial opacity-80" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
