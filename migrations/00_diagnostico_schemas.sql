-- ============================================
-- DIAGNOSTICO: Comparacion desarrollo vs public
-- Ejecutar en Supabase SQL Editor ANTES de migrar
-- ============================================

-- 1. TABLAS: cuales existen en cada schema
SELECT
    COALESCE(d.table_name, p.table_name) AS tabla,
    CASE WHEN d.table_name IS NOT NULL THEN 'SI' ELSE '---' END AS en_desarrollo,
    CASE WHEN p.table_name IS NOT NULL THEN 'SI' ELSE '---' END AS en_public,
    COALESCE(d.col_count, 0) AS cols_desarrollo,
    COALESCE(p.col_count, 0) AS cols_public,
    CASE
        WHEN d.table_name IS NULL THEN 'SOLO EN PUBLIC'
        WHEN p.table_name IS NULL THEN 'SOLO EN DESARROLLO'
        WHEN d.col_count != p.col_count THEN 'COLUMNAS DIFERENTES'
        ELSE 'OK'
    END AS status
FROM
    (SELECT table_name, COUNT(*) as col_count
     FROM information_schema.columns
     WHERE table_schema = 'desarrollo'
     GROUP BY table_name) d
FULL OUTER JOIN
    (SELECT table_name, COUNT(*) as col_count
     FROM information_schema.columns
     WHERE table_schema = 'public'
     GROUP BY table_name) p
ON d.table_name = p.table_name
ORDER BY COALESCE(d.table_name, p.table_name);

-- 2. COLUMNAS: diferencias detalladas por tabla
-- Muestra columnas que existen en un schema pero no en el otro
SELECT
    COALESCE(d.table_name, p.table_name) AS tabla,
    COALESCE(d.column_name, p.column_name) AS columna,
    d.data_type AS tipo_desarrollo,
    p.data_type AS tipo_public,
    CASE
        WHEN d.column_name IS NULL THEN 'SOLO EN PUBLIC'
        WHEN p.column_name IS NULL THEN 'SOLO EN DESARROLLO'
        WHEN d.data_type != p.data_type THEN 'TIPO DIFERENTE'
        ELSE 'OK'
    END AS status
FROM
    (SELECT table_name, column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'desarrollo') d
FULL OUTER JOIN
    (SELECT table_name, column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public') p
ON d.table_name = p.table_name AND d.column_name = p.column_name
WHERE d.column_name IS NULL OR p.column_name IS NULL OR d.data_type != p.data_type
ORDER BY COALESCE(d.table_name, p.table_name), COALESCE(d.column_name, p.column_name);

-- 3. CONTEO DE FILAS por tabla en cada schema
DO $$
DECLARE
    r RECORD;
    dev_count BIGINT;
    pub_count BIGINT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CONTEO DE FILAS POR TABLA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '%-40s %-12s %-12s', 'Tabla', 'Desarrollo', 'Public';
    RAISE NOTICE '%-40s %-12s %-12s', '----', '----', '----';

    FOR r IN
        SELECT COALESCE(d.table_name, p.table_name) AS tbl
        FROM
            (SELECT DISTINCT table_name FROM information_schema.tables WHERE table_schema = 'desarrollo' AND table_type = 'BASE TABLE') d
        FULL OUTER JOIN
            (SELECT DISTINCT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') p
        ON d.table_name = p.table_name
        ORDER BY 1
    LOOP
        BEGIN
            EXECUTE format('SELECT count(*) FROM desarrollo.%I', r.tbl) INTO dev_count;
        EXCEPTION WHEN OTHERS THEN
            dev_count := -1;
        END;

        BEGIN
            EXECUTE format('SELECT count(*) FROM public.%I', r.tbl) INTO pub_count;
        EXCEPTION WHEN OTHERS THEN
            pub_count := -1;
        END;

        RAISE NOTICE '%-40s %-12s %-12s',
            r.tbl,
            CASE WHEN dev_count = -1 THEN 'N/A' ELSE dev_count::text END,
            CASE WHEN pub_count = -1 THEN 'N/A' ELSE pub_count::text END;
    END LOOP;

    RAISE NOTICE '========================================';
END $$;
