type AddressLike = {
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export type StaffLocationAddress = {
  street1: string | null;
  street2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
};

function cleanAddressPart(value: string | null | undefined) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function normalizeAddressLocation(
  address: AddressLike | null | undefined,
): StaffLocationAddress | null {
  if (!address) return null;

  const normalized = {
    street1: cleanAddressPart(address.street1),
    street2: cleanAddressPart(address.street2),
    city: cleanAddressPart(address.city),
    province: cleanAddressPart(address.province),
    postalCode: cleanAddressPart(address.postalCode),
    country: cleanAddressPart(address.country),
  };

  return Object.values(normalized).some((part) => part !== null)
    ? normalized
    : null;
}
