export const supportedLocales = ["es"] as const;

export type AppLocale = (typeof supportedLocales)[number];

export const defaultLocale: AppLocale = "es";

const spanishMessages = {
  shell: {
    cashierRole: "Cajera",
    nav: {
      sales: "Ventas",
      orders: "Pedidos",
      products: "Productos",
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
      loadMore: "Cargar más",
      cancel: "Cancelar",
      close: "Cerrar",
      chooseFile: "Elegir archivo",
      clearFile: "Quitar archivo",
      openCatalog: "Abrir productos",
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
      imageStorageHint: "Subí un archivo o pegá una URL. Siempre guardamos la imagen en storage propio.",
    },
    categories: {
      all: "Todo",
      "bebidas-gaseosas": "Bebidas gaseosas",
      "bebidas-aguas": "Aguas y saborizadas",
      alfajores: "Alfajores",
      galletitas: "Galletitas",
      snacks: "Snacks",
      "desayuno-y-merienda": "Desayuno y merienda",
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
      emptyDescription: "Cargá productos desde Productos para llenar esta vista.",
      loadingMore: "Cargando más productos...",
      continueScrolling: "Seguí bajando para ver más productos.",
      endReached: "No hay más productos para este filtro.",
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
      onAccountCustomerSelectionRequired:
        "Elegí un cliente existente o tocá crear cliente nuevo antes de cobrar.",
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
      customerSearchPlaceholder: "Buscar cliente existente",
      customerSearchHint:
        "Primero buscá un cliente existente. Si no aparece, recién ahí creá uno nuevo.",
      customerRecentTitle: "Clientes recientes",
      customerMatchesTitle: "Clientes encontrados",
      customerNoMatches: "No encontramos coincidencias exactas con ese nombre.",
      customerLookupLoadError: "No se pudo cargar la lista de clientes.",
      createNewCustomerButton: (customerName: string): string =>
        `Crear cliente nuevo "${customerName}"`,
      confirmCreateCustomerButton: (customerName: string): string =>
        `Confirmar cliente nuevo "${customerName}"`,
      customerSimilarWarningTitle: "Ya existen clientes parecidos",
      customerSimilarWarningDescription: (customerName: string): string =>
        `Revisá la lista antes de crear "${customerName}" para no dividir cuentas corrientes.`,
      customerExistingBadge: "Cliente existente",
      customerExistingHelp: "La deuda se va a registrar sobre este cliente.",
      customerNewBadge: "Cliente nuevo",
      customerNewHelp: "Se va a crear este cliente al confirmar el cobro.",
      changeSelectedCustomer: "Cambiar",
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
    partialPaymentHelp:
      "Ingresá el monto cobrado y confirmá para actualizar el saldo pendiente.",
    noSalesForFilter: "No hay ventas registradas para este filtro.",
    loadError: "No se pudo cargar el listado de ventas.",
    missingCustomer: "Este pedido no está vinculado a un cliente.",
    invalidPartialPayment: "El pago parcial debe ser mayor a cero.",
    partialPaymentTooHigh:
      "El pago parcial no puede superar el saldo pendiente del pedido.",
    registerPaymentError: "No se pudo registrar el pago del pedido.",
    registerPaymentSuccess: (amount: string): string => `Pago registrado: ${amount}.`,
  },
  productsWorkspace: {
    title: "Productos e inventario",
    searchPlaceholder: "Buscar por nombre, SKU o código",
    listTitle: "Listado de productos",
    detailTitle: "Ficha del producto",
    movementHistoryTitle: "Movimientos recientes",
    quickActionsTitle: "Acciones rápidas",
    emptyState: "No hay productos para los filtros actuales.",
    loadError: "No se pudo cargar el workspace de productos.",
    movementsLoadError: "No se pudieron cargar los movimientos del producto.",
    forms: {
      activeOnlyHelp: "Solo visible en listados activos",
      imageUploadLabel: "Subir archivo",
      imageUrlLabel: "O pegar URL",
      imageCurrentLabel: "Imagen actual",
      imageEmptyLabel: "Sin imagen cargada",
      imageSelectedFile: (fileName: string): string => `Archivo seleccionado: ${fileName}`,
      imageNoFileSelected: "Todavía no hay archivo seleccionado.",
      imageReplaceHint:
        "Si elegís archivo o URL, la imagen se descarga y queda guardada en Supabase Storage.",
    },
    summary: {
      withStock: "Con stock",
      lowStock: "Stock bajo",
      outOfStock: "Sin stock",
      stockValue: "Valor estimado",
    },
    filters: {
      all: "Todos",
      withStock: "Con stock",
      lowStock: "Stock bajo",
      outOfStock: "Sin stock",
      activeOnly: "Solo activos",
      allCategories: "Todas las categorías",
      orderByStock: "Ordenar por stock",
      orderByName: "Ordenar por nombre",
      orderByRecent: "Último movimiento",
    },
    categories: {
      beverages: "Bebidas",
      snacks: "Snacks",
      candy: "Golosinas",
      pantry: "Almacén",
      other: "Otros",
    },
    actions: {
      newProduct: "Nuevo producto",
      bulkPrices: "Actualizar precios",
      bulkProducts: "Carga masiva",
      bulkStock: "Stock masivo",
      addStock: "Agregar stock",
      adjustStock: "Ajustar stock",
      editProduct: "Editar producto",
      archiveProduct: "Archivar",
      viewAllMovements: "Ver todos los movimientos",
    },
    dialogs: {
      detailTitle: "Detalle del producto",
      createTitle: "Nuevo producto",
      editTitle: "Editar producto",
      stockTitle: "Movimiento de stock",
      bulkProductsTitle: "Carga masiva de productos",
      bulkStockTitle: "Carga masiva de stock",
    },
    bulk: {
      productsPasteHint:
        "Pegá filas con este orden: `name, sku, categoryId, price, cost, initialStock, minStock, imageUrl`.",
      productsPlaceholder:
        "name,sku,categoryId,price,cost,initialStock,minStock,imageUrl\nCoca 1L,BEB-101,bebidas-gaseosas,2500,1200,18,6,https://...\nAlfajor,GOL-010,alfajores,1500,700,24,8,",
      stockPasteHint:
        "Pegá filas con este orden: `sku, movementType, quantity, unitCost, reason`.",
      stockPlaceholder:
        "sku,movementType,quantity,unitCost,reason\nBEB-101,inbound,24,1200,reposicion\nGOL-010,outbound,3,,conteo",
      directApplyTitle: "Aplicación directa",
      directApplyBody:
        "No hay previsualización separada. Al confirmar, se guardan enseguida las filas válidas.",
      advancedFlow:
        "Usalo solo con tablas ya revisadas; las filas inválidas se reportan después de aplicar.",
    },
    fields: {
      name: "Nombre visible",
      sku: "SKU / código",
      barcode: "Código de barras",
      category: "Categoría",
      price: "Precio de venta",
      cost: "Costo",
      minStock: "Stock mínimo",
      minStockShort: "Mín.",
      currentStock: "Stock actual",
      currentStockShort: "Stock",
      quantity: "Cantidad",
      supplier: "Proveedor / remito",
      image: "Imagen del producto",
    },
    status: {
      inStock: "En stock",
      lowStock: "Reposición sugerida",
      outOfStock: "Sin stock",
      inactive: "Inactivo",
    },
    bulkCards: {
      products:
        "Subir CSV o pegar una tabla para crear muchos productos con validación previa.",
      stock:
        "Registrar ingresos o ajustes por lote con una sola confirmación y revisión previa.",
    },
    detail: {
      salesPrice: "Precio de venta",
      averageCost: "Costo promedio",
      minStock: "Stock mínimo",
      sku: "SKU",
      supplier: "Proveedor",
      lastMovement: "Último movimiento",
      noMovement: "Sin movimientos",
      noMovementHistory: "Sin movimientos registrados.",
    },
    modals: {
      wizardSteps: {
        stepOne: "1. Plantilla",
        stepTwo: "2. Validación",
        stepThree: "3. Confirmación",
      },
      stockModes: {
        inbound: "Ingreso",
        adjustment: "Ajuste",
        outbound: "Salida",
      },
      stockSummaryTitle: "Resumen antes de confirmar",
    },
    pagination: {
      previous: "Anterior",
      next: "Siguiente",
      pageLabel: (current: number, total: number): string => `Página ${current} de ${total}`,
      loadingMore: "Cargando más productos...",
      continueScrolling: "Seguí bajando para ver más productos.",
      endReached: "No hay más productos para estos filtros.",
    },
    errors: {
      createProduct: "No se pudo crear el producto.",
      updateProduct: "No se pudo guardar el producto.",
      archiveProduct: "No se pudo archivar el producto.",
      stockRegister: "No se pudo registrar el movimiento de stock.",
      bulkProductsEmpty: "Pegá al menos una fila para la carga masiva.",
      bulkProducts: "No se pudo procesar la carga masiva.",
      bulkStockEmpty: "Pegá al menos una fila para el stock masivo.",
      bulkStock: "No se pudo procesar el stock masivo.",
    },
    feedback: {
      productCreated: (name: string): string => `Producto creado: ${name}.`,
      productUpdated: (name: string): string => `Producto actualizado: ${name}.`,
      productArchived: (name: string): string => `Producto archivado: ${name}.`,
      stockRegistered: (name: string): string => `Movimiento registrado para ${name}.`,
      archiveConfirm: (name: string): string =>
        `¿Archivar ${name}? Seguirá disponible en histórico pero no en la lista activa.`,
      bulkProductsImported: (count: number, invalid: number): string =>
        invalid > 0
          ? `Carga masiva completada: ${count} productos creados, ${invalid} filas con error.`
          : `Carga masiva completada: ${count} productos creados.`,
      bulkStockImported: (count: number, invalid: number): string =>
        invalid > 0
          ? `Stock masivo aplicado: ${count} movimientos correctos, ${invalid} filas con error.`
          : `Stock masivo aplicado: ${count} movimientos correctos.`,
    },
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
      imageUrlLabel: "Imagen del producto",
      recentProducts: "Productos recientes",
      loadError: "No se pudieron cargar los productos para el alta.",
      invalidPrice: "El precio debe ser mayor a cero.",
      invalidInitialStock: "El stock inicial debe ser un entero mayor o igual a cero.",
      invalidMinStock: "El stock mínimo debe ser un entero mayor o igual a cero.",
      invalidCost: "El costo debe ser mayor a cero cuando se informa.",
      costRequiredForInitialStock:
        "Si cargás stock inicial, también tenés que informar el costo.",
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
      previewRequiredBeforeApply:
        "Primero generá una previsualización vigente antes de aplicar el lote.",
      previewHasErrors:
        "La previsualización tiene errores. Corregí el alcance o el valor antes de aplicar.",
      previewReady: (count: number): string => `Previsualización lista: ${count} filas.`,
      applied: (count: number): string => `Lote aplicado: ${count} productos actualizados.`,
      noUpdatedItems: "No hay ítems actualizados en este resultado.",
      noInvalidItems: "No hay ítems inválidos.",
      auditSummary: {
        status: "Estado",
        actor: "Responsable",
        timestamp: "Fecha",
        preview: "Previsualización",
        applied: "Aplicado",
      },
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
    title: "Deudas y cobranzas",
    subtitle:
      "Mirá cuánta plata quedó pendiente, filtrá deudores rápido y registrá pagos desde el detalle de cada cliente.",
    customerCandidates: "Clientes candidatos",
    manualCustomerReference: "Referencia manual del cliente",
    noOnAccountCustomers: "Todavía no hay clientes con cuenta corriente",
    searchPlaceholder: "Buscar deudor por nombre",
    lastActivityFromLabel: "Actividad desde",
    lastActivityToLabel: "Actividad hasta",
    pendingOrdersFilterLabel: "Pedidos abiertos",
    pendingOrdersFilterOption: {
      all: "Todos",
      single: "1 pedido",
      multiple: "2 o más",
    },
    sortByLabel: "Ordenar por",
    sortByOption: {
      outstanding: "Mayor deuda",
      recent: "Actividad reciente",
      customer: "Nombre",
    },
    debtorsMetric: "Deudores",
    moneyInStreetMetric: "Saldo créditos",
    openOrdersMetric: "Pedidos abiertos",
    averageBalanceMetric: "Saldo promedio",
    pendingSyncTitle: "Pagos guardados sin conexión",
    pendingSyncDescription: (count: number): string =>
      count === 1
        ? "Hay 1 pago pendiente de sincronización."
        : `Hay ${count} pagos pendientes de sincronización.`,
    customerListTitle: "Listado de deudores",
    noDebtors: "Todavía no hay deudas abiertas.",
    noDebtorsForFilters: "No encontramos deudores para esos filtros.",
    summaryCustomer: (customerName: string): string => `Cliente ${customerName}`,
    lastActivityLabel: "Último movimiento",
    debtIssuedLabel: "A crédito",
    registerPaymentTitle: "Registrar pago",
    registerPaymentHelp:
      "Cargá el monto cobrado y una nota opcional para dejar trazabilidad del movimiento.",
    pendingOrdersTitle: "Pedidos con saldo pendiente",
    orderTitle: (dateLabel: string): string => `Pedido del ${dateLabel}`,
    noPendingOrders: "Este cliente no tiene pedidos pendientes.",
    debtLedger: "Libro de deuda",
    createDebtHint:
      "Para generar deuda, hacé el checkout con el método cuenta corriente desde Ventas.",
    loadSnapshotError: "No se pudo cargar el snapshot de deudas.",
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
