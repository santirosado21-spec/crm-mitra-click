# Reglas del Proyecto: CRM Supply Chain México

## ⚠️ REGLA #1 - ANTI-BLOQUEO (CRÍTICO)

**NUNCA te quedes pensando más de 2 minutos.**

### Si una tarea es grande:
1. DIVÍDELA en subtareas de máximo 5 minutos
2. EJECUTA una subtarea
3. MUESTRA el resultado
4. PREGUNTA si continúas

### Si no entiendes algo:
1. PARA inmediatamente
2. PREGUNTA específicamente
3. NO intentes adivinar

### Formato de comunicación obligatorio:
```
🔨 HACIENDO: [tarea actual]
✅ LISTO: [qué terminaste]  
⏭️ SIGUIENTE: [próxima tarea]
❓ DUDA: [si tienes alguna]
```

---

## 🎯 ALCANCE DEL PROYECTO

**PILOTO ÚNICAMENTE PARA OFICINA DE LERMA**
- Solo usuarios de Lerma tendrán acceso
- No complicar con multi-almacén por ahora
- Enfoque: simple y funcional primero

---

## 🔄 EXTENSIV 3PL WMS - NO DUPLICAR

Supply Chain México ya usa **Extensiv 3PL Warehouse Manager** para gestión de almacén. El CRM NO debe duplicar estas funciones:

### ✅ Lo que YA hace Extensiv (NO replicar):
- Inventario en tiempo real (ubicaciones, lotes, series)
- Órdenes de entrada/salida (crear, procesar, confirmar)
- Billing Wizard (cargos automáticos por transacción)
- Facturación básica (QuickBooks integration)
- Portal de clientes (ven su inventario)
- 60+ reportes de inventario y operaciones
- Notificaciones automáticas de órdenes

### ❌ Lo que Extensiv NO hace (SÍ construir en el CRM):
- Registrar horas extra del personal
- Servicios manuales (reparaciones, pruebas, maniobras especiales)
- Gestión de transporte propio (solo carriers externos)
- Leer PDFs de clientes automáticamente
- Generar Proforma en formato mexicano
- Bitácora/log operativo con seguimiento entre departamentos
- Rendiciones de cuenta de transporte
- Conectar Almacén + Servicio al Cliente + Cobranza

### 🎯 Enfoque del CRM:
El CRM **complementa** a Extensiv, no lo reemplaza. Se enfoca en:
1. Seguimiento de operaciones entre departamentos
2. Lo que Extensiv NO registra (servicios adicionales, transporte propio)
3. Generación de Proformas mexicanas
4. Comunicación interna y con clientes

---

## 💻 STACK TECNOLÓGICO

### Frontend
- React 18+ con Vite
- Tailwind CSS (solo clases utilitarias, NO CSS custom)
- Lucide React (iconos)
- Recharts (gráficas)
- React Hook Form (formularios)
- React Router DOM v6

### Backend
- Supabase (PostgreSQL + Auth + Storage + Realtime)

### Deploy
- Vercel (frontend)

---

## 🎨 ESTILOS OBLIGATORIOS

### Colores (USAR SIEMPRE)
```css
--azul-oscuro: #1e3a5f;    /* Headers, botones principales */
--rojo: #dc3545;           /* Acentos, alertas */
--blanco: #ffffff;         /* Fondos */
--gris-claro: #f8f9fa;     /* Fondos alternos */
--verde: #28a745;          /* Éxito */
--amarillo: #ffc107;       /* Pendiente */
```

### Tipografía
- Headers: Montserrat
- Body: Inter
- Fallback: system-ui, sans-serif

### Componentes
- Bordes: `rounded-lg`
- Sombras: `shadow-md`
- Transiciones: `transition-all duration-200`

---

## 📁 ESTRUCTURA DE CARPETAS

```
crm-supply-chain/
├── .antigravity/
│   └── rules.md
├── .agent/skills/
│   └── supply-chain-mexico/
│       └── SKILL.md
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── features/
│   ├── pages/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── operations/
│   │   ├── clients/
│   │   ├── billing/
│   │   └── reports/
│   ├── hooks/
│   ├── lib/
│   │   └── supabase.ts
│   ├── types/
│   ├── utils/
│   └── App.tsx
├── public/
└── package.json
```

---

## 🔐 PERMISOS POR ROL

| Acción | Admin | Almacén | Servicio Cliente | Cobranza |
|--------|-------|---------|------------------|----------|
| Ver todo | ✅ | ✅ | ✅ | ✅ |
| Crear operación | ✅ | ✅ | ✅ | ❌ |
| Editar operación | ✅ | ⚠️ parcial | ✅ | ⚠️ solo $ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |
| Editar clientes | ✅ | ❌ | ❌ | ❌ |
| Facturación | ✅ | ❌ | ❌ | ✅ |
| Gestionar usuarios | ✅ | ❌ | ❌ | ❌ |

---

## 📊 TIPOS DE DATOS (TypeScript)

```typescript
// Estados de operación
type OperationStatus = 'en_proceso' | 'cerrada' | 'pendiente' | 'cancelada';

// Tipos de embarque
type OperationType = 'entrada' | 'salida' | 'recoleccion' | 'cross_dock' | 'actividad_almacen' | 'flete' | 'maniobra';

// Roles de usuario
type UserRole = 'admin' | 'almacen' | 'servicio_cliente' | 'cobranza';

// Formato de referencia: SCLER00001 (SC + almacén + número)
```

---

## ✅ CHECKLIST ANTES DE TERMINAR

- [ ] ¿Funciona en móvil?
- [ ] ¿Tiene loading states?
- [ ] ¿Tiene manejo de errores?
- [ ] ¿Usa los colores corporativos?
- [ ] ¿Código comentado en español?
- [ ] ¿Archivo menor a 200 líneas?

---

## 🚫 PROHIBIDO

1. **Archivos > 200 líneas** → Dividir
2. **CSS inline o custom** → Solo Tailwind
3. **any en TypeScript** → Siempre tipar
4. **Datos hardcodeados** → Todo de Supabase
5. **Ignorar errores** → Siempre try/catch
6. **Pensar > 2 min** → Actuar o preguntar
7. **Todo de golpe** → Paso a paso