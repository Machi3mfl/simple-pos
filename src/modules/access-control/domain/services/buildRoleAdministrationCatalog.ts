import type {
  AccessPermissionDefinition,
  PermissionGroupDefinition,
} from "../types/RoleAdministration";

interface PermissionGroupMetadata {
  readonly code: string;
  readonly label: string;
  readonly description: string;
}

const permissionGroupMetadataByCode: Record<string, PermissionGroupMetadata> = {
  checkout: {
    code: "checkout",
    label: "Caja y cobro",
    description: "Permite vender y operar el flujo principal de cobro.",
  },
  cash_session: {
    code: "cash_session",
    label: "Sesiones de caja",
    description: "Controla apertura, cierre y aprobación de discrepancias.",
  },
  cash_movements: {
    code: "cash_movements",
    label: "Movimientos manuales",
    description: "Habilita ingresos, egresos y retiros manuales de caja.",
  },
  sales_history: {
    code: "sales_history",
    label: "Ventas",
    description: "Define si el rol puede consultar historial y detalle de ventas.",
  },
  receivables: {
    code: "receivables",
    label: "Deudas",
    description: "Define acceso a cartera, pagos y notas sensibles.",
  },
  products: {
    code: "products",
    label: "Productos",
    description: "Habilita catálogo, sourcing y gestión del workspace de productos.",
  },
  inventory: {
    code: "inventory",
    label: "Inventario",
    description: "Controla ajustes, cargas masivas y datos de costo/valor.",
  },
  reporting: {
    code: "reporting",
    label: "Reportes",
    description: "Determina acceso a señales operativas y métricas estratégicas.",
  },
  sync: {
    code: "sync",
    label: "Sincronización",
    description: "Expone la cola offline y herramientas de sincronización.",
  },
  user_admin: {
    code: "user_admin",
    label: "Usuarios",
    description: "Gestiona usuarios y sus asignaciones de roles.",
  },
  role_admin: {
    code: "role_admin",
    label: "Roles",
    description: "Permite crear, editar, clonar y asignar bundles de permisos.",
  },
  audit: {
    code: "audit",
    label: "Auditoría",
    description: "Habilita metadata de auditoría y trazabilidad sensible.",
  },
  support: {
    code: "support",
    label: "Soporte técnico",
    description: "Herramientas internas de soporte, fuera del flujo comercial.",
  },
  other: {
    code: "other",
    label: "Otros",
    description: "Permisos sin agrupar todavía dentro del catálogo.",
  },
};

const permissionGroupOrder = [
  "checkout",
  "cash_session",
  "cash_movements",
  "sales_history",
  "receivables",
  "products",
  "inventory",
  "reporting",
  "sync",
  "user_admin",
  "role_admin",
  "audit",
  "support",
  "other",
] as const;

export const selfLockoutProtectionPermissions = [
  "roles.assign",
  "roles.manage",
] as const;

function resolvePermissionGroupCode(permissionCode: string): string {
  if (permissionCode.startsWith("checkout.")) {
    return "checkout";
  }

  if (permissionCode.startsWith("cash.session.")) {
    return "cash_session";
  }

  if (permissionCode.startsWith("cash.movement.")) {
    return "cash_movements";
  }

  if (permissionCode.startsWith("sales_history.")) {
    return "sales_history";
  }

  if (permissionCode.startsWith("receivables.")) {
    return "receivables";
  }

  if (permissionCode.startsWith("products.")) {
    return "products";
  }

  if (permissionCode.startsWith("inventory.")) {
    return "inventory";
  }

  if (permissionCode.startsWith("reporting.")) {
    return "reporting";
  }

  if (permissionCode.startsWith("sync.")) {
    return "sync";
  }

  if (permissionCode.startsWith("users.")) {
    return "user_admin";
  }

  if (permissionCode.startsWith("roles.")) {
    return "role_admin";
  }

  if (permissionCode.startsWith("audit.")) {
    return "audit";
  }

  if (permissionCode.startsWith("system.")) {
    return "support";
  }

  return "other";
}

export function buildRoleAdministrationPermissions(
  permissions: readonly {
    readonly id: string;
    readonly code: string;
    readonly name: string;
  }[],
): readonly AccessPermissionDefinition[] {
  return [...permissions]
    .map((permission) => {
      const groupCode = resolvePermissionGroupCode(permission.code);
      const groupMetadata =
        permissionGroupMetadataByCode[groupCode] ?? permissionGroupMetadataByCode.other;

      return {
        id: permission.id,
        code: permission.code,
        name: permission.name,
        groupCode: groupMetadata.code,
        groupLabel: groupMetadata.label,
        groupDescription: groupMetadata.description,
      };
    })
    .sort((left, right) => {
      const leftGroupIndex = permissionGroupOrder.indexOf(left.groupCode as never);
      const rightGroupIndex = permissionGroupOrder.indexOf(right.groupCode as never);
      if (leftGroupIndex !== rightGroupIndex) {
        return leftGroupIndex - rightGroupIndex;
      }

      return left.name.localeCompare(right.name, "es");
    });
}

export function buildRoleAdministrationPermissionGroups(
  permissions: readonly AccessPermissionDefinition[],
): readonly PermissionGroupDefinition[] {
  const permissionCodesByGroup = new Map<string, string[]>();

  for (const permission of permissions) {
    const currentCodes = permissionCodesByGroup.get(permission.groupCode) ?? [];
    currentCodes.push(permission.code);
    permissionCodesByGroup.set(permission.groupCode, currentCodes);
  }

  const groups: PermissionGroupDefinition[] = [];

  for (const groupCode of permissionGroupOrder) {
    const metadata = permissionGroupMetadataByCode[groupCode];
    const permissionCodes = permissionCodesByGroup.get(groupCode) ?? [];
    if (permissionCodes.length === 0) {
      continue;
    }

    groups.push({
      code: metadata.code,
      label: metadata.label,
      description: metadata.description,
      permissionCodes: [...permissionCodes].sort((left, right) =>
        left.localeCompare(right, "es"),
      ),
    });
  }

  return groups;
}

export function hasSelfLockoutProtectionPermission(
  permissionCodes: readonly string[],
): boolean {
  return selfLockoutProtectionPermissions.some((permissionCode) =>
    permissionCodes.includes(permissionCode),
  );
}
