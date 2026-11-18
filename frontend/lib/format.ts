export function formatRupiah(amount: string | number): string {
  const numericAmount =
    typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

const wibDateFormat = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const wibTimeFormat = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export function formatDateWIB(isoString: string): string {
  return wibDateFormat.format(new Date(isoString));
}

export function formatTimeWIB(isoString: string): string {
  return `${wibTimeFormat.format(new Date(isoString)).replace(":", ".")} WIB`;
}

export function formatTimeRangeWIB(startIso: string, endIso: string): string {
  const start = wibTimeFormat.format(new Date(startIso)).replace(":", ".");
  const end = wibTimeFormat.format(new Date(endIso)).replace(":", ".");
  return `${start} - ${end} WIB`;
}
