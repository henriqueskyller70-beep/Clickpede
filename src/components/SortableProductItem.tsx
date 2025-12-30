import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit, X, Star, ChevronDown, Plus, Copy, Search } from 'lucide-react';
import { Product, Group, StoreProfile, Option, SubProduct } from '../../types';
import { AddSubProductModal } from './AddSubProductModal'; // Importar o novo modal

// DND Kit Imports for nested sorting
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates, // Importação correta
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface SortableProductItemProps {
  product: Product;
  groups: Group[];
  storeProfile: StoreProfile;
  showOptionsForProduct: string | null;
  setShowOptionsForProduct: (id: string | null) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onAddOption: (productId: string) => void;
  onOptionChange: (productId: string, optionId: string, field: keyof Option, value: any) => void;
  onSubProductChange: (productId: string, optionId: string, subProductId: string, field: keyof SubProduct, value: any) => void;
  onAddSubProductClick: (productId: string, optionId: string) => void;
  onToggleOptionActive: (productId: string, optionId: string, searchTerm: string, option: Option, filteredSubProducts: SubProduct[]) => void; // Adicionado searchTerm opcional
  onToggleSubProductActive: (productId: string, optionId: string, subProductId: string) => void;
  onDeleteOption: (productId: string, optionId: string) => void;
  onDeleteSubProduct: (productId: string, optionId: string, subProductId: string) => void;
  addingSubProductForOption: { productId: string; optionId: string } | null;
  onAddSubProductConfirm: (newSubProductData: Omit<SubProduct, 'id' | 'isActive'>) => void; // Atualizado para receber o objeto completo
  onOptionDragEnd: (productId: string, event: DragEndEvent) => void;
  onSubProductDragEnd: (productId: string, optionId: string, event: DragEndEvent) => void;
  onOpenCopyOptionModal: (productId: string, optionId: string) => void; // NOVO: Prop para abrir o modal de cópia
}

