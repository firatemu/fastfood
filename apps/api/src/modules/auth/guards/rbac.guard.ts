import { ErrorCodes } from '@fastfood/contracts';
import {
  ADMIN_PAGE_SUPPORTED_ACTIONS,
  adminPagePermission,
  type AdminPageAction,
  type AdminPageKey,
  type PermissionCode,
} from '@fastfood/domain-types';
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';

import { PERMISSIONS_METADATA_KEY } from '../decorators/require-permissions.decorator.js';

import type { AuthenticatedPrincipal } from './authenticated-principal.js';

/**
 * Canonical `RbacGuard` — document 39 §3 "RbacGuard".
 *
 * Reads `@RequirePermissions('orders.read', 'orders.update_status', …)`
 * metadata and checks the `permissions` snapshot on the principal.
 *
 * The canonical permission codes are the dotted-lower-case strings
 * from `@fastfood/domain-types` (`catalog.products.read`, etc.). No
 * inline permission string literals in feature code.
 *
 * The guard is fail-closed: when permissions are missing from the
 * principal it rejects with `AUTH_PERMISSION_DENIED`.
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[] | undefined>(
      PERMISSIONS_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest<
      FastifyRequest & {
        principal?: AuthenticatedPrincipal;
        routeOptions?: { url?: string };
      }
    >();
    const principal = request.principal;
    const routePath = request.routeOptions?.url ?? request.url;
    const adminRoute = isAdminPageRoute(routePath);
    if (!required?.length && !adminRoute) return true;
    if (!principal) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_PERMISSION_DENIED,
        message: 'No principal available for permission check.',
      });
    }
    if (principal.actorType === 'STAFF' && principal.isSuperAdmin) return true;
    const pagePermissions = resolveAdminPagePermissions(routePath, request.method);
    if (adminRoute && !pagePermissions) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_PERMISSION_DENIED,
        message: 'This admin endpoint has no registered page permission.',
      });
    }
    if (pagePermissions && !pagePermissions.some((code) => principal.permissions.has(code))) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_PERMISSION_DENIED,
        message: `Missing one of the page permissions: ${pagePermissions.join(', ')}`,
      });
    }
    for (const code of required ?? []) {
      if (!principal.permissions.has(code)) {
        throw new ForbiddenException({
          code: ErrorCodes.AUTH_PERMISSION_DENIED,
          message: `Missing permission: ${code}`,
        });
      }
    }
    return true;
  }
}

function isAdminPageRoute(path: string): boolean {
  return /(?:^|\/)admin(?:\/|$)/.test(path.split('?')[0] ?? '');
}

function resolveAdminPagePermissions(path: string, method: string): PermissionCode[] | null {
  const normalized = path.split('?')[0] ?? '';
  const adminPath = normalized.slice(normalized.indexOf('/admin'));
  if (!adminPath.startsWith('/admin/')) return null;
  const page: AdminPageKey | null = /^\/admin\/(?:orders|kitchen)(?:\/|$)/.test(adminPath)
    ? adminPath.startsWith('/admin/kitchen')
      ? 'kitchen'
      : 'orders'
    : /^\/admin\/couriers?(?:\/|$)/.test(adminPath)
      ? 'couriers'
      : /^\/admin\/categories(?:\/|$)/.test(adminPath)
        ? 'categories'
        : /^\/admin\/(?:modifier-groups|modifiers)(?:\/|$)/.test(adminPath)
          ? 'modifiers'
          : /^\/admin\/allergens(?:\/|$)/.test(adminPath)
            ? 'allergens'
            : /^\/admin\/products\/[^/]+\/media(?:\/|$)/.test(adminPath)
              ? 'media'
              : /^\/admin\/(?:products|home-slides)(?:\/|$)/.test(adminPath)
                ? 'products'
                : /^\/admin\/branches\/[^/]+\/service-areas(?:\/|$)/.test(adminPath)
                  ? 'service-areas'
                  : /^\/admin\/branches\/[^/]+\/product-availability(?:\/|$)/.test(adminPath)
                    ? 'availability'
                    : /^\/admin\/branches(?:\/|$)/.test(adminPath)
                      ? 'branch-list'
                      : /^\/admin\/customers\/[^/]+\/club(?:\/|$)/.test(adminPath)
                        ? 'loyalty'
                        : /^\/admin\/customers(?:\/|$)/.test(adminPath)
                          ? 'customer-list'
                          : /^\/admin\/promotions(?:\/|$)/.test(adminPath)
                            ? 'promotions'
                            : /^\/admin\/payments\/[^/]+\/refunds(?:\/|$)/.test(adminPath) ||
                                /^\/admin\/refunds(?:\/|$)/.test(adminPath)
                              ? 'refunds'
                              : /^\/admin\/payments(?:\/|$)/.test(adminPath)
                                ? 'payments'
                                : /^\/admin\/reports(?:\/|$)/.test(adminPath)
                                  ? 'reports'
                                  : /^\/admin\/users(?:\/|$)/.test(adminPath)
                                    ? 'users'
                                    : /^\/admin\/roles(?:\/|$)/.test(adminPath)
                                      ? 'roles'
                                      : /^\/admin\/permissions(?:\/|$)/.test(adminPath)
                                        ? 'roles'
                                        : /^\/admin\/audit(?:\/|$)/.test(adminPath)
                                          ? 'audit'
                                          : /^\/admin\/settings(?:\/|$)/.test(adminPath)
                                            ? 'settings'
                                            : null;
  if (!page) return null;
  const upperMethod = method.toUpperCase();
  let action: AdminPageAction;
  if (upperMethod === 'GET' || upperMethod === 'HEAD') {
    action = 'view';
  } else if (upperMethod === 'DELETE' && /\/admin\/users\/[^/]+\/roles\/[^/]+$/.test(adminPath)) {
    action = 'update';
  } else if (upperMethod === 'DELETE') {
    action = 'delete';
  } else if (
    upperMethod === 'POST' &&
    (/\/admin\/(?:users|branches|categories|products|allergens|modifier-groups|modifiers|promotions|couriers|deliveries)\/?$/.test(
      adminPath,
    ) ||
      /\/admin\/payments\/[^/]+\/refunds\/?$/.test(adminPath) ||
      /\/admin\/branches\/[^/]+\/service-areas\/?$/.test(adminPath) ||
      /\/admin\/products\/[^/]+\/media(?:\/upload)?\/?$/.test(adminPath))
  ) {
    action = 'create';
  } else {
    action = 'update';
  }
  if (!ADMIN_PAGE_SUPPORTED_ACTIONS[page].includes(action)) return null;
  const permissions = [adminPagePermission(page, action)];
  const userRoleAssignmentRoute =
    /^\/admin\/users\/[^/]+\/roles(?:\/[^/]+)?$/.test(adminPath) &&
    ['POST', 'DELETE'].includes(upperMethod);
  const roleMetadataRoute =
    /^\/admin\/(?:roles|permissions)(?:\/|$)/.test(adminPath) &&
    ['GET', 'HEAD'].includes(upperMethod);
  const userListForRoleAssignmentRoute =
    /^\/admin\/users\/?$/.test(adminPath) && ['GET', 'HEAD'].includes(upperMethod);
  if (userRoleAssignmentRoute) permissions.push(adminPagePermission('roles', 'update'));
  if (roleMetadataRoute) permissions.push(adminPagePermission('users', 'view'));
  if (userListForRoleAssignmentRoute) permissions.push(adminPagePermission('roles', 'update'));
  return permissions;
}
