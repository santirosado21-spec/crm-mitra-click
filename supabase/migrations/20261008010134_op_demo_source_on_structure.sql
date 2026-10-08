-- Mitra Click · Sistema operativo · 13 · Marca de origen en las tablas de estructura
-- Las tablas de documentos y catálogo ya traían `source` para distinguir lo real de lo
-- sembrado. Las de estructura (almacenes, ubicaciones, familias, categorías) no, así que
-- los datos de prueba que viven ahí no se podían separar ni quitar. Se les agrega la
-- misma columna, con 'manual' por omisión para que lo que ya exista cuente como real.

alter table public.warehouses add column source public.data_source not null default 'manual';
alter table public.locations add column source public.data_source not null default 'manual';
alter table public.product_families add column source public.data_source not null default 'manual';
alter table public.product_categories add column source public.data_source not null default 'manual';
