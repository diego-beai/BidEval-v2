import React from 'react';
import { useOperationsStore, operationIcons, operationToModule, type OperationType } from '../../stores/useOperationsStore';
import './OperationsIndicator.css';

interface OperationsIndicatorProps {
    isExpanded: boolean;
    onNavigate?: (view: string) => void;
}

/**
 * Indicador de operaciones activas para mostrar en la sidebar
 */
export const OperationsIndicator: React.FC<OperationsIndicatorProps> = ({ isExpanded, onNavigate }) => {
    const activeOperations = useOperationsStore(state => state.activeOperations);

    if (activeOperations.length === 0) {
        return null;
    }

    return (
        <div className={`operations-indicator ${isExpanded ? 'expanded' : ''}`}>
            <div className="operations-header">
                <div className="operations-pulse"></div>
                <span className="operations-count">{activeOperations.length}</span>
                {isExpanded && <span className="operations-label">Active</span>}
            </div>

            {isExpanded && (
                <div className="operations-list">
                    {activeOperations.map((op, index) => (
                        <div
                            key={`${op.type}-${index}`}
                            className="operation-item"
                            onClick={() => onNavigate?.(operationToModule[op.type])}
                            title={`Go to ${op.type}`}
                        >
                            <span className="operation-icon">{operationIcons[op.type]}</span>
                            <span className="operation-label">{op.label}</span>
                            {op.progress !== undefined && (
                                <span className="operation-progress">{op.progress}%</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * Badge compacto para mostrar operaciones activas en un módulo específico
 */
interface OperationBadgeProps {
    module: string;
    showSpinner?: boolean;
}

export const OperationBadge: React.FC<OperationBadgeProps> = ({ module, showSpinner = true }) => {
    const activeOperations = useOperationsStore(state => state.activeOperations);

    // Mapear módulo a tipo de operación
    const moduleToOperation: Record<string, OperationType> = {
        chat: 'chat',
        mail: 'mail',
        upload: 'upload',
        decision: 'scoring'
    };

    const operationType = moduleToOperation[module];
    const hasActiveOp = operationType
        ? activeOperations.some(op => op.type === operationType)
        : false;

    if (!hasActiveOp) {
        return null;
    }

    // Obtener progreso si existe
    const operation = activeOperations.find(op => op.type === operationType);
    const progress = operation?.progress;

    return (
        <div className="operation-badge">
            {showSpinner ? (
                <div className="operation-spinner">
                    <svg viewBox="0 0 24 24" fill="none" className="spinner-svg">
                        <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray="31.4 31.4"
                            className="spinner-circle"
                        />
                    </svg>
                </div>
            ) : (
                <div className="operation-dot"></div>
            )}
            {progress !== undefined && progress > 0 && (
                <span className="operation-badge-progress">{progress}%</span>
            )}
        </div>
    );
};

export default OperationsIndicator;
