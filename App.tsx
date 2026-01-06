
import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, BarChart3, AlertTriangle, CheckCircle2,
  Search, Settings, Users, Plus, Trash2, Edit3, LogOut,
  QrCode, Bell, Shield, Check, Printer, Clock, AlertOctagon, 
  ClipboardList, ShoppingCart, Minus, ShieldCheck, RefreshCcw, 
  KeyRound, UserMinus, Download, HelpCircle, Sparkles, Send, 
  History, PackageCheck, Sun, Moon, UserPlus, FileDown, Briefcase, Trash,
  ExternalLink, Layers
} from 'lucide-react';
import { getAIAnalysis } from './services/geminiService';

/**
 * Ícone Temático SST: Escudo de Segurança
 */
const SSTIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);

interface UserPermissions {
  canAddItems: boolean;
  canEditItems: boolean;
  canDeleteItems: boolean;
  canManageUsers: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  role: string;
  pass: string;
  isAdmin?: boolean;
  permissions: UserPermissions;
}

interface InventoryItem {
  id: string;
  code: string;
  description: string;
  classification: string;
  function: string;
  color: string;
  shape: string;
  size: string;
  extras: string;
  entry: number;
  exit: number;
  minStock: number;
  maxStock: number;
  observations: string;
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
}

interface ProjectItem {
  itemId: string;
  code: string;
  description: string;
  quantity: number;
}

type ProjectStatus = 'PENDENTE' | 'EM ANDAMENTO' | 'CONCLUÍDO';

interface Project {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  items: ProjectItem[];
  createdAt: string;
}

interface PendingOrder {
  id: string;
  itemId: string;
  description: string;
  code: string;
  quantity: number;
}

interface RequisitionHistory {
  id: string;
  userName: string;
  dateTime: string;
  items: string[];
}

interface PasswordResetRequest {
  userName: string;
  userId: string;
  time: string;
}

const FULL_PERMISSIONS: UserPermissions = {
  canAddItems: true,
  canEditItems: true,
  canDeleteItems: true,
  canManageUsers: true,
};

const STANDARD_PERMISSIONS: UserPermissions = {
  canAddItems: true,
  canEditItems: true,
  canDeleteItems: false,
  canManageUsers: false,
};

const INITIAL_USERS: UserProfile[] = [
  { id: 'admin-0', name: 'Administrador Master', role: 'Diretoria / TI', pass: '@dm123', isAdmin: true, permissions: FULL_PERMISSIONS },
  { id: 'u-1', name: 'Ricardo Santos', role: 'Eng. de Segurança', pass: '1234', permissions: { ...STANDARD_PERMISSIONS, canDeleteItems: true } },
  { id: 'u-2', name: 'Ana Paula', role: 'Técnico SST', pass: '1234', permissions: STANDARD_PERMISSIONS },
  { id: 'u-3', name: 'Carlos Ferreira', role: 'Supervisor Logístico', pass: '1234', permissions: STANDARD_PERMISSIONS },
];

const INITIAL_DATA: InventoryItem[] = [
  { 
    id: '1', code: 'S001', description: 'ENTRADA PEDESTRE', classification: 'IDENTIFICAÇÃO', 
    function: 'INFORMAÇÃO', color: 'VERDE', shape: 'RETANGULAR', size: '30X20CM', extras: 'Refletiva',
    entry: 50, exit: 45, minStock: 15, maxStock: 100,
    observations: 'Placas instaladas no portão A.', createdBy: 'Ricardo Santos', 
    updatedBy: 'Ricardo Santos', updatedAt: '20/05/2025 10:00' 
  },
  { 
    id: '2', code: 'A005', description: 'SAÍDA DE EMERGÊNCIA', classification: 'SEGURANÇA', 
    function: 'SALVAMENTO', color: 'VERDE', shape: 'RETANGULAR', size: '40X15CM', extras: 'Fotoluminescente',
    entry: 20, exit: 18, minStock: 10, maxStock: 50,
    observations: 'Corredor principal.', createdBy: 'Ana Paula', 
    updatedBy: 'Ana Paula', updatedAt: '21/05/2025 14:30' 
  },
];

type SortKey = 'description' | 'code' | 'saldo' | 'size';

