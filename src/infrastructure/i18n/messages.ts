export const supportedLocales = ["es"] as const;

export type AppLocale = (typeof supportedLocales)[number];

export const defaultLocale: AppLocale = "es";

const spanishMessages = {
  shell: {
    cashierRole: "Cajera",
    nav: {
      sales: "Ventas",
      orders: "Pedidos",
      catalog: "Catálogo",
      inventory: "Inventario",
      receivables: "Deudas",
      reporting: "Reportes",
      sync: "Sincronización",
    },
  },
  common: {
    labels: {
      subtotal: "Subtotal",
      items: "Ítems",
      total: "Total",
      method: "Método",
      customer: "Cliente",
      product: "Producto",
      quantity: "Cantidad",
      category: "Categoría",
      value: "Valor",
      revenue: "Facturación",
      cost: "Costo",
      profit: "Ganancia",
      collected: "Cobrado",
      outstanding: "Pendiente",
      paymentMethod: "Método de pago",
      periodStart: "Desde",
      periodEnd: "Hasta",
      paymentAmount: "Monto del pago",
      notesOptional: "Notas (opcional)",
      queueStorageKey: "Clave de almacenamiento",
      network: "Red",
      pendingEvents: "Eventos pendientes",
      scope: "Alcance",
      mode: "Modo",
      customerPays: "Cliente paga",
      due: "Falta",
      change: "Vuelto",
      paidNow: "Paga ahora",
      paid: "Pagado",
      remaining: "Saldo pendiente",
      saleId: "ID de venta",
    },
    actions: {
      refresh: "Actualizar",
      cancel: "Cancelar",
      openCatalog: "Abrir catálogo",
      processPayment: "Ir a cobrar",
      confirmPayment: "Confirmar cobro",
      retryOfflineSync: "Reintentar sincronización",
      refreshCandidates: "Actualizar candidatos",
      loadDebtSummary: "Cargar resumen",
      registerPayment: "Registrar pago",
      applyPayment: "Aplicar pago",
      applyFilters: "Aplicar filtros",
      registerMovement: "Registrar movimiento",
      createProduct: "Crear producto",
      preview: "Previsualizar",
      apply: "Aplicar",
    },
    states: {
      loading: "Cargando...",
      refreshing: "Actualizando...",
      syncing: "Sincronizando...",
      saving: "Guardando...",
      creating: "Creando...",
      registering: "Registrando...",
      applying: "Aplicando...",
      online: "En línea",
      offline: "Sin conexión",
    },
    placeholders: {
      searchProducts: "Buscar productos",
      searchMenuAria: "Buscar en el menú",
      advancedLookup: "Búsqueda avanzada opcional",
      exampleCustomer: "Ej. Juan Pérez",
      amount: "Monto",
      imageUrl: "https://...",
    },
    categories: {
      all: "Todo",
      main: "Platos",
      drink: "Bebidas",
      snack: "Snacks",
      dessert: "Postres",
      other: "Otros",
    },
    paymentMethods: {
      all: "Todos",
      cash: "Efectivo",
      on_account: "Cuenta corriente",
      cashSale: "Venta en efectivo",
      onAccountSale: "Venta en cuenta corriente",
    },
    paymentStatuses: {
      paid: "Pagada",
      partial: "Parcial",
      pending: "Pendiente",
    },
    movementTypes: {
      inbound: "Ingreso",
      outbound: "Salida",
      adjustment: "Ajuste",
    },
    availability: {
      available: "Disponible",
      unavailable: "No disponible",
    },
    fallbacks: {
      walkInCustomer: "Sin cliente",
      unnamedCustomer: "Cliente sin nombre",
      unknownProduct: "Producto desconocido",
    },
    feedback: {
      offlineSyncSuccess: "Los eventos offline se sincronizaron correctamente.",
      offlineSyncPending:
        "La sincronización offline todavía tiene eventos pendientes o fallidos. Reintentá.",
    },
  },
  sales: {
    catalog: {
      title: "Elegir categorías",
      allProducts: "Todos los productos",
      emptyTitle: "Todavía no hay productos",
      emptyDescription: "Cargá productos desde Catálogo para llenar esta vista.",
    },
    checkout: {
      orderListTitle: "Lista del pedido",
      paymentStepLabel: "Cobro",
      confirmPaymentTitle: "Confirmar pago",
      selectedItems: (count: number): string =>
        `${count} ${count === 1 ? "ítem seleccionado" : "ítems seleccionados"}`,
      addItemFirst: "Agregá al menos un producto antes de cobrar.",
      invalidCustomerPayment: "El monto entregado debe ser un número válido.",
      cashMustCoverTotal: "El efectivo debe cubrir el total para completar la venta.",
      onAccountCustomerRequired:
        "Para cuenta corriente primero asigná el nombre del cliente.",
      initialPaymentInvalid:
        "El pago inicial debe ser un monto válido mayor o igual a cero.",
      initialPaymentUseCash:
        "Si el cliente paga todo ahora, usá efectivo en lugar de cuenta corriente.",
      checkoutSuccess: "Venta registrada correctamente.",
      changeDueMessage: (amount: string): string => `Vuelto: ${amount}.`,
      customerAssignedMessage: (customerName: string): string => `Cliente: ${customerName}.`,
      remainingOnAccountMessage: (amount: string): string => `Saldo pendiente: ${amount}.`,
      saleSavedOffline: "Venta guardada sin conexión. Pendiente de sincronización.",
      decreaseAria: (itemName: string): string => `disminuir ${itemName}`,
      increaseAria: (itemName: string): string => `aumentar ${itemName}`,
      customerNameLabel: "Cliente",
      onAccountInitialPaymentLabel: "Paga ahora",
      retryOfflineSyncButton: (count: number): string =>
        `Reintentar sincronización (${count})`,
    },
  },
  orders: {
    title: "Listado de ventas",
    subtitle:
      "Revisá cada venta registrada, lo cobrado y el saldo pendiente sin salir del flujo POS.",
    recordedSales: "Ventas registradas",
    partialPaymentTitle: "Registrar pago parcial",
    partialPaymentHelp: "Aplicá un pago parcial sin salir de esta vista.",
    noSalesForFilter: "No hay ventas registradas para este filtro.",
    loadError: "No se pudo cargar el listado de ventas.",
    missingCustomer: "Este pedido no está vinculado a un cliente.",
    invalidPartialPayment: "El pago parcial debe ser mayor a cero.",
    partialPaymentTooHigh:
      "El pago parcial no puede superar el saldo pendiente del pedido.",
    registerPaymentError: "No se pudo registrar el pago del pedido.",
    registerPaymentSuccess: (saleId: string, amount: string): string =>
      `Pago registrado para ${saleId}: ${amount}.`,
  },
  catalog: {
    onboarding: {
      title: "Alta guiada de productos",
      subtitle: "UC-002: creá productos con campos mínimos e imagen opcional.",
      nameLabel: "Nombre",
      namePlaceholder: "ej. Empanada",
      priceLabel: "Precio",
      costLabel: "Costo (opcional)",
      initialStockLabel: "Stock inicial",
      imageUrlLabel: "URL de imagen (opcional)",
      recentProducts: "Productos recientes",
      loadError: "No se pudieron cargar los productos para el alta.",
      invalidPrice: "El precio debe ser mayor a cero.",
      invalidInitialStock: "El stock inicial debe ser un entero mayor o igual a cero.",
      invalidCost: "El costo debe ser mayor a cero cuando se informa.",
      createError: "No se pudo crear el producto.",
      createSuccess: (productName: string): string => `Producto creado: ${productName}`,
      emptyProducts: "Todavía no hay productos.",
    },
    bulkPriceUpdate: {
      title: "Actualización masiva de precios",
      subtitle:
        "UC-009: previsualizá y aplicá cambios porcentuales o fijos con salida auditable.",
      eligibleProducts: (count: number): string =>
        `Productos elegibles en el alcance actual: ${count}`,
      loadingProducts: "Cargando productos y categorías...",
      noProductsForScope:
        "Todavía no hay productos para este alcance. Crealos en alta de productos o cambiá el alcance.",
      selectProducts: "Seleccionar productos",
      resultItems: "Ítems resultantes",
      invalidItems: "Ítems inválidos",
      invalidValue: "El valor del ajuste debe ser un número válido.",
      missingCategory: "Seleccioná una categoría para el alcance por categoría.",
      missingSelection: "Seleccioná al menos un producto para el alcance por selección.",
      emptyScopeSelection:
        "No se encontraron productos para el alcance seleccionado. Crealos o seleccioná otros primero.",
      requestError: "La actualización masiva de precios falló.",
      previewReady: (count: number): string => `Previsualización lista: ${count} filas.`,
      applied: (count: number): string => `Lote aplicado: ${count} productos actualizados.`,
      noUpdatedItems: "No hay ítems actualizados en este resultado.",
      noInvalidItems: "No hay ítems inválidos.",
      scopes: {
        all: "Todos los productos",
        category: "Por categoría",
        selection: "Productos seleccionados",
      },
      modes: {
        percentage: "Porcentaje",
        fixed_amount: "Monto fijo",
      },
    },
  },
  inventory: {
    title: "Movimientos de stock",
    subtitle:
      "UC-003: registrá ingresos, salidas y ajustes con costo obligatorio en ingresos.",
    movementTypeLabel: "Tipo de movimiento",
    unitCostLabel: "Costo unitario",
    reasonLabel: "Motivo (opcional)",
    noProductsOption: "No hay productos disponibles",
    noProductsWarning:
      "Todavía no hay productos disponibles. Crealos en Catálogo y volvé.",
    recentMovements: "Movimientos recientes",
    loadError: "No se pudieron cargar los datos de stock.",
    missingProduct: "Seleccioná un producto primero.",
    invalidQuantity: "La cantidad debe ser mayor a cero.",
    invalidInboundCost: "El ingreso requiere costo unitario mayor a cero.",
    registerError: "No se pudo registrar el movimiento de stock.",
    registerSuccess: (movementType: string): string =>
      `Movimiento de stock registrado: ${movementType}.`,
    emptyMovements: "Todavía no hay movimientos.",
  },
  receivables: {
    title: "Gestión de deudas de clientes",
    subtitle:
      "UC-007: cargá el libro del cliente, registrá pagos y bajá la deuda pendiente.",
    customerCandidates: "Clientes candidatos",
    manualCustomerReference: "Referencia manual del cliente",
    noOnAccountCustomers: "Todavía no hay clientes con cuenta corriente",
    summaryCustomer: (customerName: string): string => `Cliente ${customerName}`,
    debtLedger: "Libro de deuda",
    createDebtHint:
      "Para generar deuda, hacé el checkout con el método cuenta corriente desde Ventas.",
    loadSummaryError: "No se pudo cargar el resumen de deuda.",
    selectCustomerFirst: "Seleccioná un cliente primero.",
    invalidPaymentAmount: "El monto del pago debe ser mayor a cero.",
    registerPaymentError: "No se pudo registrar el pago de deuda.",
    registerPaymentSuccess: (amount: string): string => `Pago registrado: ${amount}.`,
    saveOfflineSuccess: "Pago de deuda guardado sin conexión. Pendiente de sincronización.",
    noLedgerEntries: "No hay movimientos cargados.",
    ledgerEntryType: {
      debt: "Deuda",
      payment: "Pago",
    },
  },
  reporting: {
    title: "Historial y analítica de ventas",
    subtitle: "UC-004: explorá historial de ventas, productos más vendidos y ganancia.",
    salesHistory: "Historial de ventas",
    topProducts: "Productos más vendidos",
    noSalesInRange: "No hay ventas en el rango seleccionado.",
    noTopProducts: "Todavía no hay datos de productos más vendidos.",
    loadSalesError: "No se pudo cargar el historial de ventas.",
    loadTopProductsError: "No se pudieron cargar los productos más vendidos.",
    loadProfitError: "No se pudo cargar el resumen de ganancia.",
    loadReportingError: "No se pudieron cargar los datos del reporte.",
    invalidPeriodRange: "La fecha desde debe ser anterior o igual a la fecha hasta.",
    quantitySold: (count: number): string => `cantidad ${count}`,
    revenueLabel: (amount: string): string => `Facturación ${amount}`,
    customerLabel: (customerName: string): string => `Cliente ${customerName}`,
  },
  sync: {
    title: "Cola offline y sincronización",
    subtitle: "UC-008: conservá eventos críticos sin conexión y sincronizalos después.",
    synced: "Sincronizados",
    failed: "Fallidos",
    pending: "Pendientes",
  },
} as const;

export type AppMessages = typeof spanishMessages;

export const messagesByLocale: Record<AppLocale, AppMessages> = {
  es: spanishMessages,
};

export function resolveMessages(locale: AppLocale): AppMessages {
  return messagesByLocale[locale];
}
