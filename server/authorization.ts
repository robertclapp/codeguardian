/**
 * Authorization utilities for resource access control
 * Implements role-based and ownership-based authorization
 */

import { TRPCError } from "@trpc/server";
import type { User } from "../drizzle/schema";
import { ErrorMessages } from "./errors";

/**
 * Check if user is an admin
 */
export function isAdmin(user: User): boolean {
  return user.role === "admin";
}

/**
 * Check if user owns a resource or is an admin
 */
export function canAccessResource(user: User, resourceOwnerId: number): boolean {
  return user.id === resourceOwnerId || isAdmin(user);
}

/**
 * Throw error if user is not authorized
 */
export function requireAuthorization(
  user: User,
  resourceOwnerId: number,
  resourceType: string = "resource"
): void {
  if (!canAccessResource(user, resourceOwnerId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You don't have permission to access this ${resourceType}`,
    });
  }
}

/**
 * Throw error if user is not an admin
 */
export function requireAdmin(user: User): void {
  if (!isAdmin(user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: ErrorMessages.AUTH.FORBIDDEN,
    });
  }
}

/**
 * Check if user can modify a resource
 * More restrictive than read access - only owner or admin
 */
export function canModifyResource(user: User, resourceOwnerId: number): boolean {
  return user.id === resourceOwnerId || isAdmin(user);
}

/**
 * Throw error if user cannot modify resource
 */
export function requireModifyPermission(
  user: User,
  resourceOwnerId: number,
  resourceType: string = "resource"
): void {
  if (!canModifyResource(user, resourceOwnerId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You don't have permission to modify this ${resourceType}`,
    });
  }
}

/**
 * Check if user can delete a resource
 * Same as modify for now, but separated for future fine-grained control
 */
export function canDeleteResource(user: User, resourceOwnerId: number): boolean {
  return user.id === resourceOwnerId || isAdmin(user);
}

/**
 * Throw error if user cannot delete resource
 */
export function requireDeletePermission(
  user: User,
  resourceOwnerId: number,
  resourceType: string = "resource"
): void {
  if (!canDeleteResource(user, resourceOwnerId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You don't have permission to delete this ${resourceType}`,
    });
  }
}

/**
 * Filter list of resources to only those user can access
 * Useful for list endpoints
 */
export function filterAccessibleResources<T extends { createdBy?: number | null }>(
  user: User,
  resources: T[]
): T[] {
  if (isAdmin(user)) {
    return resources;
  }
  return resources.filter((resource) => resource.createdBy === user.id);
}
