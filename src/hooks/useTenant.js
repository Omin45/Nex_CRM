/**
 * NexERP — useTenant
 * ---------------------------------------------------------------------------
 * Multi-tenant context wrapper. Every query is implicitly scoped to the active
 * vendor, so this hook exposes the tenant record plus the derived values the
 * UI needs constantly: base currency, timezone, locale and plan limits.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setTenant } from '@/features/auth/slices/authSlice';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/config/currencies.config';
import { DEFAULT_TIMEZONE } from '@/utils/date';

export function useTenant() {
  const dispatch = useDispatch();
  const tenant = useSelector((state) => state.auth.tenant);
  const fallbackVendorId = useSelector((state) => state.auth.user?.vendorId ?? null);

  const currency = tenant?.currency ?? DEFAULT_CURRENCY;
  const currencyMeta = CURRENCIES[currency] ?? CURRENCIES[DEFAULT_CURRENCY];
  const timezone = tenant?.timezone ?? DEFAULT_TIMEZONE;

  /**
   * Switches the active tenant. The backend re-scopes the session on the next
   * request via the X-Vendor-Id header (set in services/api.js), so a reload of
   * the affected tags is triggered here.
   */
  const switchTenant = useCallback(
    (nextTenant) => {
      dispatch(setTenant(nextTenant));
    },
    [dispatch],
  );

  /** Seat usage, for the settings page gauge. Returns null without a plan. */
  const seatUsage = useMemo(() => {
    if (!tenant?.seats?.total) return null;
    const { used, total } = tenant.seats;
    return { used, total, remaining: total - used, percent: (used / total) * 100 };
  }, [tenant]);

  return useMemo(
    () => ({
      tenant,
      vendorId: tenant?.id ?? fallbackVendorId,
      tenantName: tenant?.name ?? 'Unassigned tenant',
      shortName: tenant?.shortName ?? 'NexERP',
      country: tenant?.country ?? 'NG',
      plan: tenant?.plan ?? 'STARTER',
      currency,
      currencyMeta,
      currencySymbol: currencyMeta.symbol,
      timezone,
      locale: currencyMeta.locale,
      seatUsage,
      switchTenant,
      isProvisioned: Boolean(tenant?.id),
    }),
    [tenant, fallbackVendorId, currency, currencyMeta, timezone, seatUsage, switchTenant],
  );
}

export default useTenant;
