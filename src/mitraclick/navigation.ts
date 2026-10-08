import type { LucideIcon } from 'lucide-react'
import {
  Bot, Boxes, ClipboardCheck, Clock, ClipboardList, FileBarChart, FileSignature, FileText, FolderTree, History,
  Home, LayoutDashboard, Link2, ListChecks, Map, MapPin, PackageSearch, Receipt, Repeat, ShoppingBag, ShoppingCart, Truck,
  UserCheck, UserPlus, Users, UsersRound, Wallet, Warehouse,
} from 'lucide-react'

/** Fase del plan de construcción en la que se entrega cada módulo. */
export type Phase = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'K'

export interface ModuleDef {
  path: string
  label: string
  icon: LucideIcon
  phase: Phase
  /** true cuando el módulo ya funciona; si no, se muestra como "en construcción". */
  ready: boolean
  /** Qué resolverá el módulo (se muestra mientras está en construcción). */
  summary: string
}

export const NAV_GROUPS: { label: string; modules: ModuleDef[] }[] = [
  {
    label: 'Dirección',
    modules: [
      { path: '/', label: 'Inicio', icon: Home, phase: 'A', ready: true, summary: 'Avance de la implementación y estado del sistema.' },
      { path: '/dashboard', label: 'Dashboard ejecutivo', icon: LayoutDashboard, phase: 'G', ready: true, summary: 'Qué está pasando, qué cambió y qué requiere atención: ventas, familias, vendedores, pedidos, entregas e inventario.' },
      { path: '/pendientes', label: 'Pendientes', icon: ClipboardCheck, phase: 'F', ready: true, summary: 'Excepciones detectadas por las reglas de calidad de datos, con responsable y estado de resolución.' },
      { path: '/reportes', label: 'Reportes', icon: FileBarChart, phase: 'H', ready: true, summary: 'Reportes semanales, quincenales y mensuales: ejecutivo, comercial, productos, operación e inventario.' },
      { path: '/agentes', label: 'Agentes', icon: Bot, phase: 'H', ready: true, summary: 'Supervisión, comercial, marketing y ejecutivo: hallazgos con evidencia y acción sugerida.' },
    ],
  },
  {
    label: 'Ventas',
    modules: [
      { path: '/clientes', label: 'Clientes', icon: Users, phase: 'B', ready: true, summary: 'Clientes con su vendedor asignado, datos fiscales y de contacto.' },
      { path: '/vendedores', label: 'Vendedores', icon: UserCheck, phase: 'B', ready: true, summary: 'Personas a las que se asignan clientes, cotizaciones y pedidos.' },
      { path: '/cotizaciones', label: 'Cotizaciones', icon: FileSignature, phase: 'D', ready: true, summary: 'Cotizaciones con seguimiento y conversión a pedido sin volver a capturar.' },
      { path: '/pedidos', label: 'Pedidos', icon: ShoppingCart, phase: 'D', ready: true, summary: 'Pedidos de Shopify y de venta directa, con su línea de tiempo de punta a punta.' },
    ],
  },
  {
    label: 'Compras',
    modules: [
      { path: '/proveedores', label: 'Proveedores', icon: UsersRound, phase: 'B', ready: true, summary: 'Proveedores con condiciones y tiempos de entrega.' },
      { path: '/compras', label: 'Compras', icon: ShoppingBag, phase: 'D', ready: true, summary: 'Órdenes de compra ligadas al pedido que las originó y su recepción en bodega.' },
    ],
  },
  {
    label: 'Bodega',
    modules: [
      { path: '/bodega', label: 'Operación del día', icon: Clock, phase: 'K', ready: true, summary: 'Qué falta por surtir antes de la hora de corte, qué entró y qué salió, y la ocupación por zona.' },
      { path: '/inventario', label: 'Inventario', icon: Boxes, phase: 'C', ready: true, summary: 'Existencia por producto y ubicación, derivada del libro de movimientos.' },
      { path: '/movimientos', label: 'Movimientos', icon: Repeat, phase: 'C', ready: true, summary: 'Entradas, salidas, traspasos y ajustes con usuario, fecha, motivo y documento.' },
      { path: '/surtido', label: 'Surtido', icon: ListChecks, phase: 'K', ready: true, summary: 'Lista de recorrido: qué recoger, cuánto y de qué ubicación, en orden por pasillo.' },
      { path: '/conteos', label: 'Conteos', icon: ClipboardList, phase: 'C', ready: true, summary: 'Conteos físicos: generan una diferencia para revisión, nunca sobrescriben.' },
      { path: '/mapa', label: 'Mapa de la bodega', icon: Map, phase: 'K', ready: true, summary: 'Planta y elevación de los anaqueles, coloreados por la existencia real. Clic en una ubicación para ver qué hay.' },
      { path: '/ubicaciones', label: 'Ubicaciones y etiquetas', icon: MapPin, phase: 'C', ready: true, summary: 'Almacenes, ubicaciones y etiquetas NFC/QR para abrir el registro desde el teléfono.' },
    ],
  },
  {
    label: 'Logística',
    modules: [
      { path: '/envios', label: 'Envíos y rutas', icon: Truck, phase: 'D', ready: true, summary: 'Programación de entregas, rutas y estado de cada envío.' },
      { path: '/remisiones', label: 'Remisiones', icon: FileText, phase: 'D', ready: true, summary: 'Remisiones con evidencia de entrega y verificación.' },
    ],
  },
  {
    label: 'Finanzas',
    modules: [
      { path: '/facturas', label: 'Facturas', icon: Receipt, phase: 'D', ready: true, summary: 'Registro de facturas por pedido y su estado de cobro.' },
      { path: '/pagos', label: 'Pagos y estados de cuenta', icon: Wallet, phase: 'D', ready: true, summary: 'Pagos recibidos y estado de cuenta por cliente.' },
    ],
  },
  {
    label: 'Catálogo',
    modules: [
      { path: '/productos', label: 'Productos', icon: PackageSearch, phase: 'B', ready: true, summary: 'Catálogo con reglas de alta, detección de duplicados e historial de cambios.' },
      { path: '/familias', label: 'Familias y categorías', icon: FolderTree, phase: 'B', ready: true, summary: 'Estructura de clasificación vigente del catálogo.' },
    ],
  },
  {
    label: 'Marketing',
    modules: [
      { path: '/leads', label: 'Leads y prospección', icon: UserPlus, phase: 'I', ready: true, summary: 'Leads por fuente y seguimiento de la prospección B2B en LinkedIn.' },
      { path: '/links', label: 'Links NFC / QR', icon: Link2, phase: 'I', ready: true, summary: 'Enlaces medibles para tarjetas NFC y códigos QR, con conteo de escaneos.' },
    ],
  },
  {
    label: 'Sistema',
    modules: [
      { path: '/usuarios', label: 'Usuarios y permisos', icon: Users, phase: 'A', ready: true, summary: 'Quién entra al sistema y con qué roles.' },
      { path: '/bitacora', label: 'Bitácora', icon: History, phase: 'A', ready: true, summary: 'Registro de cada cambio: quién, cuándo, antes y después.' },
      { path: '/shopify', label: 'Shopify', icon: Warehouse, phase: 'E', ready: true, summary: 'Estado de la conexión con Shopify y de cada sincronización.' },
    ],
  },
]

export const ALL_MODULES = NAV_GROUPS.flatMap((group) => group.modules)

export const findModule = (pathname: string) =>
  ALL_MODULES.find((module) => module.path === pathname) ??
  ALL_MODULES.find((module) => module.path !== '/' && pathname.startsWith(`${module.path}/`))
