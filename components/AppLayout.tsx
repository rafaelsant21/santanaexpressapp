'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getChecklists } from '@/services/supabaseService';
import Image from 'next/image';
import { Truck, Fuel, Wrench, CheckSquare, LayoutDashboard, LogOut, Menu, Shield, User, BookOpen } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const adminNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Frota', href: '/frota', icon: Truck },
  { name: 'Checklists', href: '/checklist', icon: CheckSquare },
  { name: 'Diário de Bordo', href: '/diario-bordo', icon: BookOpen },
  { name: 'Combustível', href: '/combustivel', icon: Fuel },
  { name: 'Manutenção', href: '/manutencao', icon: Wrench },
];

const driverNavItems = [
  { name: 'Checklists', href: '/checklist', icon: CheckSquare },
  { name: 'Diário de Bordo', href: '/diario-bordo', icon: BookOpen },
  { name: 'Combustível', href: '/combustivel', icon: Fuel },
  { name: 'Manutenção', href: '/manutencao', icon: Wrench },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [avisosPendentes, setAvisosPendentes] = useState(0);

  // Busca alertas pendentes (checklist com observações não revisadas) só para admin
  useEffect(() => {
    if (!session || session.role !== 'admin') return;
    const load = () =>
      getChecklists().then(list => {
        const count = list.filter(c => c.observacoes?.trim() && !c.aviso_revisado).length;
        setAvisosPendentes(count);
      });
    load();
    const interval = setInterval(load, 60_000); // revalida a cada 1 min
    return () => clearInterval(interval);
  }, [session]);

  if (isLoading || !session) return null;

  const isAdmin = session.role === 'admin';
  const navItems = isAdmin ? adminNavItems : driverNavItems;

  // Bloqueia motorista de acessar rotas restritas
  const driverBlockedRoutes = ['/dashboard', '/frota'];
  if (!isAdmin && driverBlockedRoutes.some(r => pathname.startsWith(r))) {
    router.push('/checklist');
    return null;
  }

  const initials = session.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-background flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-2">
            <Image 
              src="/icons/icon-192x192.png?v=3" 
              alt="Santana Express Logo" 
              width={32} 
              height={32} 
              className="rounded-lg"
            />
          <span className="font-bold text-lg tracking-tight">Santana Express</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-muted-foreground hover:text-foreground">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Overlay Backdrop - Aparece quando o menu abre no mobile */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar / Drawer */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-[#111827] border-r border-[#1e293b] w-64 md:w-[240px] transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:block",
        mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full bg-[#111827]">
          <div className="flex flex-col p-6 border-b border-[#1e293b] md:border-none md:mb-2">
            <div className="flex items-center gap-3 mb-1">
              <Image 
                src="/icons/icon-192x192.png?v=3" 
                alt="Santana Express Logo" 
                width={40} 
                height={40} 
                className="rounded-lg shadow-lg shadow-primary/20"
              />
              <div className="text-primary font-bold text-xl tracking-tight leading-tight">
                SANTANA<br />
                <span className="text-white">EXPRESS</span>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest hidden md:block">Gestão de Frota</div>
          </div>

          <div className="flex-1 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center w-full gap-3 px-6 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-foreground border-r-4 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                  {/* Badge de alertas no item Checklists */}
                  {isAdmin && item.href === '/checklist' && avisosPendentes > 0 && (
                    <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                      {avisosPendentes}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="p-6 border-t border-[#1e293b] mt-auto">
            <div className="mb-4 text-xs text-muted-foreground flex items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground shrink-0 text-xs">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground truncate">{session.name}</div>
                <div className="flex items-center gap-1 text-[10px] truncate">
                  {isAdmin
                    ? <><Shield className="h-3 w-3 text-primary" /> Administrador</>
                    : <><User className="h-3 w-3" /> Motorista</>
                  }
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
        {/* Removido o backdrop click antigo pois foi movido para fora da sidebar */}
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
