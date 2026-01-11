"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Search, X, GripVertical, Edit, Trash2, Monitor, CheckCircle } from 'lucide-react';
import { useSession } from './SessionContextProvider';
import { storageService } from '../../services/storageService';
import { showSuccess, showError } from '../utils/toast';
import { Counter, CounterStatus, StoreProfile } from '../../types';
import { Modal } from './ui/Modal';
import { debounce } from '../utils/debounce';

// DND Kit Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CounterManagerPageProps {
  storeProfile: StoreProfile;
}

// Componente para um item de balcão arrastável
interface SortableCounterItemProps {
  counter: Counter;
  storePrimaryColor: string;
  onEdit: (counter: Counter) => void;
  onDelete: (counterId: string) => void;
}

const SortableCounterItem: React.FC<SortableCounterItemProps> = ({
  counter,
  storePrimaryColor,
  onEdit,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: counter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  const getStatusClasses = (status: CounterStatus) => {
    switch (status) {
      case CounterStatus.AVAILABLE:
        return 'bg-green-100 text-green-700';
      case CounterStatus.OCCUPIED:
        return 'bg-red-100 text-red-700';
      case CounterStatus.CLOSED:
        return 'bg-gray-100 text-gray-700';
      case CounterStatus.CLEANING:
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-4 rounded-xl shadow-md border border-gray-100 flex items-center justify-between transition-all duration-200 group relative overflow-hidden hover:shadow-lg hover:translate-x-0.5"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
      <div className="flex items-center gap-3">
        <button
          className="p-1 text-gray-400 hover:text-gray-600 transform active:scale-90 cursor-grab"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex flex-col">
          <h3 className="font-bold text-gray-900 text-base">{counter.name}</h3>
          {counter.notes && (
            <p className="text-sm text-gray-600 flex items-center gap-1">
              {counter.notes}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClasses(counter.status)}`}>
          {counter.status}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(counter)}
            className="p-2 hover:bg-[#9f1239]/10 rounded-lg transform active:scale-95 shadow-sm"
            style={{ color: storePrimaryColor }}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(counter.id)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transform active:scale-95 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const CounterManagerPage: React.FC<CounterManagerPageProps> = ({ storeProfile }) => {
  const { supabase, session } = useSession();
  const userId = session?.user?.id;

  const [counters, setCounters] = useState<Counter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [currentCounter, setCurrentCounter] = useState<Partial<Counter> | null>(null);
  const [activeCounter, setActiveCounter] = useState<Counter | null>(null); // Para DragOverlay

  // Memoize the debounced saveCounters function
  const debouncedSaveCounters = React.useCallback(
    debounce(async (countersToSave: Counter[], currentUserId: string) => {
      if (currentUserId) {
        const savedCounters = await storageService.saveCounters(supabase, currentUserId, countersToSave);
        if (savedCounters) {
          setCounters(savedCounters); // Update state with the fresh list from DB
        }
      }
    }, 1000), // 1 second debounce delay
    [supabase] // Dependency array for useCallback
  );

  useEffect(() => {
    const loadCounters = async () => {
      if (userId) {
        const fetchedCounters = await storageService.getCounters(supabase, userId);
        setCounters(fetchedCounters);
      }
    };
    loadCounters();
  }, [userId, supabase]);

  const filteredCounters = counters.filter(counter =>
    counter.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCounter = () => {
    setCurrentCounter({ name: '', status: CounterStatus.AVAILABLE, notes: '' });
    setIsAddEditModalOpen(true);
  };

  const handleEditCounter = (counter: Counter) => {
    setCurrentCounter(counter);
    setIsAddEditModalOpen(true);
  };

  const handleSaveCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCounter?.name) {
      showError("Por favor, preencha o nome do balcão.");
      return;
    }
    if (!userId) return;

    let countersToUpdateState: Counter[];

    if (currentCounter.id) {
      // Edit existing counter
      countersToUpdateState = counters.map(c => c.id === currentCounter.id ? { ...c, ...currentCounter, user_id: userId } as Counter : c);
    } else {
      // Create new counter
      const newCounter: Counter = {
        id: Date.now().toString(), // Temporary client-side ID
        name: currentCounter.name,
        status: currentCounter.status || CounterStatus.AVAILABLE,
        notes: currentCounter.notes || '',
        user_id: userId,
        order_index: counters.length, // Assign a default order_index
      };
      countersToUpdateState = [...counters, newCounter];
    }

    const savedCounters = await storageService.saveCounters(supabase, userId, countersToUpdateState);
    if (savedCounters) {
      setCounters(savedCounters);
    }
    setIsAddEditModalOpen(false);
    setCurrentCounter(null);
  };

  const handleDeleteCounter = async (counterId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este balcão?")) {
      if (!userId) return;
      const updatedCounters = counters.filter(c => c.id !== counterId);
      // Re-index the remaining counters
      const reindexedCounters = updatedCounters.map((c, index) => ({ ...c, order_index: index }));
      setCounters(reindexedCounters);
      await storageService.saveCounters(supabase, userId, reindexedCounters);
    }
  };

  // DND Kit - handleDragEnd function for Counters
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && userId) {
      const oldIndex = counters.findIndex((item) => item.id === active.id);
      const newIndex = counters.findIndex((item) => item.id === over?.id);
      
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrderedCounters = arrayMove(counters, oldIndex, newIndex);
      
      // Update order_index for all counters in the new order
      const reindexedCounters = newOrderedCounters.map((counter, index) => ({
        ...counter,
        order_index: index,
      }));

      setCounters(reindexedCounters); // Update UI immediately

      // Save the new order to the database
      await storageService.saveCounters(supabase, userId, reindexedCounters);
    }
    setActiveCounter(null); // Limpar o balcão ativo após o arrasto
  };

  // DND Kit - handleDragStart function for Counters
  const handleDragStart = (event: any) => {
    const counter = counters.find(c => c.id === event.active.id);
    if (counter) {
      setActiveCounter(counter);
    }
  };

  // DND Kit - handleDragCancel function for Counters
  const handleDragCancel = () => {
    setActiveCounter(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Monitor className="drop-shadow-sm" style={{ color: storeProfile.primaryColor }} />
          Gerenciador de Balcões
        </h2>
        <button
          onClick={handleAddCounter}
          className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-xl transition-all transform active:scale-95 font-medium relative overflow-hidden"
        >
          <Plus className="w-4 h-4" /> NOVO BALCÃO
          <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Buscar balcões..."
          className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#9f1239]/20 shadow-md transition-all"
          style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {counters.length === 0 ? (
          <div className="text-center text-gray-500 p-8 bg-white rounded-xl shadow-xl border border-gray-100">
            Nenhum balcão cadastrado. Clique em "NOVO BALCÃO" para começar.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={filteredCounters.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredCounters.map(counter => (
                <SortableCounterItem
                  key={counter.id}
                  counter={counter}
                  storePrimaryColor={storeProfile.primaryColor}
                  onEdit={handleEditCounter}
                  onDelete={handleDeleteCounter}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeCounter ? (
                <div className="bg-white shadow-xl rounded-xl p-4 w-full opacity-90 flex items-center gap-3 border border-gray-200">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <span className="font-bold text-gray-900 text-base">{activeCounter.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Modal para Adicionar/Editar Balcão */}
      <Modal
        open={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
      >
        <h2 className="text-lg font-semibold mb-4 text-gray-900">
          {currentCounter?.id ? 'Editar Balcão' : 'Adicionar Novo Balcão'}
        </h2>
        <form onSubmit={handleSaveCounter} className="space-y-4">
          <div>
            <label htmlFor="counterName" className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Balcão <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="counterName"
              value={currentCounter?.name || ''}
              onChange={(e) => setCurrentCounter({ ...currentCounter, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] transition-all"
              style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
              placeholder="Ex: Balcão Principal, Caixa 1"
              required
            />
          </div>
          <div>
            <label htmlFor="counterStatus" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="counterStatus"
              value={currentCounter?.status || CounterStatus.AVAILABLE}
              onChange={(e) => setCurrentCounter({ ...currentCounter, status: e.target.value as CounterStatus })}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] transition-all"
              style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
            >
              {Object.values(CounterStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="counterNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Observações (Opcional)
            </label>
            <textarea
              id="counterNotes"
              value={currentCounter?.notes || ''}
              onChange={(e) => setCurrentCounter({ ...currentCounter, notes: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] transition-all resize-none"
              style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
              placeholder="Notas sobre o balcão, como localização ou preferências..."
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsAddEditModalOpen(false)}
              className="px-5 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-all transform active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 font-bold shadow-lg transition-all transform active:scale-95 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Salvar Balcão
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};