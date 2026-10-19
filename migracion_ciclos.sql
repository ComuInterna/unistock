-- ════════════════════════════════════════════════════════════════════════
-- UniStock — Migración: Ciclos (cierre/renovación anual de artículos)
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase (proyecto ozkqmpdbtzbtavyyxrvz)
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE products ADD COLUMN IF NOT EXISTS cycle_label text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cycle_status text DEFAULT 'activo';
ALTER TABLE products ADD COLUMN IF NOT EXISTS cycle_closed_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cycle_parent_id uuid REFERENCES products(id);

-- Deja explícito que todo lo existente queda como "activo" (vigente, sin ciclo asignado)
UPDATE products SET cycle_status = 'activo' WHERE cycle_status IS NULL;

-- Índice de apoyo para las consultas de "artículos por ciclo cerrado"
CREATE INDEX IF NOT EXISTS idx_products_cycle_status ON products(cycle_status);
CREATE INDEX IF NOT EXISTS idx_products_cycle_label  ON products(cycle_label);
