"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Search, X, GripVertical, Edit, Trash2, Users, CheckCircle, Clock } from 'lucide-react';
import { useSession } from './SessionContextProvider';
import { storageService } from '../../services/storageService';
import { showSuccess, showError } from '../utils/toast';
import { Table, TableStatus, StoreProfile } from '../../types';
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

interface TableManagerPageProps {
  storeProfile: StoreProfile;
}

// Componente para um item de mesa arrastável
interface SortableTableItemProps {
  table: Table;
  storePrimaryColor: string;
  onEdit: (table: Table) => void;
  onDelete: (tableId: string) => void;
}

const SortableTableItem: React.FC<SortableTableItemProps> = ({
  table,
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
  } = useSortable({ id: table.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  const getStatusClasses = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return 'bg-green-100 text-green-700';
      case TableStatus.OCCUPIED:
        return 'bg-red-100 text-red-700';
      case TableStatus.RESERVED:
        return 'bg-blue-100 text-blue-700';
      case TableStatus.CLEANING:
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
          <h3 className="font-bold text-gray-900 text-base">{table.name}</h3>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <Users className="w-3 h-3" /> Capacidade: {table.capacity}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClasses(table.status)}`}>
          {table.status}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(table)}
            className="p-2 hover:bg-[#9f1239]/10 rounded-lg transform active:scale-95 shadow-sm"
            style={{ color: storePrimaryColor }}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(table.id)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transform active:scale-95 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const TableManagerPage: React.FC<TableManagerPageProps> = ({ storeProfile }) => {
  const { supabase, session } = useSession();
  const userId = session?.user?.id;

  const [tables, setTables] = useState<Table[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [currentTable, setCurrentTable] = useState<Partial<Table> | null>(null);
  const [activeTable, setActiveTable] = useState<Table | null>(null); // Para DragOverlay

  // Memoize the debounced saveTables function
  const debouncedSaveTables = React.useCallback(
    debounce(async (tablesToSave: Table[], currentUserId: string) => {
      if (currentUserId) {
        const savedTables = await storageService.saveTables(supabase, currentUserId, tablesToSave);
        if (savedTables) {
          setTables(savedTables); // Update state with the fresh list from DB
        }
      }
    }, 1000), // 1 second debounce delay
    [supabase] // Dependency array for useCallback
  );

  useEffect(() => {
    const loadTables = async () => {
      if (userId) {
        const fetchedTables = await storageService.getTables(supabase, userId);
        setTables(fetchedTables);
      }
    };
    loadTables();
  }, [userId, supabase]);

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddTable = () => {
    setCurrentTable({ name: '', capacity: 1, status: TableStatus.AVAILABLE, notes: '' });
    setIsAddEditModalOpen(true);
  };

  const handleEditTable = (table: Table) => {
    setCurrentTable(table);
    setIsAddEditModalOpen(true);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTable?.name || !currentTable?.capacity || currentTable.capacity <= 0) {
      showError("Por favor, preencha o nome e uma capacidade válida para a mesa.");
      return;
    }
    if (!userId) return;

    let tablesToUpdateState: Table[];

    if (currentTable.id) {
      // Edit existing table
      tablesToUpdateState = tables.map(t => t.id === currentTable.id ? { ...t, ...currentTable, user_id: userId } as Table : t);
    } else {
      // Create new table
      const newTable: Table = {
        id: Date.now().toString(), // Temporary client-side ID
        name: currentTable.name,
        capacity: currentTable.capacity,
        status: currentTable.status || TableStatus.AVAILABLE,
        notes: currentTable.notes || '',
        user_id: userId,
        order_index: tables.length, // Assign a default order_index
      };
      tablesToUpdateState = [...tables, newTable];
    }

    const savedTables = await storageService.saveTables(supabase, userId, tablesToUpdateState);
    if (savedTables) {
      setTables(savedTables);
    }
    setIsAddEditModalOpen(false);
    setCurrentTable(null);
  };

  const handleDeleteTable = async (tableId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta mesa?")) {
      if (!userId) return;
      const updatedTables = tables.filter(t => t.id !== tableId);
      // Re-index the remaining tables
      const reindexedTables = updatedTables.map((t, index) => ({ ...t, order_index: index }));
      setTables(reindexedTables);
      await storageService.saveTables(supabase, userId, reindexedTables);
    }
  };

  // DND Kit - handleDragEnd function for Tables
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && userId) {
      const oldIndex = tables.findIndex((item) => item.id === active.id);
      const newIndex = tables.findIndex((item) => item.id === over?.id);
      
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrderedTables = arrayMove(tables, oldIndex, newIndex);
      
      // Update order_index for all tables in the new order
      const reindexedTables = newOrderedTables.map((table, index) => ({
        ...table,
        order_index: index,
      }));

      setTables(reindexedTables); // Update UI immediately

      // Save the new order to the database
      await storageService.saveTables(supabase, userId, reindexedTables);
    }
    setActiveTable(null); // Limpar a mesa ativa após o arrasto
  };

  // DND Kit - handleDragStart function for Tables
  const handleDragStart = (event: any) => {
    const table = tables.find(t => t.id === event.active.id);
    if (table) {
      setActiveTable(table);
    }
  };

  // DND Kit - handleDragCancel function for Tables
  const handleDragCancel = () => {
    setActiveTable(null);
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
          <Users className="drop-shadow-sm" style={{ color: storeProfile.primaryColor }} />
          Gerenciador de Mesas
        </h2>
        <button
          onClick={handleAddTable}
          className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-xl transition-all transform active:scale-95 font-medium relative overflow-hidden"
        >
          <Plus className="w-4 h-4" /> NOVA MESA
          <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Buscar mesas..."
          className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#9f1239]/20 shadow-md transition-all"
          style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {tables.length === 0 ? (
          <div className="text-center text-gray-500 p-8 bg-white rounded-xl shadow-xl border border-gray-100">
            Nenhuma mesa cadastrada. Clique em "NOVA MESA" para começar.
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
              items={filteredTables.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredTables.map(table => (
                <SortableTableItem
                  key={table.id}
                  table={table}
                  storePrimaryColor={storeProfile.primaryColor}
                  onEdit={handleEditTable}
                  onDelete={handleDeleteTable}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeTable ? (
                <div className="bg-white shadow-xl rounded-xl p-4 w-full opacity-90 flex items-center gap-3 border border-gray-200">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <span className="font-bold text-gray-900 text-base">{activeTable.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Modal para Adicionar/Editar Mesa */}
      <Modal
        open={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
      >
        <h2 className="text-lg font-semibold mb-4 text-gray-900">
          {currentTable?.id ? 'Editar Mesa' : 'Adicionar Nova Mesa'}
        </h2>
        <form onSubmit={handleSaveTable} className="space-y-4">
          <div>
            <label htmlFor="tableName" className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Mesa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="tableName"
              value={currentTable?.name || ''}
              onChange={(e) => setCurrentTable({ ...currentTable, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] transition-all"
              style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
              placeholder="Ex: Mesa 5, Balcão Principal"
              required
            />
          </div>
          <div>
            <label htmlFor="tableCapacity" className="block text-sm font-medium text-gray-700 mb-1">
              Capacidade <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="tableCapacity"
              value={currentTable?.capacity || 1}
              onChange={(e) => setCurrentTable({ ...currentTable, capacity: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] transition-all"
              style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
              min="1"
              required
            />
          </div>
          <div>
            <label htmlFor="tableStatus" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="tableStatus"
              value={currentTable?.status || TableStatus.AVAILABLE}
              onChange={(e) => setCurrentTable({ ...currentTable, status: e.target.value as TableStatus })}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] transition-all"
              style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
            >
              {Object.values(TableStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tableNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Observações (Opcional)
            </label>
            <textarea
              id="tableNotes"
              value={currentTable?.notes || ''}
              onChange={(e) => setCurrentTable({ ...currentTable, notes: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] transition-all resize-none"
              style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
              placeholder="Notas sobre a mesa, como localização ou preferências..."
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
              <CheckCircle className="w-4 h-4" /> Salvar Mesa
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};