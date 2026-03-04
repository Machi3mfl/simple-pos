export const supportedLocales = ["es"] as const;

export type AppLocale = (typeof supportedLocales)[number];

export const defaultLocale: AppLocale = "es";

const spanishMessages = {
  shell: {
    cashierRole: "Cajera",
    nav: {
      cashRegister: "Caja",
      sales: "Ventas",
      products: "Productos",
      catalog: "Catálogo",
      inventory: "Inventario",
      receivables: "Deudas",
      reporting: "Reportes",
      usersAdmin: "Accesos",
      sync: "Sincronización",
    },
  },
  accessControl: {
    operatorSessionEyebrow: "Operador",
    operatorSelectorTitle: "Seleccionar operador",
    operatorSelectorDescription:
      "Elegí el perfil con el que vas a trabajar. Esto define qué módulos y datos se muestran en la UI.",
    currentOperatorBadge: "Actual",
    loadingActor: "Cargando operador",
    loadingPermissions: "Estamos preparando la sesión y los permisos del operador.",
    changeOperatorAction: "Cambiar operador",
    blockedEyebrow: "Acceso protegido",
    noRegisterAssignment: "Sin caja asignada",
    assignedRegistersSummary: (count: number): string =>
      `${count} ${count === 1 ? "caja asignada" : "cajas asignadas"}`,
    currentOperatorContext: (displayName: string): string =>
      `Operador actual: ${displayName}`,
    unknownOperator: "Operador desconocido",
    unmappedActorRole: "Sin rol asignado",
    signInAction: "Iniciar sesión",
    signOutAction: "Cerrar sesión",
    sessionSourceAuthenticated: "Login verificado",
    sessionSourceAuthenticatedUnmapped: "Login sin perfil",
    sessionSourceAssumedUser: "Sesión delegada",
    sessionSourceDefaultActor: "Sin sesión",
    loginTitle: "Iniciar sesión",
    loginDescription:
      "Entrá con tu usuario real para que la caja, las ventas y los reportes queden atribuidos correctamente.",
    loginEmailLabel: "Correo electrónico",
    loginPasswordLabel: "Contraseña",
    loginSubmitAction: "Entrar",
    loginSupportAction: "Entrar en modo soporte",
    loginSupportActionError:
      "No se pudo entrar en modo soporte para validar usuarios y permisos.",
    loginSupportHint:
      "Si necesitás validar roles o dar soporte operativo, entrá al bridge temporal de soporte y desde ahí elegí el operador a revisar.",
    loginInvalidCredentials:
      "No se pudo iniciar sesión. Revisá el correo y la contraseña.",
    loginUnmappedProfile:
      "El login es válido, pero todavía no está vinculado a un perfil operativo del sistema.",
    loginNoWorkspace:
      "El usuario autenticado no tiene ningún workspace habilitado.",
    loginAuthenticatedHint:
      "La sesión ya está validada. Te redirigimos al workspace operativo disponible.",
    readOnlyWorkspaceHint:
      "Este perfil puede consultar la información, pero no tiene permisos para modificarla.",
    salesDetailRestrictedHint:
      "Este perfil puede ver el resumen de ventas, pero no entrar al detalle completo de cada operación.",
    receivablesReadOnlyHint:
      "Este perfil puede revisar saldos y pedidos pendientes, pero no registrar pagos.",
    blockedProductSourcingDescription:
      "Solo los perfiles con permiso para alta desde sourcing pueden entrar a esta pantalla.",
    blockedWorkspaceTitle: (workspaceId: string): string =>
      workspaceId === "cash-register"
        ? "Caja restringida"
        : workspaceId === "sales"
          ? "Ventas restringidas"
          : workspaceId === "products"
            ? "Productos restringidos"
            : workspaceId === "receivables"
              ? "Deudas restringidas"
              : workspaceId === "reporting"
                ? "Reportes restringidos"
                : workspaceId === "users-admin"
                  ? "Accesos restringidos"
                : workspaceId === "sync"
                  ? "Sincronización restringida"
                  : "Acceso restringido",
    blockedWorkspaceDescription: (workspaceId: string): string =>
      workspaceId === "cash-register"
        ? "Tu perfil no tiene acceso para operar o revisar la caja desde esta estación."
        : workspaceId === "sales"
          ? "Tu perfil no tiene permiso para consultar este historial de ventas."
          : workspaceId === "products"
            ? "Tu perfil no puede entrar al workspace de productos e inventario."
            : workspaceId === "receivables"
              ? "Tu perfil no puede revisar ni gestionar la cartera de deudas."
              : workspaceId === "reporting"
                ? "Tu perfil no tiene permiso para ver métricas estratégicas del negocio."
                : workspaceId === "users-admin"
                  ? "Tu perfil no puede entrar a la administración de usuarios, roles y permisos."
                : workspaceId === "sync"
                  ? "Tu perfil no puede acceder al panel de sincronización."
                  : "No tenés acceso a esta pantalla con el operador actual.",
  },
  usersAdmin: {
    title: "Usuarios, roles y permisos",
    description:
      "Configurá bundles de acceso del negocio sin tocar código y verificá el impacto real desde el operador actual.",
    metrics: {
      lockedRoles: "Roles base",
      customRoles: "Roles custom",
      activeUsers: "Usuarios activos",
      permissions: "Permisos",
    },
    catalogTitle: "Catálogo de roles",
    catalogDescription:
      "Los roles base están bloqueados. Podés clonarlos y adaptar permisos para tu operación real.",
    presetsBadge: "Base",
    customBadge: "Custom",
    lockedBadge: "Bloqueado",
    cloneAction: "Clonar preset",
    editAction: "Editar rol",
    emptyRoleTitle: "Todavía no hay roles custom",
    emptyRoleDescription:
      "Cloná un preset para empezar a armar bundles propios del negocio.",
    newRoleAction: "Nuevo rol vacío",
    composerTitle: "Composer de permisos",
    createRoleTitle: "Crear rol custom",
    editRoleTitle: "Editar rol custom",
    createRoleDescription:
      "Agrupá permisos por dominio y armá un rol nuevo sin modificar los presets base.",
    lockedRoleDescription:
      "Este rol forma parte del catálogo seed y no se edita directamente. Clonalo para crear una variante.",
    roleNameLabel: "Nombre del rol",
    roleDescriptionLabel: "Descripción",
    permissionGroupsTitle: "Permisos por dominio",
    permissionCount: (count: number): string =>
      `${count} ${count === 1 ? "permiso" : "permisos"}`,
    selectedPermissions: "Permisos seleccionados",
    noPermissionsSelected: "Todavía no elegiste permisos para este rol.",
    saveRoleAction: "Guardar rol",
    deleteRoleAction: "Eliminar rol",
    usersTitle: "Asignación de usuarios",
    usersDescription:
      "Seleccioná un usuario, ajustá sus roles y probá el resultado cambiando de operador.",
    searchUsersPlaceholder: "Buscar por nombre o rol",
    assignRolesAction: "Guardar asignación",
    tryRoleAction: "Probar operador",
    authSectionTitle: "Acceso real",
    authEmailLabel: "Correo de acceso",
    authPasswordLabel: "Contraseña temporal",
    authCreateAction: "Generar acceso",
    authUpdateAction: "Actualizar acceso",
    authProvisionedBadge: "Acceso listo",
    authMissingBadge: "Sin acceso",
    authStaleBadge: "Vinculación rota",
    authCurrentEmailLabel: "Correo actual",
    authMissingDescription:
      "Todavía no hay un login real vinculado a este usuario de aplicación.",
    authStaleDescription:
      "La vinculación actual apunta a un usuario auth inexistente. Volvé a generar acceso para repararla.",
    authSectionHint:
      "Usá este bloque para dejar un login real de Supabase Auth y probar el flujo sin bridge temporal.",
    noUserSelectedTitle: "Elegí un usuario",
    noUserSelectedDescription:
      "Desde acá podés combinar roles y validar el rail o los datos visibles con el snapshot actual.",
    userRolesLabel: "Roles asignados",
    assignmentReadOnlyHint:
      "Este perfil puede revisar el catálogo, pero no reasignar roles a usuarios.",
    managementReadOnlyHint:
      "Este perfil puede entrar al workspace, pero no crear ni editar roles custom.",
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
    cashSession: {
      title: "Sesión de caja",
      registerLabel: "Caja",
      registerPlaceholder: "Seleccionar caja",
      noRegistersAvailable:
        "Este operador no tiene cajas disponibles para operar en esta estación.",
      noSessionTitle: "Caja lista para abrir",
      noSessionDescription:
        "Elegí la caja y cargá el cambio inicial para dejar el turno operativo.",
      activeSessionTitle: "Caja abierta",
      activeSessionDescription:
        "La apertura y el cierre ya quedan atribuidos al operador con saldo esperado visible.",
      reviewRequiredTitle: "Cierre pendiente de revisión",
      reviewRequiredDescription:
        "La diferencia supera la tolerancia operativa y necesita aprobación de un rol de mayor confianza.",
      openingFloatLabel: "Cambio inicial",
      openingNotesLabel: "Notas de apertura",
      closingCountedLabel: "Total contado",
      closingNotesLabel: "Notas de cierre",
      approvalNotesLabel: "Nota de aprobación",
      expectedBalanceLabel: "Esperado",
      discrepancyLabel: "Diferencia",
      openedByLabel: "Abierta por",
      openedAtLabel: "Abierta",
      closeoutSubmittedByLabel: "Conteo cargado por",
      closeoutSubmittedAtLabel: "Solicitado",
      reviewedByLabel: "Aprobado por",
      reviewedAtLabel: "Aprobado",
      closeModalTitle: "Cerrar caja",
      closeModalDescription:
        "Ingresá el efectivo contado para comparar contra el saldo esperado.",
      reviewModalTitle: "Revisar cierre con diferencia",
      reviewModalDescription:
        "Validá el conteo cargado y decidí si corresponde aprobar el cierre o devolverlo a reconteo.",
      movementsTitle: "Movimientos del turno",
      movementsDescription:
        "Cada movimiento ajusta el saldo esperado y deja trazabilidad del operador.",
      movementsEmpty: "Todavía no hay movimientos registrados para esta sesión.",
      recordMovementAction: "Registrar movimiento",
      movementModalTitle: "Registrar movimiento de caja",
      movementModalDescription:
        "Usá este registro para ingresos, salidas, retiros a caja fuerte o ajustes manuales.",
      movementTypeLabel: "Tipo de movimiento",
      movementAmountLabel: "Monto",
      movementDirectionLabel: "Impacto del ajuste",
      movementNotesLabel: "Nota",
      movementNotesPlaceholder: "Ej. retiro para gastos menores",
      movementSaveAction: "Guardar movimiento",
      movementReadOnlyHint:
        "Tu perfil puede ver la sesión, pero no registrar movimientos manuales.",
      closeoutPendingHint:
        "El conteo quedó pendiente de revisión. No se pueden registrar más movimientos hasta resolver el cierre.",
      closeoutPendingReadOnlyHint:
        "El cierre quedó pendiente de revisión y tu perfil no puede aprobar diferencias.",
      movementErrorFallback: "No se pudo registrar el movimiento de caja.",
      movementSuccess: "Movimiento de caja registrado correctamente.",
      movementSavedOffline:
        "Movimiento de caja guardado sin conexión. Pendiente de sincronización.",
      retryOfflineSyncButton: (count: number): string =>
        `Reintentar sincronización (${count})`,
      movementTypeLabels: {
        opening_float: "Cambio inicial",
        cash_sale: "Venta en efectivo",
        debt_payment_cash: "Cobro de deuda",
        cash_paid_in: "Ingreso manual",
        cash_paid_out: "Salida manual",
        safe_drop: "Retiro a caja fuerte",
        refund_cash: "Devolución en efectivo",
        adjustment: "Ajuste manual",
      },
      movementDirectionLabels: {
        inbound: "Suma efectivo",
        outbound: "Resta efectivo",
      },
      openAction: "Abrir caja",
      closeAction: "Cerrar caja",
      approveCloseoutAction: "Aprobar cierre",
      reopenForRecountAction: "Volver a conteo",
      openingNotePlaceholder: "Ej. turno mañana",
      closingNotePlaceholder: "Ej. cierre sin novedades",
      approvalNotePlaceholder: "Ej. diferencia validada por supervisor",
      openSuccess: (registerName: string): string =>
        `Caja ${registerName} abierta correctamente.`,
      closeSuccess: (registerName: string): string =>
        `Caja ${registerName} cerrada correctamente.`,
      closeReviewRequired: (registerName: string): string =>
        `El cierre de ${registerName} quedó pendiente de aprobación por diferencia.`,
      closeApprovalSuccess: (registerName: string): string =>
        `El cierre de ${registerName} fue aprobado correctamente.`,
      closeReopenedSuccess: (registerName: string): string =>
        `La caja ${registerName} volvió a estado abierto para reconteo.`,
      loadError: "No se pudo cargar el estado de caja.",
      openErrorFallback: "No se pudo abrir la caja.",
      closeErrorFallback: "No se pudo cerrar la caja.",
      approveErrorFallback: "No se pudo aprobar el cierre de caja.",
      reopenErrorFallback: "No se pudo devolver el cierre a reconteo.",
      readOnlyHint:
        "Tu perfil puede ver el estado de la caja, pero no abrir ni cerrar sesiones.",
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
      cashRegisterRequired:
        "Primero elegí una caja con sesión abierta para registrar el efectivo.",
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
    searchPlaceholder: "Buscar por nombre, SKU o EAN",
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
      more: "Más acciones",
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
        "Pegá filas con este orden: `name, sku, categoryId, price, cost, initialStock, minStock, imageUrl, ean`.",
      productsPlaceholder:
        "name,sku,categoryId,price,cost,initialStock,minStock,imageUrl,ean\nCoca 1L,BEB-101,bebidas-gaseosas,2500,1200,18,6,https://...,7790895067570\nAlfajor,GOL-010,alfajores,1500,700,24,8,,77976307",
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
      ean: "EAN",
      noEan: "Sin EAN",
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
    cashRegisterExpectedLabel: "Caja seleccionada",
    cashRegisterContext: (registerName: string): string => `Caja activa: ${registerName}`,
    cashRegisterUnavailableHint:
      "No hay una caja activa accesible para vincular este cobro en efectivo.",
    noActiveCashRegister: "Sin caja abierta",
    pendingOrdersTitle: "Pedidos con saldo pendiente",
    orderTitle: (dateLabel: string): string => `Pedido del ${dateLabel}`,
    noPendingOrders: "Este cliente no tiene pedidos pendientes.",
    debtLedger: "Libro de deuda",
    createDebtHint:
      "Para generar deuda, hacé el checkout con el método cuenta corriente desde Caja.",
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
    subtitle:
      "Leé el período con contexto ejecutivo: ventas, rentabilidad, inventario y crédito para tomar decisiones de negocio con una sola vista.",
    periodSnapshotTitle: "Período seleccionado",
    currentStateTitle: "Estado actual del negocio",
    momentumTitle: "Ritmo y composición",
    salesCountMetric: "Ventas período",
    marginMetric: "Margen bruto",
    collectedMetric: "Cobrado período",
    averageTicketMetric: "Ticket promedio",
    currentCreditMetric: "Saldo créditos",
    stockValueMetric: "Valor de stock",
    debtorsMetric: "Deudores activos",
    openOrdersMetric: "Pedidos abiertos",
    inventoryRiskMetric: "Riesgo stock",
    dailyTrendTitle: "Evolución diaria",
    dailyTrendDescription:
      "Seguimiento diario de facturación, cobrado y saldo abierto para detectar fricción comercial o presión de crédito.",
    paymentMixTitle: "Mix de cobro",
    paymentMixDescription:
      "Cómo se reparte la facturación entre efectivo y cuenta corriente dentro del período filtrado.",
    inventoryHealthTitle: "Salud del inventario",
    inventoryHealthDescription:
      "Disponibilidad actual y alertas de stock que pueden afectar ventas o reposición.",
    executiveInsightsTitle: "Lectura rápida",
    executiveInsightsDescription:
      "Señales accionables para precio, crédito, concentración comercial y reposición.",
    recentSalesTitle: "Últimas ventas del período",
    recentSalesDescription:
      "Bajá del resumen al detalle operativo con los tickets más recientes del filtro aplicado.",
    salesHistory: "Historial de ventas",
    topProducts: "Productos más vendidos",
    topProductsDescription:
      "Productos que hoy empujan la facturación y marcan el pulso comercial del negocio.",
    noSalesInRange: "No hay ventas en el rango seleccionado.",
    noTopProducts: "Todavía no hay datos de productos más vendidos.",
    noTrendData: "Todavía no hay ventas para graficar en este período.",
    noPaymentMixData: "Todavía no hay ventas para analizar el mix de cobro.",
    noInventoryHealthData: "Todavía no hay datos de inventario para resumir.",
    noRecentSales: "Todavía no hay ventas para revisar en detalle.",
    noInsights: "Cargá ventas para generar señales ejecutivas.",
    loadSalesError: "No se pudo cargar el historial de ventas.",
    loadTopProductsError: "No se pudieron cargar los productos más vendidos.",
    loadProfitError: "No se pudo cargar el resumen de ganancia.",
    loadProductsSnapshotError: "No se pudo cargar el snapshot de productos.",
    loadReceivablesSnapshotError: "No se pudo cargar el snapshot de deudas.",
    loadReportingError: "No se pudieron cargar los datos del reporte.",
    operationalRestrictedHint:
      "Este perfil ve solo señales operativas. Margen, crédito e inventario valorizado quedan reservados para perfiles estratégicos.",
    invalidPeriodRange: "La fecha desde debe ser anterior o igual a la fecha hasta.",
    quantitySold: (count: number): string => `cantidad ${count}`,
    revenueLabel: (amount: string): string => `Facturación ${amount}`,
    customerLabel: (customerName: string): string => `Cliente ${customerName}`,
    paymentMixRevenue: (amount: string): string => `Facturación ${amount}`,
    paymentMixOrders: (count: number): string =>
      count === 1 ? "1 venta" : `${count} ventas`,
    inventoryHealthValue: (count: number): string =>
      count === 1 ? "1 producto" : `${count} productos`,
    insightCreditHealthy: (share: string, amount: string): string =>
      `${share} de la facturación del período sigue abierta en crédito (${amount}). Nivel saludable para sostener caja.`,
    insightCreditRisk: (share: string, amount: string): string =>
      `${share} de la facturación del período quedó en crédito (${amount}). Conviene revisar cobranza y límites por cliente.`,
    insightInventoryRisk: (count: number): string =>
      count === 1
        ? "Hay 1 producto en alerta de stock. Podría cortar ventas si no se repone a tiempo."
        : `Hay ${count} productos en alerta de stock. Priorizar reposición ayuda a no perder facturación.`,
    insightInventoryHealthy: "El inventario activo no muestra alertas críticas de stock en este momento.",
    insightTopProductConcentration: (productName: string, share: string): string =>
      `${productName} explica ${share} de la facturación del período. Revisá dependencia comercial y margen real.`,
    insightTopProductDiversified: (productName: string, share: string): string =>
      `${productName} lidera con ${share} de la facturación del período. La mezcla comercial sigue diversificada.`,
    trendLegendRevenue: "Facturación",
    trendLegendCollected: "Cobrado",
    trendLegendOutstanding: "Pendiente",
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
