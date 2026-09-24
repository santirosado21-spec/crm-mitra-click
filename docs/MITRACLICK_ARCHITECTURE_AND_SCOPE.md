# MitraClick Intelligence — arquitectura, integraciones y alcance

Fecha de validación: 27 de agosto de 2026.

Fuentes de alcance revisadas:

- **Propuesta Mitra y Mitra Click** (6 páginas físicas).
- **HOTCHES**, de Ángel Secades (5 páginas físicas).

Este documento describe el esqueleto demostrativo actual. No afirma que existan conexiones productivas, atribución causal, automatizaciones activas o inferencia de IA.

## 1. Arquitectura actual

```text
Pantallas React
  → MitraClickContext (contrato consumido por la UI)
  → MitraClickProvider (estado y comandos de la sesión)
  → MitraRepository (puerto de lectura normalizado)
  → MockMitraRepository
  → mockData.ts
```

Responsabilidades:

- `domain.ts`: entidades, estados y contratos normalizados del dominio.
- `data/mockData.ts`: única fuente de datos sintéticos.
- `data/repository.ts`: puerto `MitraRepository` y adaptador demo.
- `MitraClickContext.ts`: contrato estable que consumen las pantallas.
- `MitraClickProvider.tsx`: carga el repositorio inyectado y concentra comandos locales.
- `selectors.ts`: métricas, filtros, agrupaciones y atribución calculada como funciones puras.
- `pages/*`: presentación; ninguna pantalla importa `mockData.ts`.

`MitraClickProvider` permite inyectar otra implementación de `MitraRepository`. Por ello, sustituir la lectura demo por fuentes reales no requiere reconstruir las pantallas. Las futuras operaciones de escritura deberán implementarse detrás de servicios de comandos usados por el Provider; el contrato que ve la UI puede mantenerse.

## 2. Conectores futuros

### Sistema interno de Mitra

- Punto de entrada: un adaptador que implemente `MitraRepository`.
- Normalizará clientes, contactos, productos, inventario, ventas y cotizaciones hacia `MitraData`.
- Requiere esquema, acceso, identificadores maestros, frecuencia de actualización y reglas de reconciliación.

### Shopify

- Alimentará productos, pedidos/ventas, clientes e inventario disponible.
- Debe normalizarse antes de llegar a la UI; no se harán llamadas Shopify desde las páginas.
- La administración de catálogo y la experiencia dentro de Shopify permanecen fuera de este producto.

### Analytics

- GA4/GTM alimentará sesiones, eventos, conversiones y recorridos.
- Requiere consentimiento, identidad, eventos acordados, ventanas y definición de conversión.

### Google Ads y Meta Ads

- Alimentarán campañas, inversión, impresiones, clics y conversiones reportadas.
- El módulo Atribución consumirá campañas normalizadas; no consultará cada API directamente.
- Ninguna correlación demo debe presentarse como causalidad real.

### Inventario

- Se integrará desde Shopify y/o el sistema interno, con una fuente maestra definida.
- La pantalla Productos seguirá siendo de inteligencia y señales, no un gestor de catálogo.

### Clientes, ventas y cotizaciones

- Lectura: adaptadores hacia `Company`, `Contact`, `Sale`, `Quote` y `Opportunity`.
- Escritura: servicios de comandos futuros para actualizar responsables, etapas, notas y estados.
- Requiere permisos, auditoría, idempotencia, manejo de errores y conciliación.

### Email y WhatsApp

- Se conectarán como canales de salida y conversación mediante servicios del lado servidor.
- Nunca se expondrán credenciales en el navegador.
- Requieren plantillas, consentimiento, reglas de opt-out, trazabilidad y aprobación de remitentes.

### Reportes, automatizaciones y agentes IA (Grok Bot)

- Decisión del 24-sep-2026: reportes, envíos por WhatsApp y automatizaciones **no** se construyen en esta plataforma. Los resuelven los agentes de Grok Bot (xAI).
- Los agentes leen los dashboards por navegador con una cuenta de Google compartida y un perfil propio; la guía está en `docs/agents/`.
- Esta plataforma aporta datos confiables, links con filtros estables y selectores legibles; no infiere, no programa y no envía mensajes.

## 3. Checklist contra “Propuesta Mitra y Mitra Click”

### ✅ Representado

- Dashboard ejecutivo con métricas de ventas, leads, conversión, clientes, pipeline, cotizaciones y productos.
- CRM visual de leads, empresas/contactos, oportunidades, cotizaciones y actividad.
- Pipeline por etapas y movimiento local con registro de actividad.
- Superficie de atribución por campaña/canal, claramente marcada como demostrativa.
- Dashboards de vendedores, productos, Mitra mayorista y Mitra Click preparados para que Grok Bot arme los reportes.
- Perfiles de agentes de Grok Bot documentados (`/agentes`).

### 🟡 Requiere integración o definición de Mitra

- Datos del sistema interno de Mitra.
- Shopify: clientes, pedidos/ventas, productos e inventario.
- Analytics/GA4 y gobierno de tracking.
- Google Ads, Meta Ads y reconciliación de campañas.
- Atribución real, identidad, deduplicación y ventanas aprobadas.
- Inicio de sesión con Google para la cuenta de agentes, perfiles y bitácora.
- Actualización en tiempo real o con frecuencia acordada.
- Autenticación, roles y permisos de usuarios reales.

### 🔴 Pendiente

- Chatbot/conversaciones con clasificación, conocimiento, transferencia al CRM y escalamiento.
- Definición contractual verificable de “tracking al 100%” y “tiempo real”.
- Outbound B2B por email/LinkedIn, condicionado en la propuesta a una decisión de Mitra.

## 4. Checklist contra “HOTCHES”

### ✅ Representado

- Visión ejecutiva del embudo comercial y campañas.
- Leads, clientes/empresas, oportunidades, actividad y cotizaciones.
- Productos e inventario como superficies de inteligencia.
- Campañas, inversión, leads, ventas e ingresos en la vista de atribución demo.
- Reportes y automatizaciones asignados a Grok Bot, que consume los dashboards de esta plataforma.

### 🟡 Requiere integración o coordinación

- Shopify, soporte técnico del sitio y datos de conversión suministrados por el proveedor incumbente.
- Google, Facebook/Meta, Shopping y métricas de campañas.
- Formularios, chat y WhatsApp colocados en el sitio por el incumbente, con transferencia de datos hacia MitraClick.
- Mailing, etiquetas, funnel y reportes dinámicos existentes, evitando duplicar responsabilidades.
- Catálogo/productos, inventario, clientes y ventas provenientes de las fuentes reales.
- Acuerdo de responsables, eventos, datos maestros, accesos y frecuencia de actualización.

### 🔴 Pendiente

- Chatbot inteligente con conocimiento, clasificación, auditoría y transferencia al CRM.
- Matriz de propiedad aprobada entre Mitra, el proveedor incumbente y Picos.ai.
- Criterios medibles de aceptación para tracking, atribución y actualización de datos.

## 5. Límites actuales del producto

- Todos los datos son sintéticos y viven en memoria durante la sesión.
- No existe persistencia productiva, autenticación real ni control de permisos.
- No se envían mensajes, correos ni WhatsApp.
- No hay módulos de reportes ni automatizaciones: ese trabajo vive en Grok Bot.
- No se consulta ningún modelo de IA.
- No se administran catálogo, anuncios ni configuración de Shopify.
- Productos es inteligencia de lectura; Cotizaciones es seguimiento comercial, no un cotizador logístico.
