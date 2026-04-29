// App.jsx - Versão ULTRA Pro para AJR Matcon
import React, { useState, useEffect, useMemo } from "react";
import { 
  ShoppingCart, Heart, Search, Menu, X, 
  Phone, MapPin, Facebook, Instagram, 
  Youtube, Truck, Shield, Clock, Star, 
  ChevronRight, MessageCircle, User,
  Plus, Minus, Trash2, Info, ArrowUp,
  Package, HardHat, Zap, 
  Paintbrush, Construction, CreditCard, Mail, ShieldCheck,
  Settings, LogIn, LogOut, Save, Edit, Trash,
  Wrench, Droplets, Layers, Hammer, Bell, AlertTriangle, Eye, Ticket, Tag
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import imageCompression from 'browser-image-compression';
import { 
  db, auth, login, logout, handleFirestoreError, storage, getUserFriendlyErrorMessage 
} from "./firebase";
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, writeBatch 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// --- Configurações e Dados ---
const DEFAULT_SETTINGS = {
  name: "AJR",
  fullName: "Engenharia & Construção",
  whatsapp: "5583993217077",
  whatsappDisplay: "(83) 99321-7077",
  email: "ajrpropecto.ang@gmail.com",
  address: "Av. José Hamilton Alves, 700 - Distrito Industrial - Campina Grande - PB, CEP 58415-458",
  hours: "Seg-Sex: 07h às 18h | Sáb: 07h às 12h",
  heroTitle: "Sua obra Prime começa aqui.",
  heroSubtitle: "A experiência definitiva em materiais de alta performance. Oferecemos logística ágil, marcas premium e assessoria técnica especializada.",
  cityYear: "2024 AJR MatconEng - Campina Grande/PB",
};

const products = [];

const categories = [
  { id: "all", name: "Todos", icon: <Package className="w-4 h-4" /> },
  { id: "materiais", name: "Materiais Base", icon: <Construction className="w-4 h-4" /> },
  { id: "hidraulica", name: "Hidráulica", icon: <Droplets className="w-4 h-4" /> },
  { id: "eletrica", name: "Elétrica", icon: <Zap className="w-4 h-4" /> },
  { id: "pisos", name: "Pisos & Revestimento", icon: <Layers className="w-4 h-4" /> },
  { id: "tintas", name: "Tintas & Acabamento", icon: <Paintbrush className="w-4 h-4" /> },
  { id: "ferramentas", name: "Ferramentas", icon: <Hammer className="w-4 h-4" /> },
  { id: "ferragens", name: "Ferragens", icon: <Wrench className="w-4 h-4" /> },
  { id: "epis", name: "EPIs & Segurança", icon: <HardHat className="w-4 h-4" /> },
];

// --- Sub-componentes ---

const Badge = ({ children, color = "amber" }) => {
  const colors = {
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    red: "bg-rose-100 text-rose-700 border-rose-200",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${colors[color]}`}>
      {children}
    </span>
  );
};

function AdminPanel({ isOpen, onClose, initialProduct, products, onEdit, settings, onUpdateSettings }) {
  const [activeTab, setActiveTab] = useState("products"); // "products" | "settings"
  const [formData, setFormData] = useState({
    name: "", category: "materiais", price: "", oldPrice: "", 
    unit: "un", brand: "", description: "", image: "", images: [], rating: 5, imageMethod: "url", stock: 0
  });

  // Utility to clean objects for Firestore (removes undefined)
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [settingsData, setSettingsData] = useState(() => ({...DEFAULT_SETTINGS, ...(settings || {})}));
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");

  // Sync settingsData when settings prop changes (e.g. from firestore load)
  useEffect(() => {
    if (settings) {
      setSettingsData(prev => ({ ...prev, ...settings }));
    }
  }, [settings]);

  // Load product data into form when editing starts
  useEffect(() => {
    if (isOpen && initialProduct) {
      setFormData({
        name: initialProduct?.name || "",
        category: initialProduct?.category || "materiais",
        price: initialProduct?.price || "",
        oldPrice: initialProduct?.oldPrice || "",
        unit: initialProduct?.unit || "un",
        stock: initialProduct?.stock || 0,
        brand: initialProduct?.brand || "",
        description: initialProduct?.description || "",
        image: initialProduct?.image || "",
        images: Array.isArray(initialProduct?.images) ? [...initialProduct.images] : (initialProduct?.image ? [initialProduct.image] : []),
        rating: initialProduct?.rating || 5,
        imageMethod: "url"
      });
    } else if (isOpen && !initialProduct) {
      // Reset form if opening for "New Product"
      setFormData({ 
        name: "", category: "materiais", price: "", oldPrice: "", 
        unit: "un", stock: 0, brand: "", description: "", 
        image: "", images: [], rating: 5, imageMethod: "url" 
      });
    }
  }, [initialProduct, isOpen]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };
      
      const newImageUrls = [];
      const imageFiles = files as File[];
      for (const file of imageFiles) {
        toast.info(`Processando ${file.name}...`);
        const compressedFile = await imageCompression(file, options);
        const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, compressedFile);
        const downloadURL = await getDownloadURL(snapshot.ref);
        newImageUrls.push(downloadURL);
      }
      
      setFormData(prev => {
        const updatedImages = [...(prev.images || []), ...newImageUrls];
        return {
          ...prev, 
          images: updatedImages,
          image: prev.image || updatedImages[0] || ""
        };
      });
      toast.success(`${files.length} foto(s) carregada(s)!`);
    } catch (err) {
      console.error("FileUpload error:", err);
      toast.error(`Erro ao carregar foto: ${err instanceof Error ? err.message : 'Falha no upload'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      const name = (formData.name || "").trim();
      if (!name) {
        toast.error("Nome do produto é obrigatório");
        return;
      }

      const { imageMethod, ...rest } = formData;
      const data = { 
        ...rest, 
        name, 
        price: Number(formData.price || 0), 
        oldPrice: formData.oldPrice ? Number(formData.oldPrice) : null, 
        rating: Number(formData.rating || 5), 
        stock: Number(formData.stock || 0),
        images: Array.isArray(formData.images) ? formData.images : []
      };
      
      if (initialProduct?.id) {
        await updateDoc(doc(db, "products", initialProduct.id), data);
        toast.success("Produto atualizado!");
        if (Number(data.stock) < 5) {
          fetch("/api/notify-low-stock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productName: data.name,
              stock: data.stock,
              adminEmail: settingsData.email
            })
          }).catch(console.error);
        }
      } else {
        await addDoc(collection(db, "products"), data);
        toast.success("Produto adicionado!");
        if (Number(data.stock) < 5) {
          fetch("/api/notify-low-stock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productName: data.name,
              stock: data.stock,
              adminEmail: settingsData.email
            })
          }).catch(console.error);
        }
      }
      onEdit(null); // Return to list
    } catch (err) {
      handleFirestoreError(err, initialProduct?.id ? "update" : "create", "products" as any);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      toast.success("Produto excluído!");
    } catch (err) {
      toast.error(getUserFriendlyErrorMessage(err));
    }
  };

  const filteredProducts = (products || []).filter(p => {
    if (!p) return false;
    const safeName = (p.name || "").toLowerCase();
    const safeBrand = (p.brand || "").toLowerCase();
    const search = (searchTerm || "").toLowerCase();
    const matchSearch = safeName.includes(search) || safeBrand.includes(search);
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchCat && matchSearch;
  });

  // Bulk actions
  const isAllSelected = filteredProducts.length > 0 && selectedIds.length === filteredProducts.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleProductSelection = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkUpdatePrice = async () => {
    if (!bulkPrice || isNaN(Number(bulkPrice))) {
      toast.error("Por favor, insira um preço válido.");
      return;
    }
    const price = Number(bulkPrice);
    if (!confirm(`Tem certeza que deseja atualizar o preço de ${selectedIds.length} produtos para R$ ${price.toFixed(2)}?`)) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach((id) => {
        batch.update(doc(db, "products", id), { price });
      });
      await batch.commit();
      toast.success("Preços atualizados!");
      setSelectedIds([]);
      setBulkPrice("");
    } catch (err) {
      toast.error(getUserFriendlyErrorMessage(err));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.length} produtos?`)) return;
    try {
      await Promise.all(selectedIds.map(id => deleteDoc(doc(db, "products", id))));
      toast.success("Produtos excluídos!");
      setSelectedIds([]);
    } catch (err) {
      toast.error(getUserFriendlyErrorMessage(err));
    }
  };

  const lowStockCount = (products || []).filter(p => p && Number(p.stock || 0) < 5).length;
  const lowStockList = (products || []).filter(p => p && Number(p.stock || 0) < 5);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm" />
          <motion.div 
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} 
            className="relative bg-white w-full max-w-3xl h-full shadow-2xl flex flex-col"
          >
            <div className="flex flex-col sm:flex-row h-full overflow-hidden">
              {/* Sidebar do Admin */}
              <div className="w-full sm:w-24 bg-zinc-50 border-b sm:border-b-0 sm:border-r border-zinc-200 flex flex-row sm:flex-col items-center py-2 sm:py-6 px-2 sm:px-0 gap-1 sm:gap-4 shrink-0 overflow-x-auto no-scrollbar">
                <button 
                  onClick={() => { setActiveTab("products"); onEdit(null); }}
                  className={`flex-1 sm:flex-none p-3 sm:p-4 rounded-xl flex flex-col items-center gap-1 transition-all ${activeTab === "products" && !initialProduct ? "bg-amber-600 text-white shadow-lg shadow-amber-200" : "text-zinc-400 hover:bg-zinc-100"}`}
                  title="Produtos"
                >
                  <Package size={20} />
                  <span className="text-[9px] font-black uppercase tracking-tighter">Estoque</span>
                </button>
                <button 
                  onClick={() => { setActiveTab("settings"); onEdit(null); }}
                  className={`flex-1 sm:flex-none p-3 sm:p-4 rounded-xl flex flex-col items-center gap-1 transition-all ${activeTab === "settings" ? "bg-amber-600 text-white shadow-lg shadow-amber-200" : "text-zinc-400 hover:bg-zinc-100"}`}
                  title="Configurações"
                >
                  <Settings size={20} />
                  <span className="text-[9px] font-black uppercase tracking-tighter">Ajustes</span>
                </button>
              </div>

              <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-4 sm:p-8 border-b border-zinc-100 flex items-center justify-between bg-white relative shrink-0">
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter flex items-center gap-2 sm:gap-3 truncate">
                    {initialProduct ? (
                      initialProduct.id ? <><Edit className="text-amber-600" /> Editar Produto</> : <><Plus className="text-amber-600" /> Adicionar Produto</>
                    ) : (
                      activeTab === "products" ? <><Package className="text-amber-600" /> Gestão de Estoque</> : 
                      activeTab === "settings" ? <><Settings className="text-amber-600" /> Configurações</> :
                      <><Ticket className="text-amber-600" /> Cupons</>
                    )}
                  </h3>
                  
                  <div className="flex items-center gap-4">
                    {activeTab === "products" && !initialProduct && (
                      <div className="relative">
                        <button 
                          onClick={() => setShowNotifications(!showNotifications)}
                          className="p-3 bg-white border border-zinc-200 rounded-2xl hover:bg-zinc-100 transition relative"
                        >
                          <Bell size={20} className="text-zinc-600" />
                          {lowStockCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm">
                              {lowStockCount}
                            </span>
                          )}
                        </button>
                        
                        <AnimatePresence>
                          {showNotifications && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className="absolute right-0 top-[120%] mt-2 w-80 bg-white shadow-2xl rounded-2xl border border-zinc-100 overflow-hidden z-[250] flex flex-col"
                            >
                              <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                                <h4 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                                  <AlertTriangle size={16} className="text-rose-500" />
                                  Estoque Crítico
                                </h4>
                              </div>
                              <div className="max-h-[300px] overflow-y-auto w-full no-scrollbar">
                                {lowStockList.length > 0 ? (
                                  lowStockList.map(p => (
                                    <div key={`alert-${p.id}`} className="p-4 border-b border-zinc-50 hover:bg-zinc-50 transition cursor-pointer flex justify-between items-center" onClick={() => { onEdit(p); setShowNotifications(false); }}>
                                      <div className="truncate pr-4">
                                        <p className="font-bold text-sm text-zinc-800 leading-tight mb-1 truncate">{p.name || ""}</p>
                                        <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest">{p.stock || 0} unid.</span>
                                      </div>
                                      <ChevronRight size={16} className="text-zinc-400 shrink-0" />
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-6 text-center text-zinc-500 text-sm font-bold">
                                    Nenhum produto com estoque baixo.
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    <button onClick={onClose} className="p-3 bg-zinc-100 hover:bg-zinc-200 rounded-2xl transition"><X size={20} /></button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto w-full">
                  {initialProduct ? (
                    <form onSubmit={handleProductSubmit} className="p-4 sm:p-8 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="col-span-1 sm:col-span-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Nome do Produto</label>
                          <input required value={formData.name || ""} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500 transition" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Categoria</label>
                          <select value={formData.category || "materiais"} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500 transition">
                            {categories.filter(c => c.id !== "all").map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Marca</label>
                          <input required value={formData.brand || ""} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500 transition" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Quantidade em Estoque</label>
                          <input required type="number" value={formData.stock || 0} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500 transition" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Preço (R$)</label>
                          <input required type="number" step="0.01" value={formData.price || ""} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500 transition" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Preço Antigo</label>
                          <input type="number" step="0.01" value={formData.oldPrice || ""} onChange={e => setFormData({...formData, oldPrice: e.target.value})} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500 transition" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Unidade</label>
                          <input required value={formData.unit || ""} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500 transition" />
                        </div>
                        
                        <div className="col-span-1 sm:col-span-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 block">Fotos</label>
                          <div className="flex gap-4 mb-4">
                            <button type="button" onClick={() => setFormData({...formData, imageMethod: 'url'})} className={`flex-1 py-3 rounded-xl font-black text-xs ${formData.imageMethod !== 'upload' ? 'bg-amber-600 text-white' : 'bg-zinc-100'}`}>URL</button>
                            <button type="button" onClick={() => setFormData({...formData, imageMethod: 'upload'})} className={`flex-1 py-3 rounded-xl font-black text-xs ${formData.imageMethod === 'upload' ? 'bg-amber-600 text-white' : 'bg-zinc-100'}`}>Upload</button>
                          </div>
                                  {formData.imageMethod === 'url' ? (
                            <input placeholder="URL da imagem principal" value={formData.image || ""} onChange={e => setFormData({...formData, image: e.target.value, images: (formData.images && formData.images.length > 0) ? formData.images : [e.target.value]})} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500 transition" />
                          ) : (
                            <div className="p-6 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50 text-center">
                              <input type="file" multiple onChange={handleFileUpload} className="hidden" id="admin-file-upload" />
                              <label htmlFor="admin-file-upload" className="cursor-pointer font-bold text-zinc-500 hover:text-amber-600 transition">
                                {uploading ? "Sincronizando..." : "+ Adicionar Imagens"}
                              </label>
                            </div>
                          )}
                          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 noscrollbar">
                            {(Array.isArray(formData?.images) ? formData.images : []).map((img, i) => (
                              <div key={i} className="relative w-20 h-20 bg-zinc-100 rounded-xl overflow-hidden shrink-0 border border-zinc-200">
                                <img src={img} className="w-full h-full object-cover" alt="Preview" />
                                <button type="button" onClick={() => {
                                  const imagesArr = Array.isArray(formData?.images) ? formData.images : [];
                                  const newImgs = imagesArr.filter((_, idx) => idx !== i);
                                  setFormData({...formData, images: newImgs, image: newImgs[0] || ""});
                                }} className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-rose-600"><X size={12}/></button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Descrição</label>
                          <textarea rows={4} value={formData.description || ""} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500 transition" />
                        </div>
                      </div>
                      <div className="pt-6 flex gap-4">
                        <button type="button" onClick={() => onEdit(null)} className="flex-1 py-5 bg-zinc-100 text-zinc-500 font-black rounded-3xl hover:bg-zinc-200 transition uppercase text-xs tracking-widest">Voltar</button>
                        <button type="submit" disabled={uploading} className={`flex-[2] py-5 font-black rounded-3xl transition shadow-xl uppercase text-xs tracking-widest ${uploading ? 'bg-zinc-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-500 text-white'}`}>
                          {uploading ? "Processando..." : "Salvar Produto"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {activeTab === "products" && (
                        <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
                          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <div className="flex-1 relative">
                              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                              <input placeholder="Buscar no estoque..." value={searchTerm || ""} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 text-sm sm:text-base bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500 transition" />
                            </div>
                            <select value={categoryFilter || "all"} onChange={e => setCategoryFilter(e.target.value)} className="p-4 text-sm sm:text-base bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500 transition w-full sm:w-auto">
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                               <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="w-5 h-5 rounded border-zinc-300 text-amber-600 focus:ring-amber-500" />
                                 <span className="text-xs font-black uppercase text-zinc-600">Selecionar Todos</span>
                               </label>
                               {selectedIds.length > 0 && (
                                 <div className="flex items-center gap-2">
                                   <input 
                                     type="number" 
                                     placeholder="Novo Preço (R$)" 
                                     value={bulkPrice} 
                                     onChange={e => setBulkPrice(e.target.value)}
                                     className="w-32 p-2 text-xs border border-zinc-200 rounded-xl"
                                   />
                                   <button onClick={handleBulkUpdatePrice} className="text-amber-600 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-xl border border-amber-100 transition text-xs font-black uppercase shadow-sm">
                                      Atualizar Preço
                                   </button>
                                   <button onClick={handleBulkDelete} className="flex items-center gap-2 text-rose-600 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-xl border border-rose-100 transition text-xs font-black uppercase shadow-sm">
                                     <Trash2 size={16} /> Excluir {selectedIds.length}
                                   </button>
                                 </div>
                               )}
                            </div>
                              {Array.isArray(filteredProducts) && filteredProducts.map(p => (
                                <div key={p?.id || Math.random()} className="p-4 bg-white border border-zinc-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-amber-200 transition-colors">
                                  <div className="flex items-center gap-4">
                                    <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleProductSelection(p.id)} className="w-5 h-5 rounded border-zinc-300 text-amber-600 focus:ring-amber-500" />
                                    <div onClick={() => setSelectedImage(p?.image || null)} className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-100 rounded-xl overflow-hidden shrink-0 border border-zinc-200 cursor-pointer">
                                      <img src={p?.image || ""} className="w-full h-full object-cover" alt={p?.name || ""} loading="lazy" decoding="async" />
                                    </div>
                                    <div className="min-w-0">
                                      <h5 className="font-bold text-sm sm:text-base leading-tight truncate">{p?.name || ""}</h5>
                                      <p className="text-[11px] sm:text-xs text-zinc-500 mt-1">{p?.brand || ""} | R$ {Number(p?.price || 0).toFixed(2)} | <span className={(Number(p?.stock || 0)) < 5 ? "text-rose-500 font-bold" : ""}>{p?.stock || 0} unid.</span></p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <button onClick={() => onEdit(p)} className="p-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 rounded-xl transition text-zinc-500"><Edit size={16}/></button>
                                    <button onClick={() => handleDeleteProduct(p?.id)} className="p-3 text-rose-600 bg-zinc-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition"><Trash size={16}/></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="sticky bottom-0 bg-white pt-4 pb-8">
                              <button onClick={() => onEdit({name: ""})} className="w-full py-5 bg-amber-600 text-white font-black rounded-3xl hover:bg-amber-500 transition shadow-xl uppercase text-xs tracking-widest">+ Adicionar Produto</button>
                            </div>
                        </div>
                      )}

                      {activeTab === "settings" && (
                        <div className="p-4 sm:p-8 space-y-8">
                          {!settingsData ? (
                            <div className="p-12 text-center text-zinc-400 font-bold">Carregando configurações...</div>
                          ) : (
                            <div className="space-y-8">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="col-span-1 sm:col-span-2 space-y-4">
                                  <h4 className="font-black text-sm uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2 flex items-center gap-2"><User size={16} /> Identidade e Contato</h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-[10px] font-black uppercase text-zinc-500 mb-1 block">Nome Curto</label>
                                      <input value={settingsData.name || ""} onChange={e => setSettingsData(prev => ({...prev, name: e.target.value}))} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-black uppercase text-zinc-500 mb-1 block">Nome Completo</label>
                                      <input value={settingsData.fullName || ""} onChange={e => setSettingsData(prev => ({...prev, fullName: e.target.value}))} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-black uppercase text-zinc-500 mb-1 block">WhatsApp (Números)</label>
                                      <input value={settingsData.whatsapp || ""} onChange={e => setSettingsData(prev => ({...prev, whatsapp: e.target.value}))} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500" placeholder="55..." />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-black uppercase text-zinc-500 mb-1 block">Exibição WhatsApp</label>
                                      <input value={settingsData.whatsappDisplay || ""} onChange={e => setSettingsData(prev => ({...prev, whatsappDisplay: e.target.value}))} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500" placeholder="(83)..." />
                                    </div>
                                  </div>
                                </div>

                                <div className="col-span-1 sm:col-span-2 space-y-4">
                                  <h4 className="font-black text-sm uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2 flex items-center gap-2"><Eye size={16} /> Conteúdo do Site</h4>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-[10px] font-black uppercase text-zinc-500 mb-1 block">Título Principal (Banner)</label>
                                      <input value={settingsData.heroTitle || ""} onChange={e => setSettingsData(prev => ({...prev, heroTitle: e.target.value}))} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-black uppercase text-zinc-500 mb-1 block">Subtítulo (Banner)</label>
                                      <textarea value={settingsData.heroSubtitle || ""} onChange={e => setSettingsData(prev => ({...prev, heroSubtitle: e.target.value}))} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none h-24 focus:border-amber-500" />
                                    </div>
                                  </div>
                                </div>

                                <div className="col-span-1 sm:col-span-2 space-y-4">
                                  <h4 className="font-black text-sm uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2 flex items-center gap-2"><MapPin size={16} /> Endereço e Horários</h4>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-[10px] font-black uppercase text-zinc-500 mb-1 block">Logradouro Completo</label>
                                      <input value={settingsData.address || ""} onChange={e => setSettingsData(prev => ({...prev, address: e.target.value}))} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-[10px] font-black uppercase text-zinc-500 mb-1 block">Horário de Funcionamento</label>
                                        <input value={settingsData.hours || ""} onChange={e => setSettingsData(prev => ({...prev, hours: e.target.value}))} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500" />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-black uppercase text-zinc-500 mb-1 block">Copyright (Footer)</label>
                                        <input value={settingsData.cityYear || ""} onChange={e => setSettingsData(prev => ({...prev, cityYear: e.target.value}))} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-amber-500" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <button 
                                onClick={() => onUpdateSettings(settingsData)}
                                className="sticky bottom-0 w-full py-5 bg-emerald-600 text-white font-black rounded-3xl hover:bg-emerald-500 transition shadow-xl uppercase text-xs tracking-widest flex items-center justify-center gap-3 mt-8"
                              >
                                <Save size={18} /> {uploading ? "Salvando..." : "Salvar Configurações"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedImage(null)} className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer" />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.9, opacity: 0 }} 
            className="relative rounded-3xl overflow-hidden max-w-4xl max-h-[90vh] w-full z-10 flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="flex justify-end p-4 absolute top-0 right-0 z-20 pointer-events-auto">
              <button onClick={() => setSelectedImage(null)} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition shadow-lg text-white"><X size={24} /></button>
            </div>
            <img src={selectedImage} className="max-w-full max-h-[90vh] object-contain pointer-events-auto rounded-3xl" alt="Zoom" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const toggle = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", toggle);
    return () => window.removeEventListener("scroll", toggle);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 bg-white text-amber-600 p-4 rounded-2xl shadow-2xl border border-amber-100 z-40 hover:bg-amber-600 hover:text-white transition-all duration-300"
        >
          <ArrowUp className="w-6 h-6" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// Error Boundary Component
export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  state = { hasError: false };
  props: {children: React.ReactNode};
  
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.props = props;
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("Error Boundary caught:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-black text-rose-800 uppercase tracking-tight mb-2">Ops! Algo deu errado.</h2>
          <p className="text-zinc-500 text-sm max-w-xs mb-6">Encontramos um erro inesperado nesta seção. Tente recarregar a página.</p>
          <button onClick={() => window.location.reload()} className="px-8 py-3 bg-rose-600 text-white font-black rounded-xl uppercase text-[10px] tracking-widest hover:bg-rose-700 transition shadow-lg shadow-rose-200">Recarregar App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// User-friendly error messages
const getUserFriendlyErrorMessage = (error: any) => {
  let message = "Ocorreu um erro inesperado.";
  try {
    const errObj = typeof error.message === 'string' ? JSON.parse(error.message) : { error: String(error) };
    const errCode = errObj.error.toLowerCase();
    
    if (errCode.includes("permission-denied")) {
      message = "Você não tem permissão para realizar esta ação.";
    } else if (errCode.includes("unavailable")) {
      message = "O serviço está temporariamente indisponível. Tente novamente mais tarde.";
    } else if (errCode.includes("quota-exceeded")) {
      message = "Lamentamos, mas atingimos o limite de uso diário. Tente novamente amanhã.";
    }
  } catch (e) {
    // Falls back to generic message
  }
  return message;
};

// --- App Principal ---
export default function App() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favorites");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "store"), (docSnap) => {
      if (docSnap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() });
      }
    }, (err) => {
      console.error("Settings fetch failed", err);
    });
    return unsub;
  }, []);

  const updateSettings = async (newSettings) => {
    try {
      if (!newSettings) throw new Error("Configurações inválidas.");
      
      const clean = {};
      Object.keys(newSettings).forEach(k => {
        const val = newSettings[k];
        if (val !== undefined && val !== null) {
          clean[k] = val;
        } else {
          clean[k] = DEFAULT_SETTINGS[k] || ""; 
        }
      });
      
      const storeRef = doc(db, "settings", "store");
      await setDoc(storeRef, clean);
      toast.success("Configurações atualizadas!");
    } catch (err) {
      console.error("Update settings error:", err);
      handleFirestoreError(err, "update", "settings" as any);
    }
  };

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (selectedProduct) setCurrentImageIndex(0);
  }, [selectedProduct]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);

  // Sync Auth and Admin Status
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const adminRef = doc(db, "admins", u.uid);
        const adminDoc = await getDoc(adminRef);
        
        // Bootstrap admin for authorized emails
        const authorizedEmails = ["ajrpropecto.ang@gmail.com", "geovanymarcelino25@gmail.com"];
        const isAdminEmail = u.email && authorizedEmails.includes(u.email);

        if (isAdminEmail && !adminDoc.exists()) {
          try {
            await setDoc(adminRef, { 
              email: u.email,
              role: "admin",
              createdAt: new Date().toISOString()
            });
            setIsAdmin(true);
            toast.success("Perfil de Administrador Ativado!");
          } catch (e) {
            console.error("Admin bootstrap error:", e);
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(adminDoc.exists());
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsub();
  }, []);

  // Fetch Products from Firestore
  useEffect(() => {
    const q = collection(db, "products");
    const unsub = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as any;
      setProducts(prods);
      setIsLoading(false);
    }, (err) => {
      setIsLoading(false);
      handleFirestoreError(err, "list", "products" as any);
    });
    return () => unsub();
  }, []);

  const filteredProducts = useMemo(() => {
    return (products || []).filter(p => {
      if (!p) return false;
      const matchCat = selectedCategory === "all" || p.category === selectedCategory;
      const safeName = (p.name || "").toLowerCase();
      const safeBrand = (p.brand || "").toLowerCase();
      const search = (searchQuery || "").toLowerCase();
      const matchSearch = safeName.includes(search) || safeBrand.includes(search);
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery, products]);

  const addToCart = (product, quantity = 1) => {
    if (!product || !product.id) return;
    const currentItem = cart.find(i => i.id === product.id);
    const existingQuantity = currentItem ? currentItem.quantity : 0;
    const stock = Number(product.stock || 0);
    
    if ((existingQuantity + quantity) > stock) {
        toast.error(`Quantidade indisponível! Estoque atual: ${stock}`);
        return;
    }

    setCart(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? {...i, quantity: i.quantity + quantity} : i);
      return [...prev, { ...product, quantity }];
    });
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
    toast.error("Removido do carrinho");
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  const finalTotal = Math.max(0, cartTotal);

  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-amber-200 scroll-smooth">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl shadow-amber-200 rotate-3 flex-shrink-0">
              <span className="text-white font-black text-xl sm:text-2xl italic">A</span>
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="font-black text-sm xs:text-base sm:text-lg md:text-xl tracking-tighter text-zinc-800 uppercase leading-none underline decoration-amber-500 decoration-4 underline-offset-4">
                {settings.name}
              </h1>
              <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1.5 leading-tight max-w-[140px] sm:max-w-none">
                {settings.fullName}
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[11px] font-black text-zinc-500 uppercase tracking-widest">
            <a href="#" className="text-amber-600">Início</a>
            <a href="#products" className="hover:text-amber-600 transition">Catálogo</a>
            <a href="#contact" className="hover:text-amber-600 transition">Contato</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {isAdmin && (
              <button 
                onClick={() => setIsAdminPanelOpen(true)}
                className="p-3 bg-amber-100 text-amber-600 rounded-2xl hover:bg-amber-600 hover:text-white transition-all shadow-lg shadow-amber-100"
                title="Painel Administrativo"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            
            {!user ? (
              <button 
                onClick={login}
                className="p-3 bg-zinc-100 text-zinc-600 rounded-2xl hover:bg-zinc-900 hover:text-white transition-all"
                title="Entrar"
              >
                <LogIn className="w-5 h-5" />
              </button>
            ) : (
              <button 
                onClick={logout}
                className="p-3 bg-zinc-100 text-zinc-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}

            <button 
              onClick={() => setIsCartOpen(true)}
              className="group relative p-3 bg-zinc-100 hover:bg-amber-600 rounded-2xl transition-all duration-500"
            >
              <ShoppingCart className="w-5 h-5 text-zinc-600 group-hover:text-white" />
              {cart.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
                <motion.span
                  key={cart.reduce((sum, item) => sum + item.quantity, 0)}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="absolute -top-2 -right-2 bg-amber-600 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-4 border-white"
                >
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </motion.span>
              )}
            </button>
            <button className="md:hidden p-2 text-zinc-600 hover:text-amber-600 transition" onClick={() => setIsMenuOpen(true)}>
              <Menu />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Navigation */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsMenuOpen(false)} 
              className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[150]" 
            />
            <motion.div 
              initial={{ x: "-100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "-100%" }} 
              className="fixed left-0 top-0 h-full w-[85vw] max-w-[320px] bg-white z-[160] shadow-2xl flex flex-col p-6 sm:p-8"
            >
              <div className="flex items-center justify-between mb-8 sm:mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center text-white font-black italic">A</div>
                  <div className="flex flex-col">
                    <span className="font-black text-sm tracking-tighter uppercase leading-tight">{settings.name}</span>
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{settings.fullName}</span>
                  </div>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 sm:p-3 bg-zinc-50 hover:bg-zinc-100 rounded-xl transition"><X className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-600" /></button>
              </div>
              <nav className="flex flex-col gap-2 sm:gap-6 text-sm font-black text-zinc-500 uppercase tracking-widest">
                <a href="#" onClick={() => setIsMenuOpen(false)} className="p-3 sm:p-0 rounded-lg hover:bg-zinc-50 sm:hover:bg-transparent text-amber-600 transition">Início</a>
                <a href="#products" onClick={() => setIsMenuOpen(false)} className="p-3 sm:p-0 rounded-lg hover:bg-zinc-50 sm:hover:bg-transparent hover:text-amber-600 transition">Catálogo</a>
                <a href="#contact" onClick={() => setIsMenuOpen(false)} className="p-3 sm:p-0 rounded-lg hover:bg-zinc-50 sm:hover:bg-transparent hover:text-amber-600 transition">Contato</a>
                {isAdmin && (
                  <button onClick={() => { setIsMenuOpen(false); setIsAdminPanelOpen(true); }} className="text-left p-3 sm:p-0 rounded-lg hover:bg-zinc-50 sm:hover:bg-transparent hover:text-amber-600 transition flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Painel Admin
                  </button>
                )}
              </nav>
              <div className="mt-auto pt-8 border-t border-zinc-100 flex flex-col gap-4">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest px-3 sm:px-0">Fale Conosco</p>
                <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 font-bold text-zinc-800 text-sm px-3 sm:px-0 p-3 sm:p-0 rounded-lg hover:bg-zinc-50 sm:hover:bg-transparent transition">
                  <MessageCircle className="w-4 h-4 text-emerald-500" /> WhatsApp
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 overflow-hidden bg-zinc-900 border-b border-white/5">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-amber-600/20 to-transparent blur-3xl rounded-full translate-x-1/2" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Badge color="amber">Selo Matcon Prime</Badge>
                <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white mt-6 mb-8 tracking-tighter leading-[0.95]">
                  Sua obra <span className="text-amber-500 underline decoration-amber-600/30">Prime</span> começa aqui.
                </h2>
                <p className="text-zinc-400 text-base md:text-lg mb-10 md:mb-12 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  A experiência definitiva em materiais de alta performance. Oferecemos logística ágil, marcas premium e assessoria técnica especializada.
                </p>
                <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 sm:gap-4 w-full">
                  <a href="#products" className="w-full sm:w-auto justify-center px-6 sm:px-10 py-4 sm:py-5 bg-amber-600 text-white font-black rounded-2xl hover:bg-amber-500 transition shadow-2xl shadow-amber-900/40 flex items-center gap-3 uppercase text-xs sm:text-sm tracking-widest">
                    Ver Catálogo <ChevronRight className="w-5 h-5" />
                  </a>
                  <a href="#services" className="w-full sm:w-auto justify-center px-6 sm:px-10 py-4 sm:py-5 bg-white/5 text-white font-black rounded-2xl hover:bg-white/10 border border-white/10 transition backdrop-blur-md flex items-center gap-3 uppercase text-xs sm:text-sm tracking-widest">
                    <HardHat className="w-5 h-5 text-amber-500" /> Serviços de Eng.
                  </a>
                </div>
              </motion.div>
            </div>
            
            <div className="flex-1 relative hidden lg:block">
              <div className="relative w-full aspect-square bg-zinc-800 rounded-[60px] overflow-hidden border border-white/5 shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800" 
                  alt="Construção" 
                  className="w-full h-full object-cover opacity-60 mix-blend-overlay"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ofertas em Destaque */}
      {products.some(p => p.oldPrice) && (
        <section className="pt-20 pb-8 bg-zinc-50/50">
          <div className="max-w-7xl mx-auto px-4">
             <div className="flex items-center gap-4 mb-12">
               <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 rotate-3">
                 <Zap className="text-white w-6 h-6" />
               </div>
               <div>
                 <h4 className="text-3xl font-black tracking-tighter uppercase leading-none">Ofertas Relâmpago</h4>
                 <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Preços exclusivos por tempo limitado</p>
               </div>
             </div>
             <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
               {products.filter(p => p.oldPrice).map(product => (
                 <motion.div 
                    key={product.id}
                    whileHover={{ y: -2 }}
                    className="group bg-white rounded-sm border border-transparent hover:border-[#ee4d2d] shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300 overflow-hidden relative cursor-pointer min-w-[200px]"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
                      <img src={product.image} className="w-full h-full object-cover transition duration-300" alt={product.name} loading="lazy" decoding="async" />
                      
                      {product.oldPrice && (
                        <div className="absolute top-0 right-0 bg-yellow-400/90 text-[#ee4d2d] flex flex-col items-center justify-center px-1.5 py-1 z-10 w-10">
                          <span className="text-[10px] font-bold leading-none">{Math.round((1 - product.price/product.oldPrice) * 100)}%</span>
                          <span className="text-[9px] font-bold uppercase leading-none mt-0.5 text-white">OFF</span>
                          <div className="absolute -bottom-1 left-0 border-l-[20px] border-l-transparent border-t-[4px] border-t-yellow-400/90 border-r-[20px] border-r-transparent"></div>
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 w-full h-1/5 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>

                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 flex items-center justify-center z-20">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
                          className="px-4 py-2 bg-[#ee4d2d] text-white rounded-sm font-medium text-[11px] uppercase tracking-wider flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-auto shadow-xl"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye w-3.5 h-3.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                          Visão Rápida
                        </button>
                      </div>
                    </div>
                    <div className="p-2 sm:p-2.5 flex flex-col h-[115px]">
                      <h5 className="text-sm text-zinc-800 line-clamp-2 leading-tight mb-2 min-h-[40px] group-hover:text-[#ee4d2d] transition-colors font-medium">{product.name || ""}</h5>
                      <div className="mt-auto">
                        <div className="flex items-baseline gap-1 break-all mb-0.5">
                          <span className="text-xs text-[#ee4d2d]">R$</span>
                          <span className="text-lg font-medium text-[#ee4d2d] leading-none">
                            {Number(product.price || 0).toFixed(2)}
                          </span>
                        </div>
                        {product.oldPrice && (
                          <span className="text-[11px] text-zinc-400 line-through mb-1 truncate block">R$ {Number(product.oldPrice || 0).toFixed(2)}</span>
                        )}
                        <div className="w-full bg-zinc-200 rounded-full h-[6px] mt-2 overflow-hidden relative">
                           <div className="absolute top-0 left-0 h-full bg-[#ee4d2d] w-[75%]"></div>
                        </div>
                        <p className="text-[9px] text-[#ee4d2d] font-bold mt-1 uppercase text-center tracking-tight">Esgotando rápido</p>
                      </div>
                    </div>
                  </motion.div>
               ))}
             </div>
          </div>
        </section>
      )}

      {/* Produtos */}
      <section id="products" className="pt-12 pb-24 max-w-7xl mx-auto px-4">
        <div className="sticky top-[80px] bg-zinc-50 z-40 py-4 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-6">
            <div className="max-w-md">
              <Badge>Catálogo Especializado</Badge>
              <h3 className="text-4xl font-black text-zinc-900 mt-4 tracking-tighter uppercase leading-none">Materiais de Ponta</h3>
              <p className="text-zinc-500 mt-4 leading-relaxed">Selecione os melhores insumos para cada etapa da sua construção.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="relative group flex-1 sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 group-focus-within:text-amber-600 transition" />
                <input 
                  type="text" 
                  placeholder="Buscar produto..."
                  className="pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-amber-100 focus:border-amber-500 outline-none w-full transition-all shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${
                  selectedCategory === cat.id 
                  ? "bg-amber-600 text-white shadow-xl shadow-amber-200 -translate-y-1" 
                  : "bg-white text-zinc-500 border border-zinc-200 hover:border-amber-300"
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            [1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-[32px] border border-zinc-200 aspect-[4/5] animate-pulse p-6">
                <div className="w-full aspect-video bg-zinc-100 rounded-2xl mb-6"></div>
                <div className="h-4 bg-zinc-100 w-1/3 rounded-full mb-4"></div>
                <div className="h-6 bg-zinc-100 w-2/3 rounded-full mb-8"></div>
                <div className="h-10 bg-zinc-100 w-full rounded-2xl"></div>
              </div>
            ))
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredProducts.map(product => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={product.id}
                className="group bg-white rounded-sm border border-transparent hover:border-[#ee4d2d] shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 overflow-hidden relative cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition duration-300" 
                    loading="lazy"
                    decoding="async"
                  />
                  
                  {product.oldPrice && (
                    <div className="absolute top-0 right-0 bg-yellow-400/90 text-[#ee4d2d] flex flex-col items-center justify-center px-1.5 py-1 z-10 w-10">
                      <span className="text-[10px] font-bold leading-none">{Math.round((1 - product.price/product.oldPrice) * 100)}%</span>
                      <span className="text-[9px] font-bold uppercase leading-none mt-0.5 text-white">OFF</span>
                      <div className="absolute -bottom-1 left-0 border-l-[20px] border-l-transparent border-t-[4px] border-t-yellow-400/90 border-r-[20px] border-r-transparent"></div>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 w-full h-1/5 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>

                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 flex items-center justify-center z-20">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
                      className="px-4 py-2 bg-[#ee4d2d] text-white rounded-sm font-medium text-[11px] uppercase tracking-wider flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Visão Rápida
                    </button>
                  </div>
                </div>

                <div className="p-2 sm:p-2.5 flex flex-col h-auto">
                  <h4 className="text-sm text-zinc-800 line-clamp-2 leading-tight mb-2 min-h-[40px] group-hover:text-[#ee4d2d] transition-colors font-medium">
                    {product.name || ""}
                  </h4>
                  
                  <div className="mt-auto">
                    <div className="flex items-center gap-1 mb-1.5">
                      <div className="text-[9px] text-[#ee4d2d] border border-[#ee4d2d] px-1 py-0.5 rounded-sm bg-[#ffefe8] uppercase font-bold tracking-tight">
                        Ad
                      </div>
                      {product.brand && (
                        <div className="text-[9px] text-zinc-500 border border-zinc-300 px-1 py-0.5 rounded-sm">
                          {product.brand}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-baseline gap-1 break-all">
                        <span className="text-xs text-[#ee4d2d]">R$</span>
                        <span className="text-lg font-medium text-[#ee4d2d] leading-none">
                          {Number(product.price || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    {product.oldPrice && (
                      <p className="text-[11px] text-zinc-400 line-through mb-1 truncate">
                        R$ {Number(product.oldPrice || 0).toFixed(2)}
                      </p>
                    )}

                    {!product.oldPrice && <div className="h-[16.5px] mb-1"></div>}

                    <div className="flex items-center gap-1">
                      <div className="flex items-center text-yellow-400">
                        <Star className="w-2.5 h-2.5 fill-current" />
                      </div>
                      <span className="text-[10px] text-zinc-500 tabular-nums">{product.rating}</span>
                      <div className="w-px h-2.5 bg-zinc-300 mx-1"></div>
                      <span className="text-[10px] text-zinc-500">115 vendidos</span>
                    </div>

                    <p className={`text-[9px] font-bold mt-2 ${(!product.stock || product.stock === 0) ? 'text-rose-500' : 'text-zinc-400'}`}>
                      {(!product.stock || product.stock === 0) ? "Esgotado" : `Campina Grande`}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          )}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-zinc-300">
            <p className="text-zinc-400 font-bold uppercase tracking-widest">Nenhum produto encontrado</p>
            <button onClick={() => {setSearchQuery(""); setSelectedCategory("all")}} className="mt-4 text-amber-600 font-black uppercase text-xs tracking-widest underline underline-offset-8">Limpar Filtros</button>
          </div>
        )}
      </section>

      {/* Serviços de Engenharia */}
      <section id="services" className="py-20 md:py-24 bg-zinc-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 sm:gap-20 items-center">
            <div>
              <Badge color="amber">Engenharia Integrada</Badge>
              <h3 className="text-3xl sm:text-4xl md:text-6xl font-black mt-6 mb-8 tracking-tighter leading-tight md:leading-none">
                Assessoria Técnica <br className="hidden sm:block" /> <span className="text-amber-500">do Alinhamento ao Piso.</span>
              </h3>
              <p className="text-zinc-400 mb-10 md:mb-12 text-base md:text-lg leading-relaxed">
                Não vendemos apenas materiais. Nossa equipe de engenharia oferece suporte total para o seu projeto, garantindo economia e segurança.
              </p>
              <ul className="grid sm:grid-cols-1 md:grid-cols-1 gap-6 mb-12">
                {[
                  { icon: <Construction />, t: "Projetos Estruturais", d: "Cálculos precisos para fundações e lajes." },
                  { icon: <HardHat />, t: "Acompanhamento de Obra", d: "Visitas técnicas para garantir a qualidade." },
                  { icon: <Zap />, t: "Eficiência Elétrica", d: "Planejamento para baixo consumo e segurança." }
                ].map((item, i) => (
                  <li key={i} className="flex gap-4 items-start bg-white/5 p-4 rounded-3xl border border-white/5">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-amber-500 shrink-0">{item.icon}</div>
                    <div>
                      <h5 className="font-bold text-white mb-1">{item.t}</h5>
                      <p className="text-xs sm:text-sm text-zinc-400 leading-snug">{item.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="w-full sm:w-auto px-10 py-5 bg-amber-600 text-white font-black rounded-2xl hover:bg-amber-500 transition shadow-2xl shadow-amber-900/40 uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">
                <MessageCircle className="w-5 h-5" /> Agendar Consultoria
              </button>
            </div>
            <div className="relative mt-20 lg:mt-0">
               <div className="relative w-full aspect-square bg-zinc-800 rounded-[50px] overflow-hidden border border-white/5 shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800" 
                  alt="Engenharia" 
                  className="w-full h-full object-cover opacity-40 mix-blend-overlay"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="absolute -bottom-10 -left-4 sm:-left-10 bg-white p-6 sm:p-8 rounded-[30px] sm:rounded-[40px] shadow-2xl max-w-xs scale-90 sm:scale-100 border border-zinc-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-600 rounded-full flex items-center justify-center text-white font-black italic">A</div>
                  <div>
                    <h6 className="font-bold text-zinc-900 text-sm sm:text-base">Eng. Júnior</h6>
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">RT Responsável</p>
                  </div>
                </div>
                <p className="text-zinc-500 text-[11px] sm:text-xs italic leading-relaxed">"Garantimos que cada quilo de cimento e cada tijolo seja aplicado com a máxima eficiência técnica."</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="py-12 bg-zinc-50 border-t border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { icon: <Shield className="text-amber-600" />, title: "Compra Segura", desc: "Marcas Originais" },
            { icon: <CreditCard className="text-amber-600" />, title: "Facilidade", desc: "Até 12x no cartão" },
            { icon: <MessageCircle className="text-amber-600" />, title: "Suporte Técnico", desc: "Tire suas dúvidas" }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 justify-center sm:justify-start">
              <div className="p-3 bg-white border border-zinc-100 rounded-2xl shadow-sm">{item.icon}</div>
              <div>
                <h5 className="font-black text-sm text-zinc-800 leading-tight">{item.title}</h5>
                <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-tight">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-white border-t border-zinc-200 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
                  <span className="text-white font-black italic text-xl">A</span>
                </div>
                <div>
                  <h4 className="text-lg font-black tracking-tighter uppercase leading-none">{settings.name}</h4>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{settings.fullName}</p>
                </div>
              </div>
              <p className="text-zinc-500 max-w-sm mb-10 leading-relaxed text-sm">
                Referência em Campina Grande e região para quem busca qualidade, atendimento técnico e os melhores preços em materiais de construção e engenharia.
              </p>
              <div className="flex gap-4">
                {[Facebook, Instagram, Youtube].map((Icon, i) => (
                  <a key={i} href="#" className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all duration-300">
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
            
            <div>
              <h5 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-900 mb-8 underline decoration-amber-500 decoration-2 underline-offset-4">Contato</h5>
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <Phone className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-sm font-bold text-zinc-600">{settings.whatsappDisplay}</div>
                </li>
                <li className="flex items-start gap-4">
                  <Mail className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-sm font-bold text-zinc-600">{settings.email}</div>
                </li>
                <li className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-sm font-bold text-zinc-600 leading-relaxed">{settings.address}</div>
                </li>
                <li className="flex items-start gap-4">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-sm font-bold text-zinc-600 leading-relaxed">{settings.hours}</div>
                </li>
              </ul>
            </div>

            <div>
              <h5 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-900 mb-8 underline decoration-amber-500 decoration-2 underline-offset-4">Links Rápidos</h5>
              <ul className="space-y-4">
                {['Sobre Nós', 'Nossos Serviços', 'Termos de Uso', 'Privacidade'].map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-sm font-bold text-zinc-500 hover:text-amber-600 transition">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="border-t border-zinc-100 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">
              © {settings.cityYear}. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Desenvolvido por</span>
              <div className="px-3 py-1 bg-zinc-900 text-white text-[10px] font-black rounded-lg italic">MG informática</div>
            </div>
          </div>
        </div>
      </footer>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsCartOpen(false)} 
              className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[110]" 
            />
            <motion.div 
              initial={{ x: "100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "100%" }} 
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[120] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3 leading-none">
                    <ShoppingCart className="w-6 h-6 text-amber-600" /> Carrinho
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">{cart.length} ITENS SELECIONADOS</p>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-3 hover:bg-zinc-100 rounded-2xl transition"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ShoppingCart className="w-10 h-10 text-zinc-200" />
                    </div>
                    <p className="text-zinc-400 font-bold uppercase text-xs tracking-widest">Seu carrinho está vazio</p>
                    <button onClick={() => setIsCartOpen(false)} className="mt-6 text-amber-600 font-black text-xs uppercase tracking-widest underline underline-offset-8 transition-all hover:text-amber-500">Explorar Catálogo</button>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="flex gap-6 group">
                      <div className="w-24 h-24 bg-zinc-100 rounded-3xl overflow-hidden shrink-0 border border-zinc-100">
                        <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt="" loading="lazy" decoding="async" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-black text-sm text-zinc-800 leading-tight uppercase tracking-tight line-clamp-1">{item.name}</h4>
                            <button 
                              onClick={() => removeFromCart(item.id)} 
                              className="text-zinc-300 hover:text-rose-500 transition shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1">{item.brand}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="font-black text-zinc-900 text-base leading-none">R$ {(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</p>
                          <div className="flex items-center gap-3 bg-zinc-100 px-3 py-1.5 rounded-xl scale-90">
                            <button 
                              onClick={() => {
                                const newQty = Math.max(1, item.quantity - 1);
                                setCart(prev => prev.map(i => i.id === item.id ? {...i, quantity: newQty} : i));
                              }} 
                              className="text-zinc-400 hover:text-amber-600 transition"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black w-4 text-center leading-none">{item.quantity}</span>
                            <button 
                              onClick={() => {
                                const newQty = item.quantity + 1;
                                const stockAvailable = Number(item.stock || 0);
                                if (newQty > stockAvailable) {
                                  toast.error(`Quantidade indisponível! Estoque atual: ${stockAvailable}`);
                                  return;
                                }
                                setCart(prev => prev.map(i => i.id === item.id ? {...i, quantity: newQty} : i));
                              }} 
                              className="text-zinc-400 hover:text-amber-600 transition"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-8 bg-zinc-50 border-t border-zinc-200">
                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-center group">
                      <span className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest">Subtotal</span>
                      <span className="font-black text-zinc-800 text-base">R$ {Number(cartTotal || 0).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-zinc-200">
                      <span className="text-xl font-black text-zinc-900 uppercase tracking-tighter leading-none">Total</span>
                      <span className="text-3xl font-black text-amber-600 tracking-tighter leading-none">R$ {Number(finalTotal || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const msg = `*Novo Pedido ${settings?.name || "Loja"}* 🚀\n\n*Itens do Pedido:*\n${cart.map(i => `• ${i.quantity}x ${i.name} - R$ ${(Number(i.price || 0) * Number(i.quantity || 1)).toFixed(2)}`).join("\n")}\n\n*Total final: R$ ${Number(finalTotal || 0).toFixed(2)}*\n\nPor favor, informe a forma de pagamento!`;
                      window.open(`https://wa.me/${settings?.whatsapp || ""}?text=${encodeURIComponent(msg)}`);
                    }}
                    className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-3xl transition shadow-2xl shadow-emerald-200 flex items-center justify-center gap-4 uppercase tracking-[0.15em] text-xs"
                  >
                    <MessageCircle className="w-6 h-6" /> Finalizar no WhatsApp
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal do Produto */}
      <AnimatePresence>
        {selectedProduct && (
          // ... (existing modal code remains same, but maybe add edit button if admin)
          <div className="fixed inset-0 z-[150] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedProduct(null)} 
              className="fixed inset-0 bg-zinc-900/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white w-full max-w-5xl rounded-sm shadow-md overflow-hidden grid md:grid-cols-[40%_60%] max-h-[90vh] overflow-y-auto md:overflow-hidden"
            >
              <div className="absolute top-4 right-4 flex gap-2 z-10">
                {isAdmin && (
                  <button 
                    onClick={() => {
                      const p = selectedProduct;
                      setSelectedProduct(null);
                      setEditingProduct(p);
                      setIsAdminPanelOpen(true);
                    }} 
                    className="p-2 sm:p-3 bg-zinc-100 hover:bg-zinc-200 rounded-full transition"
                  >
                    <Edit className="w-4 h-4 text-zinc-600" />
                  </button>
                )}
                <button 
                  onClick={() => setSelectedProduct(null)} 
                  className="p-2 sm:p-3 bg-zinc-100 hover:bg-zinc-200 rounded-full transition"
                >
                  <X className="w-4 h-4 text-zinc-600" />
                </button>
              </div>
              
              <div className="bg-white flex flex-col p-4 sm:p-6 relative overflow-hidden">
                <div className="flex-1 flex items-center justify-center w-full border border-zinc-100 p-2 relative aspect-square">
                  <img 
                    src={(selectedProduct.images && selectedProduct.images.length > 0 && selectedProduct.images[currentImageIndex]) ? selectedProduct.images[currentImageIndex] : selectedProduct.image || "https://via.placeholder.com/400"} 
                    className="absolute inset-0 w-full h-full object-contain p-2 transition-opacity duration-300" 
                    alt={selectedProduct.name} 
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                
                {selectedProduct.images && selectedProduct.images.length > 1 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar w-full">
                    {selectedProduct.images?.map((img, idx) => {
                      if (!img) return null;
                      return (
                      <button 
                        key={idx} 
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`relative w-16 h-16 shrink-0 border-2 bg-white transition-colors ${currentImageIndex === idx ? 'border-[#ee4d2d]' : 'border-transparent hover:border-[#ee4d2d]'}`}
                      >
                        <img src={img} className="w-full h-full object-cover" alt={`${selectedProduct.name} thumbnail ${idx}`} loading="lazy" decoding="async" />
                      </button>
                    )})}
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 flex flex-col justify-start md:overflow-y-auto h-full">
                <h2 className="text-xl sm:text-2xl font-medium text-zinc-900 mb-3 leading-tight">{selectedProduct.name}</h2>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center text-[#ee4d2d] underline decoration-[#ee4d2d]">
                    <span className="text-base font-medium mr-1">{selectedProduct.rating}</span>
                    <Star className="w-3.5 h-3.5 fill-[#ee4d2d]" />
                    <Star className="w-3.5 h-3.5 fill-[#ee4d2d]" />
                    <Star className="w-3.5 h-3.5 fill-[#ee4d2d]" />
                    <Star className="w-3.5 h-3.5 fill-[#ee4d2d]" />
                    <Star className="w-3.5 h-3.5 fill-[#ee4d2d]" />
                  </div>
                  <div className="w-px h-4 bg-zinc-300"></div>
                  <div className="flex items-center text-zinc-800">
                    <span className="text-base font-medium border-b border-zinc-800 mr-1">29</span> 
                    <span className="text-sm text-zinc-500">Avaliações</span>
                  </div>
                  <div className="w-px h-4 bg-zinc-300"></div>
                  <div className="flex items-center text-zinc-800">
                    <span className="text-base font-medium mr-1">115</span> 
                    <span className="text-sm text-zinc-500">vendidos</span>
                  </div>
                </div>

                <div className="bg-zinc-50 px-5 py-4 mb-6">
                  {selectedProduct.oldPrice && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-zinc-500 line-through">R$ {Number(selectedProduct.oldPrice || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <p className="text-3xl text-[#ee4d2d] font-medium leading-none">
                      R$ {Number(selectedProduct.price || 0).toFixed(2)}
                    </p>
                    {selectedProduct.oldPrice && (
                      <span className="bg-[#ee4d2d] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase">
                        {Math.round((1 - Number(selectedProduct.price || 0)/Number(selectedProduct.oldPrice || 1)) * 100)}% OFF
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 items-center mb-8">
                  <span className="text-sm text-zinc-500 w-24 shrink-0">Quantidade</span>
                  <div className="flex items-center border border-zinc-200 rounded-sm">
                    <button 
                      onClick={() => {
                        const el = document.getElementById('qty-input') as HTMLInputElement | null;
                        if (el) el.stepDown();
                      }}
                      className="px-3 py-1.5 hover:bg-zinc-50 transition text-zinc-500 border-r border-zinc-200"
                    >
                      <Minus size={14} />
                    </button>
                    <input 
                      id="qty-input"
                      type="number" 
                      min="1" 
                      max={Number(selectedProduct.stock || 0)}
                      defaultValue="1" 
                      className="w-12 text-center bg-transparent text-sm text-zinc-900 outline-none" 
                    />
                    <button 
                      onClick={() => {
                        const el = document.getElementById('qty-input') as HTMLInputElement | null;
                        if (el) {
                          const currentVal = parseInt(el.value);
                          const stockAvailable = Number(selectedProduct.stock || 0);
                          if (currentVal < stockAvailable) {
                            el.stepUp();
                          } else {
                            toast.error("Estoque máximo atingido");
                          }
                        }
                      }}
                      className="px-3 py-1.5 hover:bg-zinc-50 transition text-zinc-500 border-l border-zinc-200"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="text-sm text-zinc-500">{Number(selectedProduct.stock || 0)} peças disponíveis</span>
                </div>

                <div className="flex flex-row gap-4 mt-auto">
                  <button 
                    onClick={() => {
                      const qtyField = document.getElementById('qty-input') as HTMLInputElement | null;
                      const qty = parseInt(qtyField?.value || "1");
                      addToCart(selectedProduct, qty);
                    }}
                    disabled={Number(selectedProduct.stock || 0) <= 0}
                    className={`flex-1 py-3 px-4 rounded-sm transition flex items-center justify-center gap-2 text-sm ${
                      Number(selectedProduct.stock || 0) <= 0 
                        ? "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200" 
                        : "bg-[#ffefe8] border border-[#ee4d2d] text-[#ee4d2d] hover:bg-[#ffefe8]/80"
                    }`}
                  >
                    <ShoppingCart className="w-5 h-5" /> 
                    {(selectedProduct.stock ?? 0) <= 0 ? "Esgotado" : "Adicionar ao Carrinho"}
                  </button>
                  <button 
                    onClick={() => {
                      const qtyField = document.getElementById('qty-input') as HTMLInputElement | null;
                      const qty = parseInt(qtyField?.value || "1");
                      const subTotal = selectedProduct.price * qty;
                      
                      const finalPrice = subTotal;
                      
                      const msg = `*Novo Pedido ${settings.name}* \n\n*Itens do Pedido:*\n• ${qty}x ${selectedProduct.name} - R$ ${Number(subTotal || 0).toFixed(2)}\n\n*Total a pagar: R$ ${Number(finalPrice || 0).toFixed(2)}*\n\nPor favor, informe a forma de pagamento!`;
                      window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(msg)}`);
                    }}
                    disabled={(selectedProduct.stock ?? 0) <= 0}
                    className={`flex-1 py-3 px-4 rounded-sm transition flex items-center justify-center text-sm ${
                      (selectedProduct.stock ?? 0) <= 0
                        ? "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200"
                        : "bg-[#ee4d2d] text-white hover:bg-[#d73211]"
                    }`}
                  >
                    Comprar Agora
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ErrorBoundary>
        <AdminPanel 
          isOpen={isAdminPanelOpen} 
          onClose={() => {
            setIsAdminPanelOpen(false);
            setEditingProduct(null);
          }} 
          initialProduct={editingProduct}
          products={products}
          onEdit={setEditingProduct}
          settings={settings}
          onUpdateSettings={updateSettings}
        />
      </ErrorBoundary>

      <ScrollToTop />

      {/* Zap Flutuante */}
      <a
        href={`https://wa.me/${settings.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-emerald-500 text-white p-5 rounded-[24px] shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 group"
      >
        <MessageCircle className="w-8 h-8" />
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-zinc-900 px-5 py-3 rounded-2xl text-[10px] font-black shadow-2xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none border border-zinc-100">
          Como podemos ajudar? <span className="text-emerald-500">Fale Conosco</span>
        </span>
      </a>
    </div>
  );
}
