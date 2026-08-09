/**
 * Calculates the implied expiry date of a legal document based on
 * its template type and user-provided variables.
 */
export const computeExpiryDate = (
  templateId: string,
  variables: Record<string, string>
): Date | null => {
  try {
    // 1. Check direct Expiry_Date or End_Date variables
    const directDateStr = variables.Expiry_Date || variables.End_Date || variables.Lease_End_Date;
    if (directDateStr) {
      const parsed = new Date(directDateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    // 2. Real Estate / Lease: Lease_Start_Date + Lease_Term_Months
    const leaseStartStr = variables.Lease_Start_Date || variables.Start_Date || variables.Commencement_Date;
    const leaseMonthsStr = variables.Lease_Term_Months || variables.Term_Months || variables.Duration_Months;
    if (leaseStartStr && leaseMonthsStr) {
      const startDate = new Date(leaseStartStr);
      const months = parseInt(leaseMonthsStr, 10);
      if (!isNaN(startDate.getTime()) && !isNaN(months) && months > 0) {
        const expiry = new Date(startDate);
        expiry.setMonth(expiry.getMonth() + months);
        return expiry;
      }
    }

    // 3. IP / NDA / Tech: Effective_Date + Confidentiality_Years / Term_Years
    const effDateStr = variables.Effective_Date || variables.Agreement_Date || variables.Start_Date;
    const yearsStr = variables.Confidentiality_Years || variables.Term_Years || variables.Duration_Years || variables.Validity_Years;
    if (effDateStr && yearsStr) {
      const effDate = new Date(effDateStr);
      const years = parseInt(yearsStr, 10);
      if (!isNaN(effDate.getTime()) && !isNaN(years) && years > 0) {
        const expiry = new Date(effDate);
        expiry.setFullYear(expiry.getFullYear() + years);
        return expiry;
      }
    }

    // 4. Default fallback: if template is known NDA and has Confidentiality_Years
    if (templateId === 'tpl_nda') {
      const years = parseInt(variables.Confidentiality_Years || '3', 10);
      const baseDate = variables.Effective_Date ? new Date(variables.Effective_Date) : new Date();
      if (!isNaN(baseDate.getTime())) {
        const expiry = new Date(baseDate);
        expiry.setFullYear(expiry.getFullYear() + (isNaN(years) ? 3 : years));
        return expiry;
      }
    }

    // 5. Default fallback: if template is known Rental and has Lease_Term_Months
    if (templateId === 'tpl_rental') {
      const months = parseInt(variables.Lease_Term_Months || '11', 10);
      const baseDate = variables.Lease_Start_Date ? new Date(variables.Lease_Start_Date) : new Date();
      if (!isNaN(baseDate.getTime())) {
        const expiry = new Date(baseDate);
        expiry.setMonth(expiry.getMonth() + (isNaN(months) ? 11 : months));
        return expiry;
      }
    }
  } catch (err) {
    console.error('Error calculating document expiry date:', err);
  }

  return null;
};

/**
 * Computes expiry details relative to current timestamp
 */
export const getExpiryStatus = (expiryDate: Date | null) => {
  if (!expiryDate) {
    return {
      hasExpiry: false,
      isExpired: false,
      daysRemaining: null,
      isExpiringSoon30: false,
      isExpiringSoon7: false
    };
  }

  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining <= 0;
  const isExpiringSoon30 = !isExpired && daysRemaining <= 30;
  const isExpiringSoon7 = !isExpired && daysRemaining <= 7;

  return {
    hasExpiry: true,
    isExpired,
    daysRemaining,
    isExpiringSoon30,
    isExpiringSoon7
  };
};