export const SortableProductItem: React.FC<SortableProductItemProps> = ({
  product,
  groups,
  storeProfile,
  showOptionsForProduct,
  setShowOptionsForProduct,
  onEditProduct,
  onDeleteProduct,
  onAddOption,
  onOptionChange,
  onSubProductChange,
  onAddSubProductClick,
  onToggleOptionActive,
  onToggleSubProductActive,
  onDeleteOption,
  onDeleteSubProduct,
  addingSubProductForOption,
  onAddSubProductConfirm, // Agora recebe o objeto completo
  onOptionDragEnd,
  onSubProductDragEnd,
  onOpenCopyOptionModal, // NOVO: Desestruturar a nova prop
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  const groupName = groups.find(g => g.id === product.group_id)?.name || 'Nenhum';

  // DND Kit Sensors for nested options
  const optionSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden transform hover:scale-[1.01] hover:shadow-2xl transition-all duration-200 relative group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
      <div className="flex items-center p-4 gap-4">
        <button
          className="text-gray-400 hover:text-gray-600 transform active:scale-90 cursor-grab"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="w-5 h-5" />
        </button>
        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 shadow-lg border border-gray-200 flex items-center justify-center">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-400 text-xs text-center p-2">Sem Imagem</span>
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-900">{product.name}</h4>
          <p className="text-xs text-gray-500">Grupo: {groupName}</p>
          <p className="font-bold text-gray-800">Preço: R$ {product.price.toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button className="p-2 hover:bg-[#9f1239]/10 rounded-lg transform active:scale-95 shadow-md" style={{ color: storeProfile.primaryColor }}><Star className="w-4 h-4" /></button>
          <button onClick={() => onEditProduct(product)} className="p-2 hover:bg-[#9f1239]/10 rounded-lg transform active:scale-95 shadow-md" style={{ color: storeProfile.primaryColor }}><Edit className="w-4 h-4" /></button>
          <button onClick={() => onDeleteProduct(product.id!)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transform active:scale-95 shadow-md"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <button
        onClick={() => setShowOptionsForProduct(showOptionsForProduct === product.id ? null : product.id!)}
        className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-2 border-t border-gray-100 flex items-center justify-center gap-2 transition-colors transform active:scale-99 shadow-inner relative overflow-hidden"
      >
        {showOptionsForProduct === product.id ? 'Ocultar Opções' : 'Mostrar Opções'}
        <ChevronDown className={`w-4 h-4 transition-transform ${showOptionsForProduct === product.id ? 'rotate-180' : ''}`} />
        <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
      </button>

      {showOptionsForProduct === product.id && (
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h5 className="font-bold text-gray-800">Opções</h5>
            <button
              onClick={() => onAddOption(product.id!)}
              className="text-white px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 flex items-center gap-2 shadow-lg transition-colors font-medium text-sm transform active:scale-95 relative overflow-hidden"
            >
              <Plus className="w-4 h-4" /> Nova Opção
              <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
            </button>
          </div>

          <DndContext 
            sensors={optionSensors} 
            collisionDetection={closestCenter} 
            onDragEnd={(event) => onOptionDragEnd(product.id!, event)}
          >
            <SortableContext 
              items={product.options.map(opt => opt.id)} 
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {product.options.map((option) => (
                  <SortableOptionItemWrapper
                    key={option.id}
                    option={option}
                    storeProfile={storeProfile}
                    productId={product.id!}
                    onOptionChange={onOptionChange}
                    onSubProductChange={onSubProductChange}
                    onAddSubProductClick={onAddSubProductClick}
                    onToggleOptionActive={onToggleOptionActive}
                    onToggleSubProductActive={onToggleSubProductActive}
                    onDeleteOption={onDeleteOption}
                    onDeleteSubProduct={onDeleteSubProduct}
                    addingSubProductForOption={addingSubProductForOption}
                    onAddSubProductConfirm={onAddSubProductConfirm}
                    onSubProductDragEnd={onSubProductDragEnd}
                    onOpenCopyOptionModal={onOpenCopyOptionModal} // NOVO: Passar a função para o wrapper da opção
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
};

interface SortableOptionItemWrapperProps {
  option: Option;
  storeProfile: StoreProfile;
  productId: string;
  onOptionChange: (productId: string, optionId: string, field: keyof Option, value: any) => void;
  onSubProductChange: (productId: string, optionId: string, subProductId: string, field: keyof SubProduct, value: any) => void;
  onAddSubProductClick: (productId: string, optionId: string) => void;
  onToggleOptionActive: (productId: string, optionId: string, searchTerm: string, option: Option, filteredSubProducts: SubProduct[]) => void; // Adicionado searchTerm opcional
  onToggleSubProductActive: (productId: string, optionId: string, subProductId: string) => void;
  onDeleteOption: (productId: string, optionId: string) => void;
  onDeleteSubProduct: (productId: string, optionId: string, subProductId: string) => void;
  addingSubProductForOption: { productId: string; optionId: string } | null;
  onAddSubProductConfirm: (newSubProductData: Omit<SubProduct, 'id' | 'isActive'>) => void; // Atualizado para receber o objeto completo
  onSubProductDragEnd: (productId: string, optionId: string, event: DragEndEvent) => void;
  onOpenCopyOptionModal: (productId: string, optionId: string) => void; // NOVO: Prop para abrir o modal de cópia
}

const SortableOptionItemWrapper: React.FC<SortableOptionItemWrapperProps> = ({
  option,
  storeProfile,
  productId,
  onOptionChange,
  onSubProductChange,
  onAddSubProductClick,
  onToggleOptionActive,
  onToggleSubProductActive,
  onDeleteOption,
  onDeleteSubProduct,
  addingSubProductForOption,
  onAddSubProductConfirm, // Agora recebe o objeto completo
  onSubProductDragEnd,
  onOpenCopyOptionModal, // NOVO: Desestruturar a nova prop
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  // DND Kit Sensors for nested sub-products
  const subProductSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // State for sub-product search term
  const [subProductSearchTerm, setSubProductSearchTerm] = useState('');

  // Filter sub-products based on search term
  const filteredSubProducts = option.subProducts.filter(subProduct =>
    subProduct.name.toLowerCase().includes(subProductSearchTerm.toLowerCase())
  );

  // Determine the active state for the main toggle based on search term
  const allFilteredSubProductsAreActive = filteredSubProducts.length > 0 && filteredSubProducts.every(sp => sp.isActive);
  const isMainToggleActive = subProductSearchTerm ? allFilteredSubProductsAreActive : option.isActive;

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`option-${option.id}`} 
      className="bg-white rounded-lg border border-gray-100 p-4 shadow-md relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            className="p-1 text-gray-400 hover:text-gray-600 transform active:scale-90 cursor-grab"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={option.title}
            onChange={e => onOptionChange(productId, option.id, 'title', e.target.value)}
            className="font-bold text-gray-900 bg-transparent border-b border-gray-200 focus:outline-none text-base transition-all"
            style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
          />
          <span className="text-xs text-gray-500 ml-2">
            Mín: <input type="number" value={option.minSelection} onChange={e => onOptionChange(productId, option.id, 'minSelection', parseInt(e.target.value))} className="w-10 text-xs bg-transparent border-b border-gray-200 focus:outline-none transition-all" style={{ borderColor: storeProfile.primaryColor }} /> |
            Máx: <input type="number" value={option.maxSelection} onChange={e => onOptionChange(productId, option.id, 'maxSelection', parseInt(e.target.value))} className="w-10 text-xs bg-transparent border-b border-gray-200 focus:outline-none transition-all" style={{ borderColor: storeProfile.primaryColor }} /> |
            Repetir: <input type="checkbox" checked={option.allowRepeat} onChange={e => onOptionChange(productId, option.id, 'allowRepeat', e.target.checked)} className="form-checkbox h-3 w-3 rounded shadow-sm" style={{ color: storeProfile.primaryColor }} />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onOpenCopyOptionModal(productId, option.id)} // NOVO: Chamar a função para abrir o modal
            className="p-1 text-gray-500 hover:bg-gray-50 rounded-lg transform active:scale-95 shadow-sm"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={() => onDeleteOption(productId, option.id)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg transform active:scale-95 shadow-sm"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
            <input 
              type="text" 
              placeholder="Buscar sabores..." 
              className="w-40 bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 shadow-sm transition-all"
              value={subProductSearchTerm}
              onChange={e => setSubProductSearchTerm(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <div 
              className={`w-9 h-5 rounded-full flex items-center transition-all duration-300 p-0.5 shadow-inner ${isMainToggleActive ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}
              onClick={() => onToggleOptionActive(productId, option.id, subProductSearchTerm, option, filteredSubProducts)}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
            </div>
            Ativar/Desativar todos os sabores
          </label>
        </div>
      </div>

      <DndContext
        sensors={subProductSensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => onSubProductDragEnd(productId, option.id, event)}
      >
        <SortableContext
          items={filteredSubProducts.map(sp => sp.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 pl-6 border-l border-gray-100">
            {filteredSubProducts.map((subProduct) => (
              <SortableSubProductItemWrapper
                key={subProduct.id}
                subProduct={subProduct}
                storeProfile={storeProfile}
                productId={productId}
                optionId={option.id}
                onSubProductChange={onSubProductChange}
                onToggleSubProductActive={onToggleSubProductActive}
                onDeleteSubProduct={onDeleteSubProduct}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        onClick={() => onAddSubProductClick(productId, option.id)}
        className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 flex items-center justify-center gap-2 text-sm font-medium mt-2 shadow-md transform active:scale-99 relative overflow-hidden"
      >
        <Plus className="w-4 h-4" /> Adicionar Sabor
        <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
      </button>
    </div>
  );
};

interface SortableSubProductItemWrapperProps {
  subProduct: SubProduct;
  storeProfile: StoreProfile;
  productId: string;
  optionId: string;
  onSubProductChange: (productId: string, optionId: string, subProductId: string, field: keyof SubProduct, value: any) => void;
  onToggleSubProductActive: (productId: string, optionId: string, subProductId: string) => void;
  onDeleteSubProduct: (productId: string, optionId: string, subProductId: string) => void;
}

const SortableSubProductItemWrapper: React.FC<SortableSubProductItemWrapperProps> = ({
  subProduct,
  storeProfile,
  productId,
  optionId,
  onSubProductChange,
  onToggleSubProductActive,
  onDeleteSubProduct,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subProduct.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-100 shadow-sm transform hover:translate-x-0.5 hover:shadow-md transition-all duration-150"
    >
      <div className="flex-1 flex flex-col gap-1"> {/* Alterado para flex-col para empilhar nome e descrição */}
        <div className="flex items-center gap-3">
          <button
            className="p-1 text-gray-400 hover:text-gray-600 transform active:scale-90 cursor-grab"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={subProduct.name}
            onChange={e => onSubProductChange(productId, optionId, subProduct.id, 'name', e.target.value)}
            className="text-sm font-medium text-gray-800 bg-transparent border-b border-gray-200 focus:outline-none w-32 transition-all"
            style={{ borderColor: storeProfile.primaryColor }}
          />
          <span className="text-sm font-medium text-gray-800">- R$ </span>
          <input
            type="number" step="0.01"
            value={subProduct.price}
            onChange={e => onSubProductChange(productId, optionId, subProduct.id, 'price', parseFloat(e.target.value))}
            className="w-20 p-1 rounded-md border text-sm focus:outline-none focus:ring-1 shadow-sm"
            style={{ borderColor: `${storeProfile.primaryColor}20`, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
          />
        </div>
        {subProduct.description && (
          <p className="text-xs text-gray-500 ml-9 line-clamp-1">{subProduct.description}</p> 
        )}
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center cursor-pointer">
          <div 
            className={`w-9 h-5 rounded-full flex items-center transition-all duration-300 p-0.5 shadow-inner ${subProduct.isActive ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}
            onClick={() => onToggleSubProductActive(productId, optionId, subProduct.id)}
          >
            <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
          </div>
        </label>
        <button className="p-1 hover:bg-[#9f1239]/10 rounded-lg transform active:scale-95 shadow-sm" style={{ color: storeProfile.primaryColor }}><Star className="w-4 h-4" /></button>
        <button onClick={() => onDeleteSubProduct(productId, optionId, subProduct.id)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg transform active:scale-95 shadow-sm"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
};