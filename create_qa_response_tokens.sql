-- Tabla para almacenar tokens de respuesta Q&A de proveedores
CREATE TABLE IF NOT EXISTS qa_response_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider_name VARCHAR(100) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    question_ids UUID[] NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accessed', 'responded', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accessed_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_qa_response_tokens_token ON qa_response_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qa_response_tokens_project ON qa_response_tokens(project_id);
CREATE INDEX IF NOT EXISTS idx_qa_response_tokens_status ON qa_response_tokens(status);

-- Comentarios
COMMENT ON TABLE qa_response_tokens IS 'Tokens únicos para que proveedores respondan cuestionarios Q&A';
COMMENT ON COLUMN qa_response_tokens.token IS 'Token de 64 caracteres hexadecimales para el link único';
COMMENT ON COLUMN qa_response_tokens.question_ids IS 'Array de UUIDs de preguntas de qa_audit incluidas en este envío';
COMMENT ON COLUMN qa_response_tokens.status IS 'Estado: pending (no abierto), accessed (abierto), responded (respondido), expired (expirado)';

-- También asegúrate de que qa_audit tenga las columnas necesarias para respuestas
ALTER TABLE qa_audit
ADD COLUMN IF NOT EXISTS response TEXT,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS response_source VARCHAR(20) DEFAULT 'manual';

COMMENT ON COLUMN qa_audit.response IS 'Respuesta del proveedor a la pregunta';
COMMENT ON COLUMN qa_audit.responded_at IS 'Fecha/hora de la respuesta';
COMMENT ON COLUMN qa_audit.response_source IS 'Fuente de la respuesta: portal, email, manual';
