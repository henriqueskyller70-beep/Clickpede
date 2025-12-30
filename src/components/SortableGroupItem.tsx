import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit, X } from 'lucide-react';
import { Group } from '../../types';

interface SortableGroupItemProps {
  group: Group;
  isSelected: boolean;
  storePrimaryColor: string;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isEditing: boolean;
  editingGroupName: string;
  onGroupNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveEditedGroup: () => void;
}

export const SortableGroupItem: React.FC<SortableGroupItemProps> = ({
  group,
  isSelected,
  storePrimaryColor,
  onSelect,
  onEdit,
  onDelete,
  isEditing,
  editingGroupName,
  onGroupNameChange,
  onSaveEditedGroup,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id! });

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
      className={`flex items-center justify-between px-4 py-2 rounded-lg transition-all duration-200 group relative overflow-hidden
        ${isSelected 
          ? 'text-white shadow-lg transform scale-[1.01]' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-md hover:shadow-lg hover:translate-x-0.5'}
        ${isDragging ? 'opacity-40' : ''}
      `}
      data-id={group.id}
      onClick={() => onSelect(group.id!)} // Select on click
      style={isSelected 
        ? { backgroundColor: `${storePrimaryColor}10`, color: storePrimaryColor } 
        : {}
      }
    >
      <div className="flex items-center gap-2">
        <button 
          className="p-1 text-gray-400 hover:text-gray-600 transform active:scale-90 cursor-grab"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="flex-1 text-left font-medium text-sm">
          {isEditing ? (
            <input 
              type="text" 
              value={editingGroupName}
              onChange={onGroupNameChange}
              onBlur={onSaveEditedGroup}
              onKeyDown={e => { if (e.key === 'Enter') onSaveEditedGroup(); }}
              className="w-full bg-transparent border-b border-[#9f1239] focus:outline-none"
              onClick={(e) => e.stopPropagation()} // Prevent selecting group when editing input
            />
          ) : (
            group.name
          )}
        </span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onEdit(group.id!); }} className="p-1 hover:text-[#881337] transform active:scale-90" style={{ color: storePrimaryColor }}><Edit className="w-4 h-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(group.id!); }} className="p-1 text-red-500 hover:text-red-700 transform active:scale-90"><X className="w-4 h-4" /></button>
      </div>
      <span className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
    </div>
  );
};