const App: React.FC = () => {
  const [initialLoading, setInitialLoading] = useState(true);
  const [isLogged, setIsLogged] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS[0]);
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'description', direction: 'asc' });
  
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_DATA);
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [separatedItemIds, setSeparatedItemIds] = useState<Set<string>>(new Set());
  const [requisitionHistory, setRequisitionHistory] = useState<RequisitionHistory[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ordersPanelOpen, setOrdersPanelOpen] = useState(false);
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [qrPreviewItem, setQrPreviewItem] = useState<InventoryItem | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [forgotPassOpen, setForgotPassOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString());

  const [changingPass, setChangingPass] = useState(false);
  const [newPass, setNewPass] = useState("");

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectClient, setNewProjectClient] = useState("");
  const [newProjectStatus, setNewProjectStatus] = useState<ProjectStatus>('PENDENTE');
  const [selectedItemsForProject, setSelectedItemsForProject] = useState<ProjectItem[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 800);
    const clock = setInterval(() => setCurrentTime(new Date().toLocaleString()), 1000);
    return () => { clearTimeout(timer); clearInterval(clock); };
  }, []);

  const stats = useMemo(() => {
    const totalEntrada = items.reduce((acc, item) => acc + item.entry, 0);
    const totalSaida = items.reduce((acc, item) => acc + item.exit, 0);
    const alertItems = items.filter(item => (item.entry - item.exit) <= item.minStock);
    return { 
      totalEntrada, totalSaida, 
      saldo: totalEntrada - totalSaida, 
      itensCriticos: alertItems.length,
      alertItems
    };
  }, [items]);

  const processedItems = useMemo(() => {
    let result = [...items];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(i => i.description.toLowerCase().includes(term) || i.code.toLowerCase().includes(term));
    }
    result.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      if (sortConfig.key === 'saldo') {
        aVal = a.entry - a.exit;
        bVal = b.entry - b.exit;
      } else {
        aVal = (a[sortConfig.key] || "").toLowerCase();
        bVal = (b[sortConfig.key] || "").toLowerCase();
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [items, searchTerm, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const handleLogin = () => {
    const userInList = users.find(u => u.id === currentUser.id);
    if (userInList && loginPass === userInList.pass) {
      setIsAuthenticating(true);
      setTimeout(() => {
        setCurrentUser(userInList);
        setIsLogged(true);
        setIsAuthenticating(false);
        setLoginPass("");
      }, 2000);
    } else { 
      setLoginError("Senha incorreta."); 
      setTimeout(() => setLoginError(""), 3000); 
    }
  };

  const handleRequestReset = (user: UserProfile) => {
    const request = { userName: user.name, userId: user.id, time: new Date().toLocaleTimeString() };
    setResetRequests(prev => [...prev, request]);
    setForgotPassOpen(false);
    alert("Solicitação de reset enviada ao Administrador.");
  };

  const handleResetPassword = (requestId: string, userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, pass: '1234' } : u));
    setResetRequests(prev => prev.filter((_, i) => i.toString() !== requestId));
    alert("Senha do operador resetada para o padrão '1234'.");
  };

  const handleAIQuery = async () => {
    if (!aiMessage.trim()) return;
    setIsAiLoading(true);
    try {
      const result = await getAIAnalysis(items, aiMessage);
      setAiResponse(result);
    } catch (e) {
      setAiResponse("Erro ao processar consulta IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      setItems(prev => prev.filter(i => i.id !== itemToDelete.id));
      setItemToDelete(null);
    }
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      if (userToDelete.isAdmin && users.filter(u => u.isAdmin).length === 1) {
        alert("Não é possível remover o único Administrador Master.");
        setUserToDelete(null);
        return;
      }
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setUserToDelete(null);
      alert("Operador removido permanentemente.");
    }
  };

  const handleAddUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newUser: UserProfile = {
      id: Math.random().toString(36).substr(2, 9),
      name: fd.get('name') as string,
      role: fd.get('role') as string,
      pass: '1234',
      permissions: fd.get('isAdmin') === 'on' ? FULL_PERMISSIONS : STANDARD_PERMISSIONS,
      isAdmin: fd.get('isAdmin') === 'on'
    };
    setUsers(prev => [...prev, newUser]);
    setAddUserOpen(false);
    alert(`Operador ${newUser.name} criado com sucesso. Senha padrão: 1234`);
  };

  const handleSaveItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const now = new Date().toLocaleString('pt-BR');
    const newItem: InventoryItem = {
      id: editingItem?.id || Math.random().toString(36).substr(2, 9),
      code: (fd.get('code') as string).toUpperCase(),
      description: (fd.get('description') as string).toUpperCase(),
      classification: 'SST', function: 'SINALIZAÇÃO', color: 'VARIAVEL', shape: 'NR26',
      size: (fd.get('size') as string).toUpperCase(),
      extras: 'NENHUM', observations: fd.get('observations') as string || '',
      entry: parseInt(fd.get('entry') as string) || 0,
      exit: parseInt(fd.get('exit') as string) || 0,
      minStock: parseInt(fd.get('minStock') as string) || 5,
      maxStock: 100, createdBy: editingItem?.createdBy || currentUser.name,
      updatedBy: currentUser.name, updatedAt: now,
    };
    setItems(prev => editingItem ? prev.map(i => i.id === editingItem.id ? newItem : i) : [newItem, ...prev]);
    setIsFormOpen(false); setEditingItem(null);
  };

  const downloadInventoryCSV = () => {
    const BOM = "\uFEFF";
    const headers = "CÓDIGO;IDENTIFICAÇÃO DA PLACA;DIMENSÃO;ENTRADA;SAÍDA;SALDO ATUAL;ESTOQUE MÍNIMO;OBSERVAÇÕES;ÚLTIMA ATUALIZAÇÃO\n";
    const rows = items.map(item => 
      `${item.code};${item.description};${item.size};${item.entry};${item.exit};${item.entry - item.exit};${item.minStock};${item.observations.replace(/;/g, ',')};${item.updatedAt}`
    ).join("\n");
    
    const blob = new Blob([BOM + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.body.appendChild(document.createElement('a'));
    link.href = url;
    link.setAttribute('download', `INVENTARIO_NEWCOM_SST_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    link.click();
    document.body.removeChild(link);
  };

  const downloadRequisitionCSV = () => {
    if (pendingOrders.length === 0) return;
    
    const BOM = "\uFEFF";
    const now = new Date().toLocaleString();
    const headers = `REQUISIÇÃO NEWCOM SST;DATA/HORA: ${now};OPERADOR: ${currentUser.name}\n\nCÓDIGO;DESCRIÇÃO;QUANTIDADE SOLICITADA;CONFERIDO\n`;
    const rows = pendingOrders.map(o => 
      `${o.code};${o.description};${o.quantity};[ ]`
    ).join("\n");

    const blob = new Blob([BOM + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.body.appendChild(document.createElement('a'));
    link.href = url;
    link.setAttribute('download', `REQUISICAO_NEWCOM_SST_${new Date().getTime()}.csv`);
    link.click();
    document.body.removeChild(link);

    const newHistory: RequisitionHistory = {
      id: Math.random().toString(36).substr(2, 9),
      userName: currentUser.name,
      dateTime: now,
      items: pendingOrders.map(o => `${o.quantity}x ${o.description} (${o.code})`)
    };
    setRequisitionHistory(prev => [newHistory, ...prev].slice(0, 5));
    setPendingOrders([]);
    alert("Guia de Requisição (CSV) baixada com sucesso!");
  };

  const triggerPrintTag = () => {
    if (!qrPreviewItem) return;
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${qrPreviewItem.code}`;
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (!printWindow) {
      alert("Por favor, habilite pop-ups para imprimir etiquetas.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Impressão SST - ${qrPreviewItem.code}</title>
          <style>
            @page { margin: 0; size: auto; }
            body { 
              font-family: 'Inter', Arial, sans-serif; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0;
              text-align: center;
              padding: 20px;
            }
            .label-container {
              border: 3px solid #375623;
              border-radius: 20px;
              padding: 30px;
              max-width: 400px;
            }
            .title { font-size: 16pt; font-weight: 900; color: #375623; margin-bottom: 15px; }
            .qr-code { width: 250px; height: 250px; margin-bottom: 15px; }
            .description { font-size: 14pt; font-weight: 800; text-transform: uppercase; margin-bottom: 5px; }
            .code { font-size: 12pt; font-weight: 700; color: #666; }
            .footer { font-size: 8pt; font-weight: 700; color: #ccc; margin-top: 20px; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="label-container">
            <div class="title">ETIQUETA NEWCOM SST</div>
            <img class="qr-code" src="${qrUrl}" onload="window.print(); window.close();" />
            <div class="description">${qrPreviewItem.description}</div>
            <div class="code">${qrPreviewItem.code} • ${qrPreviewItem.size}</div>
            <div class="footer">NR-26 SEGURANÇA INDUSTRIAL</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const triggerPrintProject = (project: Project) => {
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (!printWindow) {
      alert("Por favor, habilite pop-ups para imprimir.");
      return;
    }

    const itemsHtml = project.items.map(it => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 12px; font-weight: bold; text-align: left;">${it.description}</td>
        <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${it.code}</td>
        <td style="border: 1px solid #ddd; padding: 12px; font-weight: 900; text-align: center;">${it.quantity}</td>
        <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">[ ]</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Obra: ${project.name}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            .header { border-bottom: 4px solid #375623; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            h1 { margin: 0; font-size: 24pt; text-transform: uppercase; color: #375623; }
            .meta { font-size: 10pt; color: #666; text-transform: uppercase; font-weight: bold; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 50px; background: #eee; font-size: 8pt; margin-top: 5px; font-weight: 900; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #375623; color: white; text-transform: uppercase; font-size: 10pt; padding: 12px; }
            .footer { margin-top: 50px; text-align: center; font-size: 8pt; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            .signatures { margin-top: 80px; display: flex; justify-content: space-around; }
            .sig-box { border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 10px; font-size: 10pt; font-weight: bold; text-transform: uppercase; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-item { background: #f9f9f9; padding: 15px; border-radius: 10px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div>
              <div class="meta">Controle de Obra / Projeto</div>
              <h1>${project.name}</h1>
              <div class="status-badge">STATUS: ${project.status}</div>
            </div>
            <div style="text-align: right">
              <div class="meta">Documento Gerado: ${new Date().toLocaleString()}</div>
              <div class="meta">Responsável Logística: ${currentUser.name}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Descrição do Item</th>
                <th>Código</th>
                <th>Qtd Requerida</th>
                <th>Conferência</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="signatures">
            <div class="sig-box">Responsável Logística</div>
            <div class="sig-box">Recebido por (Obra)</div>
          </div>
          <div class="footer">GRUPO NEWCOM SST - CONTROLE NR-26</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadQRCode = () => {
    if (!qrPreviewItem) return;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${qrPreviewItem.code}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `QRCode_${qrPreviewItem.code}.png`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddToOrders = (item: InventoryItem) => {
    const existing = pendingOrders.find(o => o.itemId === item.id);
    if (existing) {
      setPendingOrders(prev => prev.map(o => o.itemId === item.id ? { ...o, quantity: o.quantity + 1 } : o));
    } else {
      setPendingOrders(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        itemId: item.id,
        description: item.description,
        code: item.code,
        quantity: 1
      }]);
    }
    setOrdersPanelOpen(true);
  };

  const handleOpenAddProject = () => {
    setEditingProject(null);
    setNewProjectName("");
    setNewProjectClient("");
    setNewProjectStatus("PENDENTE");
    setSelectedItemsForProject([]);
    setIsAddProjectOpen(true);
  };

  const handleOpenEditProject = (project: Project) => {
    setEditingProject(project);
    setNewProjectName(project.name);
    setNewProjectClient(project.client || "");
    setNewProjectStatus(project.status || "PENDENTE");
    setSelectedItemsForProject(project.items);
    setIsAddProjectOpen(true);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    if (editingProject) {
      setProjects(prev => prev.map(p => p.id === editingProject.id ? {
        ...p,
        name: newProjectName.toUpperCase(),
        client: newProjectClient.toUpperCase(),
        status: newProjectStatus,
        items: selectedItemsForProject
      } : p));
      alert("Obra atualizada com sucesso!");
    } else {
      const newProject: Project = {
        id: Math.random().toString(36).substr(2, 9),
        name: newProjectName.toUpperCase(),
        client: newProjectClient.toUpperCase(),
        status: newProjectStatus,
        items: selectedItemsForProject,
        createdAt: new Date().toLocaleString()
      };
      setProjects(prev => [newProject, ...prev]);
      alert("Nova obra cadastrada!");
    }

    setNewProjectName("");
    setNewProjectClient("");
    setSelectedItemsForProject([]);
    setIsAddProjectOpen(false);
    setEditingProject(null);
  };

  const confirmDeleteProject = () => {
    if (projectToDelete) {
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    }
  };

  const addItemToProjectSelection = (item: InventoryItem) => {
    const existing = selectedItemsForProject.find(i => i.itemId === item.id);
    if (existing) {
      setSelectedItemsForProject(prev => prev.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setSelectedItemsForProject(prev => [...prev, {
        itemId: item.id,
        code: item.code,
        description: item.description,
        quantity: 1
      }]);
    }
  };

  const toggleSeparated = (id: string) => {
    setSeparatedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleUserPermission = (userId: string, permission: keyof UserPermissions) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          permissions: {
            ...u.permissions,
            [permission]: !u.permissions[permission]
          }
        };
      }
      return u;
    }));
  };

  const resetUserPasswordManually = (userId: string) => {
    if (window.confirm("Deseja resetar a senha deste usuário para '1234'?")) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, pass: '1234' } : u));
      alert("Senha resetada para 1234.");
    }
  };

  const handleChangeOwnPassword = () => {
    if (!newPass.trim()) return alert("Insira uma senha válida.");
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, pass: newPass } : u));
    setCurrentUser(prev => ({ ...prev, pass: newPass }));
    setNewPass("");
    setChangingPass(false);
    alert("Senha alterada com sucesso.");
  };

  if (initialLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#375623]">
        <SSTIcon size={56} className="text-white animate-pulse mb-4" />
        <h1 className="text-white text-xl font-black uppercase tracking-[0.3em]">Newcom SST</h1>
      </div>
    );
  }

  if (isAuthenticating) {
    return (
      <div className={`h-screen w-full flex flex-col items-center justify-center ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f8faf7]'}`}>
        <div className="w-10 h-10 border-4 border-[#375623] border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#375623]">Autenticando...</h2>
      </div>
    );
  }

  if (!isLogged) {
    return (
      <div className={`h-screen w-full flex items-center justify-center p-6 ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f4f7f4]'}`}>
        <div className={`w-full max-w-[360px] p-10 rounded-3xl shadow-xl border ${darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="p-4 bg-[#375623] rounded-2xl mb-4 shadow-lg"><SSTIcon className="text-white" size={40} /></div>
            <h2 className={`text-xl font-black uppercase tracking-tight ${darkMode ? 'text-white' : 'text-[#375623]'}`}>Controle Newcom</h2>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Gestão NR-26</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1 mb-1 block">Operador</label>
              <select className={`w-full p-3.5 rounded-xl border-2 font-black text-xs outline-none transition-all ${darkMode ? 'bg-[#111] border-gray-800 text-white' : 'bg-gray-50 border-gray-200'}`} onChange={(e) => setCurrentUser(users.find(u => u.id === e.target.value) || users[0])} value={currentUser.id}>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1 mb-1 block">Senha</label>
              <input type="password" placeholder="••••••" className={`w-full p-3.5 rounded-xl border-2 font-black text-xs outline-none transition-all ${darkMode ? 'bg-[#111] border-gray-800 text-white' : 'bg-gray-50 border-gray-200'}`} value={loginPass} onChange={(e) => setLoginPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
              {loginError && <p className="text-red-500 text-[9px] font-black text-center mt-2">{loginError}</p>}
            </div>
            <div className="flex flex-col space-y-2 pt-2">
              <button onClick={handleLogin} className="w-full bg-[#375623] text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-md hover:bg-[#2a411a] active:scale-95 transition-all">Acessar Sistema</button>
              <button onClick={() => setForgotPassOpen(true)} className="text-[8px] font-black text-gray-400 hover:text-[#375623] uppercase tracking-widest flex items-center justify-center py-2 transition-colors">
                <HelpCircle size={12} className="mr-2" /> Esqueci minha senha
              </button>
            </div>
          </div>
        </div>

        {forgotPassOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-[320px] p-8 rounded-3xl shadow-2xl text-center ${darkMode ? 'bg-[#1a1a1a] text-white border border-gray-800' : 'bg-white'}`}>
              <KeyRound size={40} className="mx-auto mb-4 text-[#375623]" />
              <h3 className="text-sm font-black uppercase mb-2">Resetar Senha</h3>
              <p className="text-[10px] opacity-70 mb-6 leading-relaxed">Enviar solicitação para o administrador redefinir sua senha para o padrão <span className="font-bold">1234</span>?</p>
              <div className="space-y-3">
                <button onClick={() => handleRequestReset(currentUser)} className="w-full py-3 bg-[#375623] text-white rounded-xl text-[10px] font-black uppercase shadow-lg">Solicitar agora</button>
                <button onClick={() => setForgotPassOpen(false)} className="w-full py-3 text-gray-400 text-[10px] font-black uppercase hover:text-gray-600">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden transition-colors ${darkMode ? 'bg-[#0a0a0a] text-white' : 'bg-[#f8faf8] text-gray-900'}`}>
      <header className={`px-6 py-3 shadow-sm border-b z-[60] no-print ${darkMode ? 'bg-[#141414] border-gray-800' : 'bg-[#375623] border-[#76923c] text-white'}`}>
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SSTIcon size={24} className="text-white" />
            <h1 className="text-xl font-black uppercase tracking-tight">Newcom <span className="text-[#76923c]">SST</span></h1>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setIsProjectModalOpen(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all flex items-center space-x-2 group shadow-inner">
              <Briefcase size={16} className="text-blue-400" />
              <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest">Obras / Projetos</span>
            </button>
            <button onClick={() => setAiAssistantOpen(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all flex items-center space-x-2 group" title="Gestão IA">
              <Sparkles size={16} className="text-[#76923c]" />
              <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest">IA Newcom</span>
            </button>
            <button onClick={() => setOrdersPanelOpen(true)} className="relative p-2 hover:bg-white/10 rounded-xl group transition-all">
              <ClipboardList size={18} />
              {pendingOrders.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black px-1.5 rounded-full ring-2 ring-[#375623]">{pendingOrders.length}</span>}
            </button>
            <button onClick={() => setNotifOpen(!notifOpen)} className="p-2 hover:bg-white/10 rounded-xl relative">
              <Bell size={18} className={stats.itensCriticos > 0 || resetRequests.length > 0 ? 'animate-bounce text-orange-400' : 'text-white'}/>
              {(stats.itensCriticos > 0 || resetRequests.length > 0) && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
            <div className="w-px h-6 bg-white/20 mx-2"></div>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 hover:bg-white/10 rounded-xl">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => setSettingsOpen(!settingsOpen)} className="p-2 hover:bg-white/10 rounded-xl"><Settings size={18}/></button>
            <button onClick={() => setIsLogged(false)} className="p-2 text-red-300 hover:text-red-100"><LogOut size={18}/></button>
          </div>
        </div>
      </header>

      <div className="px-6 py-4 grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {[
          { label: 'Entradas', val: stats.totalEntrada, icon: CheckCircle2, color: 'bg-blue-600' },
          { label: 'Saídas', val: stats.totalSaida, icon: BarChart3, color: 'bg-orange-600' },
          { label: 'Saldo', val: stats.saldo, icon: SSTIcon, color: 'bg-[#375623]' },
          { label: 'Críticos', val: stats.itensCriticos, icon: AlertTriangle, color: 'bg-red-600' },
        ].map((item, i) => (
          <div key={i} className={`p-4 rounded-3xl flex items-center justify-between ${item.color} text-white shadow-lg transition-all cursor-default`}>
            <div><p className="text-[8px] font-black opacity-80 uppercase tracking-widest mb-1">{item.label}</p><p className="text-2xl font-black">{item.val}</p></div>
            <item.icon size={28} className="opacity-20" />
          </div>
        ))}
      </div>

      <div className="px-6 pb-4 flex flex-col md:flex-row gap-4 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input placeholder="Buscar placa ou código..." className={`w-full pl-12 pr-6 py-3 rounded-2xl border-2 font-black text-xs outline-none transition-all ${darkMode ? 'bg-[#141414] border-gray-800 text-white focus:border-[#76923c]' : 'bg-white border-gray-100 focus:border-[#375623]'}`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {currentUser.permissions.canAddItems && (
          <button onClick={() => {setEditingItem(null); setIsFormOpen(true);}} className="bg-[#375623] hover:bg-[#2a411a] text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-95 uppercase text-[9px] tracking-widest">
            <Plus size={16} /><span>NOVO ITEM</span>
          </button>
        )}
      </div>

      <main className="flex-1 overflow-auto px-6 pb-4 no-print custom-scrollbar">
        <div className={`rounded-3xl border-2 overflow-hidden ${darkMode ? 'bg-[#141414] border-gray-800' : 'bg-white border-gray-100 shadow-md'}`}>
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className={`font-black uppercase tracking-widest select-none ${darkMode ? 'bg-[#1d1d1d] text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:text-[#76923c]" onClick={() => handleSort('description')}>Sinalização</th>
                <th className="px-6 py-4 cursor-pointer hover:text-[#76923c]" onClick={() => handleSort('size')}>Dimensão</th>
                <th className="px-6 py-4 cursor-pointer hover:text-[#76923c]" onClick={() => handleSort('saldo')}>Saldo</th>
                <th className="px-6 py-4">Última Alteração</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className={`divide-y transition-colors ${darkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
              {processedItems.map(item => {
                const saldo = item.entry - item.exit;
                const isCrit = saldo <= item.minStock;
                return (
                  <tr key={item.id} className={`group transition-colors ${darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-3 flex items-center space-x-4">
                      <div className="bg-white p-1.5 border rounded-xl cursor-pointer shadow-sm flex-shrink-0" onClick={() => setQrPreviewItem(item)}>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${item.code}`} className="w-8 h-8" alt="QR" />
                      </div>
                      <div className="min-w-0">
                        <p className={`font-black uppercase text-xs truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.description}</p>
                        <p className="text-[8px] text-[#76923c] font-black uppercase tracking-widest mt-0.5">{item.code}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3 font-black opacity-50 uppercase text-[10px]">{item.size || "-"}</td>
                    <td className="px-6 py-3">
                      <div className={`flex flex-col ${isCrit ? 'text-red-500 font-black' : (darkMode ? 'text-white' : 'text-gray-800 font-bold')}`}>
                        <span className="text-sm flex items-center">{saldo} {isCrit && <AlertTriangle size={12} className="ml-1 animate-pulse" />}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col text-[8px] opacity-60">
                        <span className="font-bold uppercase">{item.updatedBy}</span>
                        <span>{item.updatedAt}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end space-x-1">
                        {currentUser.permissions.canEditItems && <button onClick={() => {setEditingItem(item); setIsFormOpen(true);}} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"><Edit3 size={16} /></button>}
                        {currentUser.permissions.canDeleteItems && <button onClick={() => setItemToDelete(item)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16} /></button>}
                        <button onClick={() => handleAddToOrders(item)} className="p-2 text-[#76923c] hover:bg-green-500/10 rounded-lg transition-all"><ShoppingCart size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      <footer className={`px-6 py-3 border-t-2 flex flex-col md:flex-row items-center justify-between no-print ${darkMode ? 'bg-[#0f0f0f] border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center space-x-8 text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2 md:mb-0">
          <span className="text-[#76923c] flex items-center"><ShieldCheck size={14} className="mr-1.5" /> NEWCOM SST NR-26</span>
          <span className="flex items-center"><Clock size={14} className="mr-1.5" /> {currentTime}</span>
          <span>© {new Date().getFullYear()} GRUPO NEWCOM</span>
        </div>
        <div className="flex items-center space-x-2">
           <button onClick={downloadInventoryCSV} className="flex items-center space-x-2 text-[9px] font-black uppercase tracking-widest text-[#375623] dark:text-[#76923c] hover:opacity-70 transition-all bg-[#76923c]/10 px-6 py-2 rounded-xl border border-[#76923c]/30">
             <FileDown size={14} />
             <span>Baixar Inventário (CSV)</span>
           </button>
        </div>
      </footer>

      {/* MODAL: QR PREVIEW */}
      {qrPreviewItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-black/80 no-print animate-in zoom-in-95">
          <div className={`w-full max-w-[320px] p-8 rounded-3xl shadow-2xl relative text-center border-2 transition-all ${darkMode ? 'bg-[#1a1a1a] border-gray-800 text-white' : 'bg-white border-[#375623]'}`}>
            <button onClick={() => setQrPreviewItem(null)} className="absolute -top-4 -right-4 p-4 bg-red-600 text-white rounded-full shadow-xl hover:bg-red-700 active:scale-75 transition-all z-[210] border-2 border-white dark:border-gray-900">
              <X size={24} strokeWidth={4}/>
            </button>
            <div className="mb-6 p-4 bg-white rounded-2xl border-2 border-gray-100 inline-block shadow-lg">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrPreviewItem.code}`} className="w-40 h-40" alt="QR Code"/>
            </div>
            <div className="space-y-2 mb-8">
              <h3 className="text-base font-black uppercase leading-tight tracking-tight">{qrPreviewItem.description}</h3>
              <p className="text-[9px] font-black uppercase text-[#76923c] tracking-widest">{qrPreviewItem.code} • {qrPreviewItem.size}</p>
            </div>
            <div className="flex flex-col space-y-3">
              <button onClick={triggerPrintTag} className="w-full bg-[#375623] text-white py-3 rounded-xl font-black uppercase flex items-center justify-center space-x-2 text-[9px] shadow-md hover:bg-[#2a411a] active:scale-95 tracking-widest transition-all"><Printer size={18}/><span>Imprimir Etiqueta</span></button>
              <button onClick={downloadQRCode} className="w-full bg-white border-2 border-[#375623] text-[#375623] py-2.5 rounded-xl font-black uppercase flex items-center justify-center space-x-2 text-[9px] shadow-sm active:scale-95 tracking-widest transition-all"><Download size={18}/><span>Baixar Imagem QR</span></button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IA NEWCOM */}
      {aiAssistantOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 backdrop-blur-md bg-black/70 no-print animate-in fade-in">
          <div className={`w-full max-w-2xl h-[80vh] flex flex-col rounded-3xl shadow-2xl border-2 overflow-hidden ${darkMode ? 'bg-[#141414] border-gray-800 text-white' : 'bg-white border-gray-100'}`}>
            <div className="p-6 bg-[#375623] text-white flex justify-between items-center shadow-md">
              <div className="flex items-center space-x-3"><Sparkles size={24} /><h3 className="text-lg font-black uppercase tracking-tight">IA Newcom SST</h3></div>
              <button onClick={() => setAiAssistantOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={28}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
              <div className="bg-[#76923c]/10 p-5 rounded-2xl border border-[#76923c]/20">
                <p className="text-[10px] font-black uppercase text-[#76923c] mb-2 flex items-center"><Shield size={14} className="mr-2"/> Inteligência SST Newcom</p>
                <p className="text-[12px] font-medium leading-relaxed opacity-90">Olá! Sou seu assistente de gestão NR-26. Como posso ajudar com sua sinalização hoje?</p>
              </div>
              {aiResponse && (
                <div className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20 animate-in fade-in">
                   <p className="text-[10px] font-black uppercase text-blue-500 mb-2 flex items-center"><Sparkles size={14} className="mr-2"/> Relatório de Análise</p>
                   <div className="text-[12px] leading-relaxed opacity-90 whitespace-pre-wrap font-medium">{aiResponse}</div>
                </div>
              )}
              {isAiLoading && <div className="flex flex-col items-center justify-center py-8"><div className="w-8 h-8 border-4 border-[#375623] border-t-transparent rounded-full animate-spin mb-3"></div><p className="text-[9px] font-black uppercase tracking-widest animate-pulse">Analisando inventário...</p></div>}
            </div>
            <div className="p-6 border-t dark:border-gray-800 flex space-x-3 bg-gray-50/50 dark:bg-black/20">
              <input value={aiMessage} onChange={(e) => setAiMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAIQuery()} placeholder="Dúvidas sobre estoque ou normas..." className={`flex-1 p-4 rounded-xl border-2 font-black text-[11px] outline-none focus:border-[#375623] transition-all ${darkMode ? 'bg-black border-gray-700 text-white' : 'bg-white border-gray-100 text-gray-900'}`} />
              <button onClick={handleAIQuery} disabled={isAiLoading} className="bg-[#375623] text-white px-6 py-4 rounded-xl shadow-lg hover:bg-[#2a411a] active:scale-95 transition-all"><Send size={20}/></button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAÇÕES / PAINEL OPERADOR */}
      {settingsOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end no-print animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSettingsOpen(false)}></div>
          <div className={`w-full max-w-[280px] h-full p-8 shadow-2xl flex flex-col relative animate-in slide-in-from-right duration-300 border-l ${darkMode ? 'bg-[#111111] border-gray-800 text-white' : 'bg-white border-[#375623] text-gray-900'}`}>
            <div className="flex justify-between items-center mb-8 border-b pb-4 dark:border-gray-800">
              <h2 className="text-base font-black uppercase tracking-tight">Painel Operador</h2>
              <button onClick={() => setSettingsOpen(false)} className="text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all"><X size={20}/></button>
            </div>
            <div className="space-y-6 flex-1">
              <div className={`flex flex-col items-center text-center p-6 rounded-2xl border ${darkMode ? 'bg-[#181818] border-gray-800 shadow-inner' : 'bg-gray-50 border-gray-100'}`}>
                <div className="w-16 h-16 bg-[#375623] text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg mb-4 border-2 border-white/10">{currentUser.name.charAt(0)}</div>
                <p className="font-black uppercase text-sm leading-tight mb-1">{currentUser.name}</p>
                <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">{currentUser.role}</p>
              </div>
              {currentUser.isAdmin && (
                <button onClick={() => { setUserManagementOpen(true); setSettingsOpen(false); }} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:scale-[1.02] shadow-sm ${darkMode ? 'bg-[#222] border-gray-700 text-[#76923c]' : 'bg-white border-gray-100 text-[#375623]'}`}>
                  <span className="font-black text-[10px] uppercase tracking-widest">Gerir Equipe</span>
                  <ShieldCheck size={20}/>
                </button>
              )}
              <div className="space-y-3">
                <p className="text-[8px] font-black uppercase text-gray-400 ml-1 tracking-widest">Segurança</p>
                {changingPass ? (
                  <div className={`space-y-3 p-4 rounded-xl border animate-in zoom-in-95 ${darkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                    <input type="password" placeholder="Nova Senha" className={`w-full p-3 rounded-xl border-2 font-black text-xs outline-none transition-all ${darkMode ? 'bg-black border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`} value={newPass} onChange={(e) => setNewPass(e.target.value)}/>
                    <div className="flex space-x-2">
                      <button onClick={handleChangeOwnPassword} className="flex-1 bg-[#375623] text-white py-2.5 rounded-xl text-[9px] font-black uppercase shadow-lg transition-all active:scale-95">Confirmar</button>
                      <button onClick={() => { setChangingPass(false); setNewPass(""); }} className="flex-1 text-red-500 py-2.5 text-[9px] font-black uppercase hover:bg-red-50 rounded-xl transition-all">Sair</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setChangingPass(true)} className={`w-full py-4 border-2 border-dashed rounded-2xl text-[9px] font-black uppercase flex items-center justify-center space-x-2 transition-all ${darkMode ? 'border-gray-800 text-gray-500 hover:bg-white/5' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                    <KeyRound size={16} /> <span>Trocar Minha Senha</span>
                  </button>
                )}
              </div>
            </div>
            <button onClick={() => { setIsLogged(false); setSettingsOpen(false); }} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-3 hover:bg-red-700">
              <LogOut size={20} /> <span>FINALIZAR SESSÃO</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: RELAÇÃO DE PEDIDO / PAINEL DE REQUISIÇÃO */}
      {ordersPanelOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end no-print">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOrdersPanelOpen(false)}></div>
          <div className={`w-full max-w-[340px] h-full shadow-2xl flex flex-col relative animate-in slide-in-from-right duration-300 border-l ${darkMode ? 'bg-[#141414] text-white border-gray-800' : 'bg-white text-gray-900 border-[#375623]'}`}>
            <div className={`p-6 flex justify-between items-center ${darkMode ? 'bg-black/20 border-b border-gray-800' : 'bg-[#375623] text-white shadow-lg'}`}>
              <div className="flex items-center space-x-3"><ClipboardList size={22} /><h2 className="text-base font-black uppercase tracking-tight leading-tight">Painel de Requisição</h2></div>
              <button onClick={() => setOrdersPanelOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Itens Pendentes</h3>
                   <span className="bg-[#375623] text-white text-[8px] font-bold px-2 py-0.5 rounded-full">{pendingOrders.length}</span>
                </div>
                {pendingOrders.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center opacity-10"><ShoppingCart size={40} className="mb-2"/><p className="font-black text-[9px] uppercase tracking-widest text-center">Nenhum item selecionado</p></div>
                ) : (
                  pendingOrders.map(order => (
                    <div key={order.id} className={`p-4 rounded-2xl border flex items-center space-x-4 transition-all shadow-sm ${darkMode ? 'bg-[#1d1d1d] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black uppercase truncate mb-0.5">{order.description}</p>
                          <p className="text-[9px] text-[#76923c] font-black tracking-widest">{order.code}</p>
                        </div>
                        <div className="flex items-center space-x-2 bg-black/10 dark:bg-white/5 p-1.5 rounded-lg">
                          <button onClick={() => setPendingOrders(prev => prev.map(o => o.id === order.id ? {...o, quantity: Math.max(1, o.quantity - 1)} : o))} className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg"><Minus size={14}/></button>
                          <span className="font-black text-xs w-5 text-center">{order.quantity}</span>
                          <button onClick={() => setPendingOrders(prev => prev.map(o => o.id === order.id ? {...o, quantity: o.quantity + 1} : o))} className="p-1 text-green-500 hover:bg-green-500/10 rounded-lg"><Plus size={14}/></button>
                        </div>
                        <button onClick={() => setPendingOrders(prev => prev.filter(o => o.id !== order.id))} className="text-gray-400 hover:text-red-500 p-1.5 transition-all"><Trash2 size={18}/></button>
                    </div>
                  ))
                )}

                {/* HISTÓRICO DE PEDIDOS */}
                {requisitionHistory.length > 0 && (
                  <div className="pt-8 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 border-b pb-2">Últimos 5 Pedidos</h3>
                    {requisitionHistory.map(hist => (
                      <div key={hist.id} className="p-3 rounded-xl border border-dashed dark:border-gray-800 text-[10px]">
                        <div className="flex justify-between items-center mb-2 font-black uppercase opacity-60">
                          <span>{hist.userName}</span>
                          <span>{hist.dateTime.split(' ')[0]}</span>
                        </div>
                        <div className="space-y-1 opacity-80">
                          {hist.items.map((it, idx) => <p key={idx}>{it}</p>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {pendingOrders.length > 0 && (
              <div className="p-6 border-t dark:border-gray-800 flex flex-col space-y-3 bg-gray-50 dark:bg-black/20">
                <button onClick={downloadRequisitionCSV} className="w-full flex items-center justify-center space-x-3 py-4 rounded-xl font-black text-[10px] uppercase bg-[#375623] text-white shadow-lg active:scale-95 tracking-widest transition-all">
                  <FileDown size={20}/> <span>Baixar Guia (CSV)</span>
                </button>
                <button onClick={() => setPendingOrders([])} className="w-full py-2.5 rounded-xl font-black text-[9px] uppercase text-red-500 border-2 border-red-500/20 active:scale-95 transition-all">Limpar Lista</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: GESTÃO DE OBRAS */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 backdrop-blur-md bg-black/70 no-print animate-in fade-in">
          <div className={`w-full max-w-6xl h-[85vh] flex flex-col rounded-3xl shadow-2xl border-2 overflow-hidden ${darkMode ? 'bg-[#0a0a0a] border-gray-800 text-white' : 'bg-white border-gray-100'}`}>
            <div className="p-6 bg-blue-700 text-white flex justify-between items-center shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-xl"><Briefcase size={28} /></div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Obras & Projetos</h3>
                  <p className="text-[9px] font-bold opacity-70 uppercase tracking-widest">Gerenciamento de Instalações Externas</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button onClick={handleOpenAddProject} className="bg-white text-blue-700 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center space-x-2 shadow-md hover:bg-gray-100 active:scale-95 transition-all">
                  <Plus size={18}/><span>Novo Cadastro</span>
                </button>
                <button onClick={() => setIsProjectModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={32}/></button>
              </div>
            </div>
            <div className={`flex-1 overflow-y-auto p-8 custom-scrollbar ${darkMode ? 'bg-[#0f0f0f]' : 'bg-gray-50/50'}`}>
              {projects.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                  <Layers size={80} className="mb-6" />
                  <p className="font-black uppercase tracking-[0.3em] text-lg">Sem obras cadastradas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {projects.map(project => (
                    <div key={project.id} className={`group p-6 rounded-[2.5rem] border-2 flex flex-col shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden ${darkMode ? 'bg-[#141414] border-gray-800' : 'bg-white border-gray-200/50'}`}>
                      <div className="mb-6 flex justify-between items-start">
                        <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          project.status === 'CONCLUÍDO' ? 'bg-green-500/10 text-green-500' : 
                          project.status === 'EM ANDAMENTO' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'
                        }`}>
                          {project.status || 'PENDENTE'}
                        </div>
                        <div className="flex space-x-1 translate-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => triggerPrintProject(project)} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-xl"><Printer size={18}/></button>
                          <button onClick={() => handleOpenEditProject(project)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl"><Edit3 size={18}/></button>
                          <button onClick={() => setProjectToDelete(project)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl"><Trash size={18}/></button>
                        </div>
                      </div>
                      <div className="mb-6">
                        <h4 className="text-lg font-black uppercase text-blue-600 leading-tight mb-2 truncate">{project.name}</h4>
                        <div className="flex items-center text-[10px] font-bold opacity-60 uppercase tracking-widest mb-4">
                          <Users size={12} className="mr-2" />
                          <span className="truncate">{project.client || 'NÃO DEFINIDO'}</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-3 mb-6 bg-gray-50/50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/50 overflow-y-auto max-h-48 custom-scrollbar">
                        {project.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] font-bold border-b border-black/5 dark:border-white/5 pb-2 last:border-0 last:pb-0">
                            <span className="truncate flex-1 pr-4 uppercase opacity-80">{it.description}</span>
                            <span className="bg-white dark:bg-[#1a1a1a] shadow-sm px-2.5 py-1 rounded-lg text-blue-600 font-black">{it.quantity} <span className="text-[8px] ml-0.5">UN</span></span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-t-2 border-dashed dark:border-gray-800 flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Total Placas</span>
                          <span className="text-xl font-black text-blue-700">{project.items.reduce((acc, cur) => acc + cur.quantity, 0)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Cadastrada em</span>
                          <span className="block text-[9px] font-black uppercase opacity-60">{project.createdAt.split(',')[0]}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL: CADASTRAR/EDITAR OBRA */}
      {isAddProjectOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-black/60 no-print animate-in zoom-in-95">
          <form onSubmit={handleSaveProject} className={`w-full max-w-2xl p-8 rounded-3xl shadow-2xl border-2 flex flex-col max-h-[90vh] ${darkMode ? 'bg-[#1a1a1a] border-gray-800 text-white' : 'bg-white border-gray-100 text-gray-900'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black uppercase flex items-center text-blue-500 dark:text-blue-400"><Briefcase size={24} className="mr-3"/> {editingProject ? 'Editar Obra' : 'Novo Cadastro de Obra'}</h3>
              <button type="button" onClick={() => { setIsAddProjectOpen(false); setEditingProject(null); }} className={`p-2 rounded-full transition-all ${darkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'}`}><X size={28}/></button>
            </div>
            <div className="space-y-6 mb-8 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`text-[9px] font-black uppercase block mb-1 ml-1 tracking-widest ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Nome da Obra / Projeto</label>
                  <input required value={newProjectName} onChange={e => setNewProjectName(e.target.value)} className={`w-full p-4 rounded-xl border-2 font-black text-xs outline-none focus:border-blue-500 transition-all ${darkMode ? 'bg-black border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} placeholder="EX: PRÉDIO COMERCIAL - ALFA" />
                </div>
                <div>
                  <label className={`text-[9px] font-black uppercase block mb-1 ml-1 tracking-widest ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cliente / Responsável</label>
                  <input value={newProjectClient} onChange={e => setNewProjectClient(e.target.value)} className={`w-full p-4 rounded-xl border-2 font-black text-xs outline-none focus:border-blue-500 transition-all ${darkMode ? 'bg-black border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} placeholder="EX: ENGENHARIA LTDA" />
                </div>
              </div>
              <div className="space-y-3">
                <label className={`text-[9px] font-black uppercase block mb-1 ml-1 tracking-widest ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Adicionar Placas do Inventário</label>
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar p-2 border rounded-xl ${darkMode ? 'border-gray-800 bg-black/30' : 'border-gray-100 bg-gray-50/50'}`}>
                  {items.map(item => (
                    <button type="button" key={item.id} onClick={() => addItemToProjectSelection(item)} className={`p-3 rounded-xl border-2 flex items-center justify-between text-left transition-all active:scale-95 group ${darkMode ? 'border-gray-800 hover:border-blue-500 bg-white/5' : 'border-gray-200 hover:border-blue-500 bg-white shadow-sm'}`}>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] font-black uppercase truncate group-hover:text-blue-500 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.description}</p>
                        <p className={`text-[8px] font-bold opacity-40 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.code}</p>
                      </div>
                      <Plus size={16} className="text-blue-500 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
              {selectedItemsForProject.length > 0 && (
                <div className="space-y-3 pt-4">
                  <label className="text-[9px] font-black uppercase text-blue-500 block mb-1 ml-1 tracking-widest">Resumo de Itens Selecionados</label>
                  <div className="space-y-2">
                    {selectedItemsForProject.map((it, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-blue-600/10 border-blue-600/30' : 'bg-blue-50 border-blue-100'}`}>
                        <div className="flex-1 min-w-0 pr-4">
                          <p className={`text-[11px] font-black uppercase truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{it.description}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button type="button" onClick={() => setSelectedItemsForProject(prev => prev.map(i => i.itemId === it.itemId ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="p-1.5 text-red-500 rounded-lg"><Minus size={16}/></button>
                          <span className={`font-black text-xs w-10 text-center py-1 rounded-lg ${darkMode ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>{it.quantity}</span>
                          <button type="button" onClick={() => setSelectedItemsForProject(prev => prev.map(i => i.itemId === it.itemId ? {...i, quantity: i.quantity + 1} : i))} className="p-1.5 text-green-600 rounded-lg"><Plus size={16}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 pt-6 border-t dark:border-gray-800">
              <button type="button" onClick={() => { setIsAddProjectOpen(false); setEditingProject(null); }} className={`py-4 border-2 rounded-2xl text-[10px] font-black uppercase transition-all ${darkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-500'}`}>Cancelar</button>
              <button type="submit" className="py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-blue-700">Confirmar</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EQUIPE (GESTÃO OPERADORES) - RESTAURADO ORGANIZADO */}
      {userManagementOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-black/70 no-print animate-in fade-in">
          <div className={`w-full max-w-4xl p-8 rounded-3xl shadow-2xl border flex flex-col max-h-[90vh] ${darkMode ? 'bg-[#1a1a1a] text-white border-gray-800' : 'bg-white border-gray-100'}`}>
            <div className="flex justify-between items-center mb-8">
               <div>
                  <h3 className="text-xl font-black uppercase flex items-center space-x-3"><ShieldCheck size={28} className="text-[#76923c]"/> <span>Gestão de Operadores</span></h3>
                  <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Controle de acesso e funções</p>
               </div>
               <div className="flex items-center space-x-2">
                  <button onClick={() => setAddUserOpen(true)} className="flex items-center space-x-2 bg-[#375623] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-[#2a411a] transition-all"><UserPlus size={16}/> <span>Novo Operador</span></button>
                  <button onClick={() => setUserManagementOpen(false)} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><X size={28}/></button>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
               {users.map(u => (
                 <div key={u.id} className={`p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 transition-all ${darkMode ? 'bg-[#111] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center space-x-4 min-w-[200px]">
                       <div className={`w-12 h-12 ${u.isAdmin ? 'bg-[#375623]' : 'bg-gray-300'} text-white rounded-xl flex items-center justify-center font-black text-xl shadow-md`}>{u.name.charAt(0)}</div>
                       <div>
                          <p className="font-black text-sm uppercase flex items-center">{u.name} {u.isAdmin && <Shield size={12} className="ml-2 text-[#76923c]"/>}</p>
                          <p className="text-[9px] opacity-60 uppercase tracking-widest">{u.role}</p>
                       </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                       {['canAddItems', 'canEditItems', 'canDeleteItems', 'canManageUsers'].map(perm => (
                         <button 
                           key={perm}
                           disabled={u.isAdmin || u.id === currentUser.id}
                           onClick={() => toggleUserPermission(u.id, perm as keyof UserPermissions)}
                           className={`p-2 rounded-xl border transition-all ${u.permissions[perm as keyof UserPermissions] ? 'bg-[#375623]/10 border-[#375623] text-[#375623]' : 'bg-transparent border-gray-300 text-gray-400 opacity-20 dark:border-gray-700'}`}
                           title={perm === 'canAddItems' ? 'Adicionar Itens' : perm === 'canEditItems' ? 'Editar Itens' : perm === 'canDeleteItems' ? 'Excluir Itens' : 'Gerir Equipe'}
                         >
                           {perm === 'canAddItems' ? <Plus size={16}/> : perm === 'canEditItems' ? <Edit3 size={16}/> : perm === 'canDeleteItems' ? <Trash2 size={16}/> : <Users size={16}/>}
                         </button>
                       ))}
                       <div className="w-px h-8 bg-gray-300 dark:bg-gray-700 mx-2"></div>
                       <button onClick={() => resetUserPasswordManually(u.id)} className="p-2 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-xl hover:bg-blue-600 hover:text-white" title="Resetar Senha"><RefreshCcw size={16}/></button>
                       {!u.isAdmin && (
                         <button onClick={() => setUserToDelete(u)} className="p-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-600 hover:text-white" title="Remover Operador"><UserMinus size={16}/></button>
                       )}
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICAÇÕES - RESTAURADO resetRequests E ÍCONES DE AÇÃO */}
      {notifOpen && (
        <div className="fixed inset-0 z-[140] no-print" onClick={() => setNotifOpen(false)}>
          <div className="absolute right-6 top-16 w-80 rounded-3xl shadow-2xl border-2 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white overflow-hidden animate-in slide-in-from-top-6 border-gray-100 dark:border-gray-800" onClick={e => e.stopPropagation()}>
             <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/40 flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#375623] dark:text-[#76923c]">Avisos e Pendências</h4>
                <button onClick={() => setNotifOpen(false)}><X size={18}/></button>
             </div>
             <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {/* SOLICITAÇÕES DE SENHA PARA ADMIN */}
                {currentUser.isAdmin && resetRequests.map((req, i) => (
                  <div key={i} className="p-4 border-b dark:border-gray-800 bg-red-50 dark:bg-red-900/10">
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-[10px] font-black uppercase text-red-600">Reset de Senha</p>
                          <p className="text-[11px] font-bold">Operador: {req.userName}</p>
                        </div>
                        <span className="text-[8px] font-black opacity-30">{req.time}</span>
                     </div>
                     <button onClick={() => handleResetPassword(i.toString(), req.userId)} className="w-full bg-red-600 text-white py-2 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-95">Redefinir para 1234</button>
                  </div>
                ))}

                {/* ITENS CRÍTICOS COM AÇÕES */}
                {stats.alertItems.length > 0 ? (
                  stats.alertItems.map(item => {
                    const isSeparated = separatedItemIds.has(item.id);
                    return (
                      <div key={item.id} className={`p-4 border-b dark:border-gray-800 transition-all ${isSeparated ? 'bg-green-50/50 dark:bg-green-900/10 opacity-60' : ''}`}>
                         <div className="flex justify-between items-center">
                            <div className="min-w-0 pr-4">
                               <p className="text-[10px] font-black uppercase truncate">{item.description}</p>
                               <p className="text-[9px] text-red-500 font-bold flex items-center"><AlertTriangle size={10} className="mr-1"/> Crítico: {item.entry - item.exit} un.</p>
                            </div>
                            <div className="flex space-x-1">
                               <button onClick={() => toggleSeparated(item.id)} className={`p-2 rounded-lg transition-all ${isSeparated ? 'bg-green-500 text-white' : 'text-gray-300 hover:text-green-500'}`} title="Marcar como Separado"><PackageCheck size={16}/></button>
                               <button onClick={() => handleAddToOrders(item)} className="p-2 bg-[#375623] text-white rounded-lg hover:bg-[#2a411a]"><ShoppingCart size={14}/></button>
                            </div>
                         </div>
                      </div>
                    );
                  })
                ) : (
                  resetRequests.length === 0 && <div className="p-12 text-center opacity-10 text-[10px] font-black uppercase tracking-widest leading-relaxed">Nenhuma<br/>Mensagem</div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* RESTO DO CÓDIGO MANTIDO... */}
      {addUserOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 backdrop-blur-md bg-black/60 no-print animate-in zoom-in-95">
          <form onSubmit={handleAddUser} className={`w-full max-w-sm p-8 rounded-3xl shadow-2xl border-2 ${darkMode ? 'bg-[#1a1a1a] border-gray-800 text-white' : 'bg-white border-gray-100 text-gray-900'}`}>
             <h3 className="text-lg font-black uppercase mb-6 flex items-center"><UserPlus size={24} className="mr-3 text-[#375623]"/> Novo Operador</h3>
             <div className="space-y-4 mb-8">
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Nome Completo</label>
                  <input required name="name" className={`w-full p-3 rounded-xl border-2 font-bold outline-none focus:border-[#375623] ${darkMode ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Cargo / Departamento</label>
                  <input required name="role" className={`w-full p-3 rounded-xl border-2 font-bold outline-none focus:border-[#375623] ${darkMode ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
                </div>
                <div className="flex items-center space-x-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl">
                   <input type="checkbox" name="isAdmin" id="isAdminCheck" className="w-5 h-5 accent-[#375623]" />
                   <label htmlFor="isAdminCheck" className="text-[11px] font-black uppercase cursor-pointer">Acesso Administrador</label>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setAddUserOpen(false)} className={`py-4 border-2 rounded-xl text-[10px] font-black uppercase transition-all ${darkMode ? 'border-gray-800 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}>Cancelar</button>
                <button type="submit" className="py-4 bg-[#375623] text-white rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">Criar Acesso</button>
             </div>
          </form>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-md bg-black/80 no-print animate-in zoom-in-95">
          <div className={`w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center border-2 ${darkMode ? 'bg-[#1a1a1a] border-red-900/30 text-white' : 'bg-white border-red-50'}`}>
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6"><UserMinus size={32} /></div>
            <h3 className="text-lg font-black uppercase mb-3 tracking-tight">Excluir Operador?</h3>
            <p className="text-[10px] opacity-60 mb-8 font-bold leading-relaxed px-4 uppercase tracking-widest">Deseja remover o acesso de <span className="text-red-500 font-black">{userToDelete.name}</span> permanentemente?</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setUserToDelete(null)} className={`py-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>Cancelar</button>
              <button onClick={confirmDeleteUser} className="py-4 rounded-xl text-[10px] font-black uppercase bg-red-600 text-white shadow-xl active:scale-95 transition-all">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-md bg-black/80 no-print animate-in zoom-in-95">
          <div className={`w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center border-2 ${darkMode ? 'bg-[#1a1a1a] border-red-900/30 text-white' : 'bg-white border-red-50'}`}>
            <h3 className="text-lg font-black uppercase mb-3">Excluir Registro?</h3>
            <p className="text-[10px] opacity-60 mb-8 font-bold">O item {itemToDelete.description} será removido para sempre.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setItemToDelete(null)} className="py-4 border-2 rounded-xl text-[10px] font-black uppercase transition-all">Voltar</button>
              <button onClick={confirmDeleteItem} className="py-4 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg transition-all active:scale-95">Sim, Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 backdrop-blur-sm bg-black/50 overflow-y-auto no-print">
          <form onSubmit={handleSaveItem} className={`w-full max-w-2xl p-8 rounded-3xl shadow-2xl relative my-auto animate-in zoom-in-95 ${darkMode ? 'bg-[#1a1a1a] border border-gray-800 text-white' : 'bg-white text-gray-900'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase text-[#375623] dark:text-[#76923c] flex items-center space-x-3 tracking-tight">
                <Edit3 size={24} /><span>{editingItem ? 'Editar Registro' : 'Novo Registro NR-26'}</span>
              </h3>
              <button type="button" onClick={() => { setIsFormOpen(false); setEditingItem(null); }} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-all"><X size={28}/></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 mb-1 ml-1 block tracking-widest">Código SST</label>
                  <input required name="code" defaultValue={editingItem?.code} className={`w-full p-3.5 rounded-xl border-2 font-black text-xs outline-none focus:border-[#375623] transition-all ${darkMode ? 'bg-black border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} placeholder="EX: A-101"/>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 mb-1 ml-1 block tracking-widest">Identificação da Placa</label>
                  <input required name="description" defaultValue={editingItem?.description} className={`w-full p-3.5 rounded-xl border-2 font-black text-xs outline-none focus:border-[#375623] transition-all ${darkMode ? 'bg-black border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} placeholder="EX: CUIDADO PISO MOLHADO"/>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 mb-1 ml-1 block tracking-widest">Dimensão</label>
                  <input name="size" defaultValue={editingItem?.size} className={`w-full p-3.5 rounded-xl border-2 font-black text-xs outline-none focus:border-[#375623] transition-all ${darkMode ? 'bg-black border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} placeholder="EX: 30X20CM"/>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase text-blue-500 mb-1 ml-1 block tracking-widest">Entrada</label>
                    <input required type="number" name="entry" defaultValue={editingItem?.entry || 0} className={`w-full p-3.5 rounded-xl border-2 font-black text-xs outline-none ${darkMode ? 'bg-black border-blue-900' : 'bg-blue-50 border-blue-100'}`} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-orange-500 mb-1 ml-1 block tracking-widest">Saída</label>
                    <input required type="number" name="exit" defaultValue={editingItem?.exit || 0} className={`w-full p-3.5 rounded-xl border-2 font-black text-xs outline-none ${darkMode ? 'bg-black border-orange-900' : 'bg-orange-50 border-orange-100'}`} />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-red-500 mb-1 ml-1 block tracking-widest">Mínimo (Alerta)</label>
                  <input required type="number" name="minStock" defaultValue={editingItem?.minStock || 5} className={`w-full p-3.5 rounded-xl border-2 font-black text-xs outline-none ${darkMode ? 'bg-black border-red-900' : 'bg-red-50 border-red-100'}`} />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 mb-1 ml-1 block tracking-widest">Observações Técnicas</label>
                  <textarea name="observations" defaultValue={editingItem?.observations} rows={2} className={`w-full p-3.5 rounded-xl border-2 font-black text-xs resize-none outline-none focus:border-[#375623] ${darkMode ? 'bg-black border-gray-800' : 'bg-gray-50 border-gray-200'}`} placeholder="Observações..."></textarea>
                </div>
              </div>
            </div>
            <button type="submit" className="w-full bg-[#375623] hover:bg-[#2a411a] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95">Salvar Registro</button>
          </form>
        </div>
      )}

      {projectToDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-md bg-black/80 no-print animate-in zoom-in-95">
          <div className={`w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl text-center border-2 ${darkMode ? 'bg-[#1a1a1a] border-red-900/30 text-white' : 'bg-white border-red-50'}`}>
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6"><AlertTriangle size={40} /></div>
            <h3 className="text-xl font-black uppercase mb-3 tracking-tight">Excluir Obra?</h3>
            <p className="text-[10px] opacity-60 mb-8 font-bold leading-relaxed px-4 uppercase tracking-widest">Deseja remover a obra <span className="text-red-500 font-black">{projectToDelete.name}</span>?</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setProjectToDelete(null)} className={`py-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>Voltar</button>
              <button onClick={confirmDeleteProject} className="py-4 rounded-2xl text-[10px] font-black uppercase bg-red-600 text-white shadow-xl active:scale-95 transition-all">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        body { font-family: 'Inter', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); }
        @media print { 
          .no-print { display: none !important; } 
        }
      `}</style>
    </div>
  );
};

export default App;
