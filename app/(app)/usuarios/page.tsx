'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/modal';
import { Button, Select, Label } from '@/components/ui/forms';
import { User, Shield, ShieldAlert, Loader2, Search } from 'lucide-react';
import { getProfiles, updateProfileRole } from '@/services/supabaseService';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { session } = useAuth();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getProfiles();
      setProfiles(data);
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'motorista') => {
    if (userId === session?.id) {
      toast.error('Você não pode alterar seu próprio nível de acesso.');
      return;
    }

    try {
      await updateProfileRole(userId, newRole);
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
      toast.success('Permissão atualizada com sucesso!');
    } catch {
      toast.error('Erro ao atualizar permissão');
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-0 bg-background h-full">
      <header className="border-b border-border bg-[#0f172b] flex flex-col md:flex-row md:items-center justify-between p-4 md:px-8 md:h-16 shrink-0 gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Gestão de Usuários</h1>
          <p className="text-xs text-muted-foreground">Controle de acessos e permissões do sistema.</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar por nome..." 
            className="w-full bg-[#1e293b] border border-border rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <Card className="p-0 bg-[#1e293b] rounded-xl border-border overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left min-w-[600px]">
              <thead className="bg-[#111827]">
                <tr>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Usuário</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Nível de Acesso</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground border-b border-border">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map((profile) => (
                    <tr key={profile.id} className="hover:bg-white/5 transition-colors border-b border-border last:border-0">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                            {profile.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground">{profile.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground font-mono">
                        {profile.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {profile.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">
                              <Shield className="h-3 w-3" />
                              ADMINISTRADOR
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[11px] font-bold border border-blue-500/20">
                              <User className="h-3 w-3" />
                              MOTORISTA
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] uppercase text-muted-foreground">Alterar para:</Label>
                            <Select 
                              value={profile.role} 
                              onChange={(e) => handleRoleChange(profile.id, e.target.value as any)}
                              className="w-32 h-8 text-xs"
                              disabled={profile.id === session?.id}
                            >
                              <option value="motorista">Motorista</option>
                              <option value="admin">Administrador</option>
                            </Select>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex gap-3 items-start">
          <ShieldAlert className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300/80 leading-relaxed">
            <p className="font-bold text-blue-400 mb-1">Informações de Segurança</p>
            <p>Novos usuários recebem automaticamente o perfil de <b>Motorista</b> ao se cadastrar. Apenas administradores podem elevar o nível de acesso de outros usuários. Você não pode remover sua própria permissão de administrador.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
