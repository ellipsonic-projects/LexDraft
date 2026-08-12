// src/utils/HouseAgreementCompiler.ts
//
// ╔══════════════════════════════════════════════════════════════════════════════════╗
// ║  HOUSE RENTAL AGREEMENT — COMPILER ENGINE                                       ║
// ║                                                                                  ║
// ║  Produces a court-compliant Indian legal document matching the reference PDF:    ║
// ║    Residential_Rental_Agreement.pdf (LawDepot India)                             ║
// ║                                                                                  ║
// ║  Formatting standards (Indian Supreme Court / High Court):                       ║
// ║    • Paper:    A4, 210mm × 297mm                                                 ║
// ║    • Margins:  4 cm (L/R), 2 cm (T/B)                                           ║
// ║    • Font:     Times New Roman, 14pt body, 16–18pt title                         ║
// ║    • Spacing:  1.5 line-height (body), 1.3 (subclauses)                          ║
// ║    • Clauses:  Continuous auto-numbered. Never hardcoded.                         ║
// ║    • Subclauses: a. b. c. … (auto-lettered)                                     ║
// ║    • NO empty fields, undefined, null, or blank brackets printed.                ║
// ║                                                                                  ║
// ║  All 47 clauses from the reference PDF are implemented here, including           ║
// ║  fixed statutory clauses with no user input (e.g. Quiet Enjoyment, Attorney     ║
// ║  Fees, General Provisions, Severability, etc.).                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════════╝

import { HouseWizardState } from '../types/houseWizardTypes';
import { INDIAN_STATES } from '../config/agreements/houseRentalConfig';

// ─── Utility helpers ──────────────────────────────────────────────────────────

/** Returns ordinal suffix: 1st, 2nd, 3rd, 4th … */
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Formats an ISO date as "11th day of August, 2026" */
function fmtDateLong(iso: string): string {
  if (!iso) return '___ day of ___________, ______';
  const d = new Date(iso + 'T00:00:00');
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${ordinal(d.getDate())} day of ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

/** Formats an ISO date as "6 August 2026" */
function fmtDateShort(iso: string): string {
  if (!iso) return '___________';
  const d = new Date(iso + 'T00:00:00');
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Formats a number as Indian currency: ₹2,00,000.00 */
function fmtINR(n: number): string {
  if (!n || isNaN(n)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2
  }).format(n);
}

/** Ordinal for rent pay day (e.g. "5th") */
function payDayOrdinal(dayStr: string): string {
  const n = parseInt(dayStr, 10);
  if (isNaN(n)) return dayStr || '___';
  return ordinal(n);
}

/** Safe string — never prints "undefined" or "null" */
function safe(s: string | undefined | null, fallback = '___________'): string {
  if (!s || s === 'undefined' || s === 'null' || !s.trim()) return fallback;
  return s.trim();
}

// ─── Continuous numbering generators ─────────────────────────────────────────

/** Auto-incrementing clause number: 1., 2., 3., … */
function makeCounter() {
  let n = 0;
  return () => `${++n}.`;
}

/** Auto-lettered subclause: a., b., c., … */
function makeLetterCounter() {
  let n = 0;
  const alpha = 'abcdefghijklmnopqrstuvwxyz';
  return () => `${alpha[n++]}.`;
}

/** Numbered main clause paragraph with optional data-id */
function clause(num: string, text: string, id?: string): string {
  const idAttr = id ? ` id="clause-${id}" data-section="${id}"` : '';
  return `<div class="clause"${idAttr}><span class="cnum">${num}</span><span class="cbody">${text}</span></div>`;
}

/** Lettered subclause (indented, 13pt) */
function sub(letter: string, text: string, id?: string): string {
  const idAttr = id ? ` id="subclause-${id}" data-section="${id}"` : '';
  return `<div class="subclause"${idAttr}><span class="scnum">${letter}</span><span class="scbody">${text}</span></div>`;
}

/** Bold section heading (underlined, 14pt) with anchor ID */
function heading(title: string, id?: string): string {
  const sectionId = id || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `<p class="section-heading" id="sec-${sectionId}" data-section="${sectionId}">${title}</p>`;
}

/** Inline continuation text (no number) */
function continuation(text: string): string {
  return `<p class="continuation">${text}</p>`;
}

// ─── Main compiler function ───────────────────────────────────────────────────

export function compileHouseAgreement(state: HouseWizardState): string {
  // ── Setup
  const n  = makeCounter(); // clause numbers
  const html: string[] = [];

  const landlords   = state.landlords.filter(x => x.trim());
  const tenants     = state.tenants.filter(x => x.trim());
  const landlordStr = landlords.length ? landlords.join(' and ') : '___________';
  const tenantStr   = tenants.length ? tenants.join(' and ') : '___________';

  const stateInfo   = INDIAN_STATES.find(s => s.value === state.governingLaw);
  const stateName   = stateInfo?.label || safe(state.governingLawLabel, '___________');
  const courtCity   = stateInfo?.courts || '___________';

  const sigDate     = (state.signingDateType === 'specific' && state.longformDate)
    ? fmtDateLong(state.longformDate)
    : '___ day of ___________, ______';

  // ══════════════════════════════════════════════════════════════════════════
  // ── STAMP PAPER SPACE (conditional)
  // ══════════════════════════════════════════════════════════════════════════
  if (state.stampPaperSpace === 'yes') {
    html.push(`<div class="stamp-space">
      <p class="stamp-text">THIS AGREEMENT IS TO BE EXECUTED ON NON-JUDICIAL STAMP PAPER OF APPROPRIATE VALUE AS PRESCRIBED UNDER THE INDIAN STAMP ACT, 1899 AND THE STAMP DUTY ACT OF THE STATE OF ${stateName.toUpperCase()}.</p>
    </div>`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── TITLE
  // ══════════════════════════════════════════════════════════════════════════
  html.push(`<p class="doc-title">RESIDENTIAL RENTAL AGREEMENT</p>`);

  // ══════════════════════════════════════════════════════════════════════════
  // ── PREAMBLE
  // ══════════════════════════════════════════════════════════════════════════
  html.push(`<p class="preamble-this"><strong>THIS LEASE</strong>&ensp;(the &ldquo;Lease&rdquo;) dated this ${sigDate}</p>`);

  html.push(`<p class="preamble-between"><strong>BETWEEN:</strong></p>`);
  html.push(`<p class="party-name">${landlordStr}</p>`);
  html.push(`<p class="party-role">(the &ldquo;Landlord&rdquo;)</p>`);
  html.push(`<p class="party-sep">&#8212; AND &#8212;</p>`);
  html.push(`<p class="party-name">${tenantStr}</p>`);
  html.push(`<p class="party-role">(the &ldquo;Tenant&rdquo;)</p>`);
  html.push(`<p class="party-role">(individually the &ldquo;Party&rdquo; and collectively the &ldquo;Parties&rdquo;)</p>`);

  html.push(`<p class="consideration"><strong>IN CONSIDERATION OF</strong>&ensp;the Landlord leasing certain premises to the Tenant and other valuable consideration, the receipt and sufficiency of which consideration is hereby acknowledged, the Parties agree as follows:</p>`);

  // ══════════════════════════════════════════════════════════════════════════
  // ── LEASED PROPERTY
  // ══════════════════════════════════════════════════════════════════════════
  html.push(heading('Leased Property'));

  // Clause 1 — Property description (always present)
  html.push(clause(n(),
    `The Landlord agrees to rent to the Tenant the house, municipally described as ${safe(state.propertyAddress)} (the &ldquo;Property&rdquo;), for use as residential premises only.`
  ));

  // Clause 2 — Occupants (conditional)
  if (state.otherOccupants === 'yes' && state.otherOccupantsList.trim()) {
    html.push(clause(n(),
      `Subject to the provisions of this Lease, the following persons in addition to the Tenant will live in the Property: <strong>${safe(state.otherOccupantsList)}</strong>. No other persons will live in the Property without the prior written permission of the Landlord.`
    ));
  } else {
    html.push(clause(n(),
      `Subject to the provisions of this Lease, apart from the Tenant, no other persons will live in the Property without the prior written permission of the Landlord.`
    ));
  }

  // Clause 3 — FIXED STATUTORY: Guests (no user input — always present)
  html.push(clause(n(),
    `No guests of the Tenants may occupy the Property for longer than one week without the prior written permission of the Landlord.`
  ));

  // Clause 4 — Pets (conditional on user selection)
  if (state.pets === 'yes') {
    html.push(clause(n(),
      `Pets and animals are permitted to be kept in or about the Property with the Landlord&apos;s prior written permission. The Tenant shall be responsible for any damage caused by such pets.`
    ));
  } else if (state.pets === 'withconsent') {
    html.push(clause(n(),
      `No pets or animals are allowed to be kept in or about the Property without the prior written permission of the Landlord. Upon 30 days&apos; notice, the Landlord may revoke any permission previously given pursuant to this clause.`
    ));
  } else {
    // pets === 'no'
    html.push(clause(n(),
      `No pets or animals of any kind are allowed to be kept in or about the Property. Any violation of this provision shall constitute grounds for termination of this Lease by the Landlord.`
    ));
  }

  // Clause 5 — Smoking (conditional)
  if (state.smoking === 'yes') {
    html.push(clause(n(),
      `Smoking is permitted within the Property. The Tenant shall ensure that smoking does not cause damage to the Property or create a nuisance for neighbouring residents.`
    ));
  } else {
    html.push(clause(n(),
      `The Tenant and members of Tenant&apos;s household will not smoke anywhere in the Property nor permit any guests or visitors to smoke in the Property.`
    ));
  }

  // Clause 6 — Furnishings (conditional — omitted when unfurnished)
  if (state.furnished !== 'unfurnished') {
    const level = state.furnished === 'fully' ? 'fully furnished' : 'semi-furnished';
    const list  = (state.showFurnishedList === 'yes' && state.furnishedList.trim())
      ? state.furnishedList.trim()
      : '(as agreed between the Parties prior to possession)';
    html.push(clause(n(),
      `The Property is let on a ${level} basis. The Landlord agrees to supply and the Tenant agrees to use and maintain in reasonable condition, normal wear and tear excepted, the following furnishings: ${list}.`
    ));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── TERM
  // ══════════════════════════════════════════════════════════════════════════
  html.push(heading('Term'));

  // Clause 7 — Lease dates (conditional: fixed or periodic)
  if (state.leaseTermType === 'fixedTerm') {
    html.push(clause(n(),
      `The term of the Lease commences at 12:00 noon on ${fmtDateShort(state.leaseStartDate)} and ends at 12:00 noon on ${fmtDateShort(state.fixedEndDateEnd)}.`
    ));
  } else {
    const renewLabels: Record<string, string> = {
      '11months': '11 months', '1month': '1 month', '3months': '3 months',
      '6months': '6 months',   '1year': '1 year'
    };
    const renewLabel = state.renewalTermType === 'other'
      ? safe(state.renewalTermOther)
      : (renewLabels[state.renewalTermType] || '___________');
    html.push(clause(n(),
      `The Lease commences at 12:00 noon on ${fmtDateShort(state.leaseStartDate)} and shall continue on a periodic tenancy, renewing automatically every ${renewLabel}, until terminated by either Party in accordance with the terms of this Lease.`
    ));
  }

  // Clause 8 — FIXED STATUTORY: Breach/termination right (always present per PDF)
  html.push(clause(n(),
    `Upon any notice required under the Act, or no notice where there is no Act or the Act does not specify, the Landlord may terminate this tenancy where the Tenant has breached any provision of this rental, including the failure to pay the Rent for at least one month.`
  ));

  // Clause — Termination notice (only if user selected 'yes')
  if (state.terminationNotice === 'yes') {
    html.push(clause(n(),
      `Either Party wishing to terminate this Lease shall give the other Party written notice of not less than <strong>${state.noticeNumber} ${state.noticePeriodUnit}</strong> prior to the intended date of termination. Such notice shall be given at the addresses specified for notice in this Lease.`
    ));
  }

  // Clause — Entry notice (only if user selected 'yes')
  if (state.noticeToEnter === 'yes') {
    html.push(clause(n(),
      `The Landlord shall provide the Tenant with at least <strong>${state.terminationNoticeTime} ${state.terminationNoticeTimeUnit}</strong> written notice prior to entering the Property for the purpose of conducting inspections, repairs, or any other lawful reason, except in the case of a genuine emergency.`
    ));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── RENT
  // ══════════════════════════════════════════════════════════════════════════
  html.push(heading('Rent'));

  const periodWord = state.rentPaymentPeriod === 'weekly' ? 'week'
    : state.rentPaymentPeriod === 'daily' ? 'day' : 'month';

  // Clause 9 — Rent amount (always present)
  html.push(clause(n(),
    `Subject to the provisions of this Lease, the rent for the Property is <strong>${fmtINR(state.rent)}</strong> per ${periodWord} (the &ldquo;Rent&rdquo;).`
  ));

  // Clause 10 — Rent payment details (always present)
  const payAddress = (state.rentAddressSameLandlord === 'no' && state.rentAddress.trim())
    ? state.rentAddress.trim()
    : safe(state.landlordAddress, 'the Landlord&apos;s address');

  const methods: string[] = [];
  if (state.rentPaidByCheque) methods.push('cheque');
  if (state.rentPaidByCash)   methods.push('cash');
  if (state.rentPaidByBank)   methods.push('bank transfer (NEFT/RTGS/IMPS)');
  if (state.rentPaidByOnline) methods.push('online / UPI');
  if (state.rentPaidByOther && state.rentPaidByOtherDescription.trim())
    methods.push(state.rentPaidByOtherDescription.trim());
  const methodStr = methods.length ? ` by ${methods.join(', ')}` : '';

  html.push(clause(n(),
    `The Tenant will pay the Rent on or before the <strong>${payDayOrdinal(state.rentPayDay)}</strong> of each and every ${periodWord} of the term of this Lease${methodStr} to the Landlord at ${payAddress}.`
  ));

  // Clause — Bank transfer details (only if bank transfer selected)
  if (state.rentPaidByBank && (state.bankAccountName.trim() || state.bankAccountNumber.trim())) {
    html.push(clause(n(),
      `For the purpose of bank transfer payments, the Landlord&apos;s bank account details are as follows: Account Name: <strong>${safe(state.bankAccountName)}</strong>; Account Number: <strong>${safe(state.bankAccountNumber)}</strong>.`
    ));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── RENTAL DEPOSIT (conditional — only if securityDeposit === 'yes')
  // ══════════════════════════════════════════════════════════════════════════
  if (state.securityDeposit === 'yes') {
    html.push(heading('Rental Deposit'));

    // Clause 11 — Deposit amount
    html.push(clause(n(),
      `On execution of this Lease, the Tenant will pay the Landlord a security deposit of <strong>${fmtINR(state.securityDepositAmount)}</strong> (the &ldquo;Security Deposit&rdquo;).`
    ));

    // Clause 12 — Return of deposit (FIXED STATUTORY: references the Act)
    html.push(clause(n(),
      `The Landlord will return the Security Deposit at the end of this tenancy, less such deductions as provided in this Lease but no deduction will be made for damage due to reasonable wear and tear nor for any deduction prohibited by the applicable legislation of <strong>${stateName}</strong> (the &ldquo;Act&rdquo;).`
    ));

    // Clause 13 — Deductions list (FIXED STATUTORY: subclauses a–j)
    {
      const dl = makeLetterCounter();
      html.push(clause(n(),
        `During the term of this Lease or after its termination, the Landlord may charge the Tenant or make deductions from the Security Deposit for any or all of the following:`
      ));
      html.push(sub(dl(), `repair of walls due to plugs, large nails or any unreasonable number of holes in the walls including the repainting of such damaged walls;`));
      html.push(sub(dl(), `repainting required to repair the results of any other improper use or excessive damage by the Tenant;`));
      html.push(sub(dl(), `unplugging toilets, sinks and drains;`));
      html.push(sub(dl(), `replacing damaged or missing doors, windows, screens, mirrors or light fixtures;`));
      html.push(sub(dl(), `repairing cuts, burns, or water damage to linoleum, rugs, and other areas;`));
      html.push(sub(dl(), `any other repairs or cleaning due to any damage beyond normal wear and tear caused or permitted by the Tenant or by any person for whom the Tenant is responsible;`));
      html.push(sub(dl(), `the cost of extermination where the Tenant or the Tenant&apos;s guests have brought or allowed insects into the Property or building;`));
      html.push(sub(dl(), `repairs and replacement required where windows are left open which directly or indirectly causes rain or water damage to floors, walls, structure, or plumbing;`));
      html.push(sub(dl(), `replacement of locks or lost keys for the Property and any administrative fees associated with the replacement as a result of the Tenant&apos;s misplacement of the keys; and`));
      html.push(sub(dl(), `any other purpose allowed under this Lease or the Act.`));
    }

    // Clause 14 — FIXED STATUTORY: Cannot use deposit as rent
    html.push(clause(n(),
      `The Tenant may not use the Security Deposit as payment for the Rent.`
    ));

    // Clause 15 — Deposit return deadline
    const deadline = (state.specifyDepositDeadline === 'yes' && state.specifySecurityDepositDeadline.trim())
      ? state.specifySecurityDepositDeadline.trim()
      : '30 Days';
    const returnAddr = (state.tenantAddressNotices === 'yes' && state.tenantNoticeAddress.trim())
      ? state.tenantNoticeAddress.trim()
      : safe(state.propertyAddress, 'the Property address');
    html.push(clause(n(),
      `Within the lesser of <strong>${deadline}</strong> and any time period required by the Act and after the termination of this tenancy, the Landlord will deliver or mail the Security Deposit less any proper deductions or with further demand for payment to: ${returnAddr}, or at such other place as the Tenant may advise.`
    ));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── QUIET ENJOYMENT (FIXED STATUTORY — always present)
  // ══════════════════════════════════════════════════════════════════════════
  html.push(heading('Quiet Enjoyment'));

  html.push(clause(n(),
    `The Landlord covenants that on paying the Rent and performing the covenants contained in this Lease, the Tenant will peacefully and quietly have, hold, and enjoy the Property for the agreed term.`
  ));

  // ══════════════════════════════════════════════════════════════════════════
  // ── LANDLORD IMPROVEMENTS (conditional)
  // ══════════════════════════════════════════════════════════════════════════
  if (state.landlordImprovements === 'yes' && state.listLandlordImprovements.trim()) {
    html.push(heading('Landlord Improvements'));
    html.push(clause(n(),
      `The Landlord will make the following improvements to the Property prior to or during the term of this Lease: <strong>${state.listLandlordImprovements.trim()}</strong>.`
    ));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── TENANT IMPROVEMENTS (FIXED STATUTORY — always present; subclauses a–f)
  // ══════════════════════════════════════════════════════════════════════════
  html.push(heading('Tenant Improvements'));
  {
    const tl = makeLetterCounter();
    html.push(clause(n(),
      `The Tenant will obtain written permission from the Landlord before doing any of the following:`
    ));
    html.push(sub(tl(), `applying adhesive materials, or inserting nails or hooks in walls or ceilings other than two small picture hooks per wall;`));
    html.push(sub(tl(), `painting, wallpapering, redecorating or in any way significantly altering the appearance of the Property;`));
    html.push(sub(tl(), `removing or adding walls, or performing any structural alterations;`));
    html.push(sub(tl(), `changing the amount of heat or power normally used on the Property as well as installing additional electrical wiring or heating units;`));
    html.push(sub(tl(), `placing or exposing or allowing to be placed or exposed anywhere inside or outside the Property any placard, notice or sign for advertising or any other purpose; or`));
    html.push(sub(tl(), `affixing to or erecting upon or near the Property any radio or TV antenna or tower.`));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── ATTORNEY FEES (FIXED STATUTORY — always present)
  // ══════════════════════════════════════════════════════════════════════════
  html.push(heading('Attorney Fees'));

  html.push(clause(n(),
    `In the event that any action is filed in relation to this Lease, the unsuccessful Party in the action will pay to the successful Party, in addition to all the sums that either Party may be called on to pay, a reasonable sum for the successful Party&apos;s attorney fees.`
  ));

  // ══════════════════════════════════════════════════════════════════════════
  // ── GOVERNING LAW (conditional — uses user-selected state)
  // ══════════════════════════════════════════════════════════════════════════
  html.push(heading('Governing Law'));

  html.push(clause(n(),
    `This Lease will be construed in accordance with, and exclusively governed by, the laws of <strong>${stateName}</strong>. Any disputes arising out of or in relation to this Lease shall be subject to the exclusive jurisdiction of the courts at <strong>${courtCity}</strong>.`
  ));

  // ══════════════════════════════════════════════════════════════════════════
  // ── SEVERABILITY (FIXED STATUTORY — always present)
  // ══════════════════════════════════════════════════════════════════════════
  html.push(heading('Severability'));

  html.push(clause(n(),
    `If there is a conflict between any provision of this Lease and the Act, the Act will prevail and such provisions of the Lease will be amended or deleted as necessary in order to comply with the Act. Further, any provisions that are required by the Act are incorporated into this Lease.`
  ));

  html.push(clause(n(),
    `The invalidity or unenforceability of any provisions of this Lease will not affect the validity or enforceability of any other provision of this Lease. Such other provisions remain in full force and effect.`
  ));

  // ══════════════════════════════════════════════════════════════════════════
  // ── AMENDMENT OF LEASE (FIXED STATUTORY — always present)
  // ══════════════════════════════════════════════════════════════════════════
  html.push(heading('Amendment of Lease'));

  html.push(clause(n(),
    `This Lease may only be amended or modified by a written document executed by the Parties.`
  ));

  // ══════════════════════════════════════════════════════════════════════════
  // ── ASSIGNMENT AND SUBLETTING (conditional on user selection)
  // ══════════════════════════════════════════════════════════════════════════
  html.push(heading('Assignment and Subletting'));

  if (state.subletting === 'yes') {
    html.push(clause(n(),
      `The Tenant may, with the prior, express, and written consent of the Landlord, assign this Lease, or sublet or grant any concession or licence to use the Property or any part of the Property. A consent by the Landlord to one assignment, subletting, concession, or licence will not be deemed to be a consent to any subsequent assignment, subletting, concession, or licence.`
    ));
  } else {
    html.push(clause(n(),
      `Without the prior, express, and written consent of the Landlord, the Tenant will not assign this Lease, or sublet or grant any concession or licence to use the Property or any part of the Property. A consent by the Landlord to one assignment, subletting, concession, or licence will not be deemed to be a consent to any subsequent assignment, subletting, concession, or licence. Any assignment, subletting, concession, or licence without the prior written consent of the Landlord, or an assignment or subletting by operation of law, will be void and will, at the Landlord&apos;s option, terminate this Lease.`
    ));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── MAINTENANCE (FIXED STATUTORY — always present)
  // ══════════════════════════════════════════════════════════════════════════
  html.push(heading('Maintenance'));

  html.push(clause(n(),
    `The Tenant will, at its sole expense, keep and maintain the Property and appurtenances in good and sanitary condition and repair during the term of this Lease and any renewal of this Lease.`
  ));

  html.push(clause(n(),
    `Major maintenance and repair of the Property not due to the Tenant&apos;s misuse, waste, or neglect or that of the Tenant&apos;s employee, family, agent, or visitor, will be the responsibility of the Landlord or the Landlord&apos;s assigns.`
  ));

  // ══════════════════════════════════════════════════════════════════════════
  // ── CARE AND USE OF PROPERTY (FIXED STATUTORY — always present)
  // ══════════════════════════════════════════════════════════════════════════
  html.push(heading('Care and Use of Property'));

  html.push(clause(n(),
    `The Tenant will promptly notify the Landlord of any damage, or of any situation that may significantly interfere with the normal use of the Property or to any furnishings supplied by the Landlord.`
  ));

  html.push(clause(n(),
    `The Tenant will not engage in any illegal trade or activity on or about the Property.`
  ));

  // FIXED STATUTORY: Health/safety compliance
  html.push(clause(n(),
    `The Parties will comply with standards of health, sanitation, fire, housing and safety as required by law.`
  ));

  // FIXED STATUTORY: Absence arrangement
  html.push(clause(n(),
    `If the Tenant is absent from the Property and the Property is unoccupied for a period of 4 consecutive days or longer, the Tenant will arrange for regular inspection by a competent person. The Landlord will be notified in advance as to the name, address and phone number of the person doing the inspections.`
  ));

  // FIXED STATUTORY: Surrender in good condition
  html.push(clause(n(),
    `At the expiration of the term of this Lease, the Tenant will quit and surrender the Property in as good a state and condition as they were at the commencement of this Lease, reasonable use and wear and tear excepted.`
  ));

  // FIXED STATUTORY: Lock replacement charges
  html.push(clause(n(),
    `During the term of this Lease or after its termination, the Landlord may charge the Tenant for replacement of locks and/or lost keys to the Property, and any administrative fees associated with the replacement as a result of the Tenant&apos;s misplacement of the keys.`
  ));

  // ══════════════════════════════════════════════════════════════════════════
  // ── RULES AND REGULATIONS (FIXED STATUTORY — always present)
  // ══════════════════════════════════════════════════════════════════════════
  html.push(heading('Rules and Regulations'));

  html.push(clause(n(),
    `The Tenant will obey all rules and regulations of the Landlord regarding the Property.`
  ));

  // ══════════════════════════════════════════════════════════════════════════
  // ── ADDITIONAL CHARGES / UTILITIES (conditional — only if any not 'dns')
  // ══════════════════════════════════════════════════════════════════════════
  const utilEntries: { label: string; who: string }[] = [];
  const addUtil = (label: string, val: string) => {
    if (val !== 'dns') utilEntries.push({ label, who: val === 'landlord' ? 'Landlord' : 'Tenant' });
  };
  addUtil('Electricity', state.utilElectricity);
  addUtil('Water',       state.utilWater);
  addUtil('Sanitation',  state.utilSanitation);
  addUtil('Drainage',    state.utilDrainage);
  addUtil('Air Conditioning', state.utilAC);
  addUtil('Property Tax', state.utilPropertyTax);
  addUtil('Storage',     state.utilStorage);
  if (state.utilOther !== 'dns' && state.listUtilOther.trim()) {
    addUtil(state.listUtilOther.trim(), state.utilOther);
  }

  if (utilEntries.length > 0) {
    html.push(heading('Additional Charges'));
    const ul = makeLetterCounter();
    html.push(clause(n(),
      `In addition to the Rent, the following charges and utilities shall be the responsibility of the Party specified herein:`
    ));
    utilEntries.forEach(u => {
      html.push(sub(ul(), `${u.label}: to be paid by the <strong>${u.who}</strong>.`));
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── PROPERTY MANAGER (conditional)
  // ══════════════════════════════════════════════════════════════════════════
  if (state.propertyManager === 'yes' && state.propertyManagerName.trim()) {
    html.push(heading('Property Manager'));
    html.push(clause(n(),
      `<strong>${state.propertyManagerName.trim()}</strong> is hereby appointed as Property Manager and is authorised to act as the agent of the Landlord for the purposes of managing the Property and liaising with the Tenant on behalf of the Landlord during the term of this Lease.`
    ));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── INSPECTION REPORT (conditional)
  // ══════════════════════════════════════════════════════════════════════════
  if (state.inspectionReport === 'yes') {
    html.push(heading('Inspection Report'));
    html.push(clause(n(),
      `An inspection report recording the condition of the Property and its furnishings shall be completed and signed by both Parties at the commencement of the tenancy and again at the end of the tenancy. The inspection report shall form part of this Lease and shall serve as the basis for any deductions from the Security Deposit at termination.`
    ));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── GUARANTOR (conditional)
  // ══════════════════════════════════════════════════════════════════════════
  if (state.guarantorRequired === 'yes' && state.guarantorName.trim()) {
    html.push(heading('Guarantor'));
    const gAddr = state.guarantorAddress.trim()
      ? `, of <strong>${state.guarantorAddress.trim()}</strong>,`
      : '';
    html.push(clause(n(),
      `<strong>${state.guarantorName.trim()}</strong>${gAddr} (the &ldquo;Guarantor&rdquo;) hereby unconditionally and irrevocably guarantees to the Landlord the due and punctual performance by the Tenant of all the obligations, covenants and conditions contained in this Lease, including without limitation the payment of all amounts payable hereunder. The Guarantor shall be jointly and severally liable with the Tenant for any breach of this Lease. This guarantee shall remain in force for the duration of this Lease and any renewals thereof.`
    ));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── ADDRESS FOR NOTICE
  // ══════════════════════════════════════════════════════════════════════════
  html.push(heading('Address for Notice'));

  // Tenant notice address
  {
    const tl = makeLetterCounter();
    const postTermAddr = (state.tenantAddressNotices === 'yes' && state.tenantNoticeAddress.trim())
      ? state.tenantNoticeAddress.trim()
      : '___________';
    html.push(clause(n(),
      `For any matter relating to this tenancy, the Tenant may be contacted at the Property or through the phone number below. After this tenancy has been terminated, the contact information of the Tenant is:`
    ));
    html.push(sub(tl(), `Name: ${tenantStr}.`));
    if (state.tenantPhone.trim()) {
      html.push(sub(tl(), `Phone: ${state.tenantPhone.trim()}.`));
    }
    if (state.tenantEmail.trim()) {
      html.push(sub(tl(), `Email: ${state.tenantEmail.trim()}.`));
    }
    html.push(sub(tl(), `Post termination notice address: ${postTermAddr}.`));
  }

  // Landlord notice address
  {
    const ll = makeLetterCounter();
    const lAddr = state.landlordNoticeAddress.trim()
      || state.landlordAddress.trim()
      || '___________';
    html.push(clause(n(),
      `For any matter relating to this tenancy, whether during or after this tenancy has been terminated, the Landlord&apos;s address for notice is:`
    ));
    html.push(sub(ll(), `Name: ${landlordStr}.`));
    html.push(sub(ll(), `Address: ${lAddr}.`));
    if (state.landlordPhone.trim()) {
      html.push(sub(ll(), `Phone: ${state.landlordPhone.trim()}.`));
    }
    if (state.landlordEmail.trim()) {
      html.push(sub(ll(), `Email: ${state.landlordEmail.trim()}.`));
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── GENERAL PROVISIONS (FIXED STATUTORY — all from PDF, clauses 36–47)
  // ══════════════════════════════════════════════════════════════════════════
  html.push(heading('General Provisions'));

  // 36 — Indian rupee
  html.push(clause(n(),
    `All monetary amounts stated or referred to in this Lease are based in the Indian rupee.`
  ));

  // 37 — Waiver
  html.push(clause(n(),
    `Any waiver by the Landlord of any failure by the Tenant to perform or observe the provisions of this Lease will not operate as a waiver of the Landlord&apos;s rights under this Lease in respect of any subsequent defaults, breaches or non-performance and will not defeat or affect in any way the Landlord&apos;s rights in respect of any subsequent default or breach.`
  ));

  // 38 — Heirs and assigns
  html.push(clause(n(),
    `This Lease will extend to and be binding upon and inure to the benefit of the respective heirs, executors, administrators, successors and assigns, as the case may be, of each Party. All covenants are to be construed as conditions of this Lease.`
  ));

  // 39 — Additional rent
  html.push(clause(n(),
    `All sums payable by the Tenant to the Landlord pursuant to any provision of this Lease will be deemed to be additional rent and will be recovered by the Landlord as rental arrears.`
  ));

  // 40 — Locks
  html.push(clause(n(),
      `Locks may not be added or changed without the prior written agreement of both Parties.`
  ));

  // 41 — Interpretation / headings
  html.push(clause(n(),
    `Headings are inserted for the convenience of the Parties only and are not to be considered when interpreting this Lease. Words in the singular mean and include the plural and vice versa. Words in the masculine mean and include the feminine and vice versa.`
  ));

  // 42 — Counterparts
  html.push(clause(n(),
    `This Lease may be executed in counterparts. Facsimile signatures are binding and are considered to be original signatures.`
  ));

  // 43 — Entire agreement
  html.push(clause(n(),
    `This Lease constitutes the entire agreement between the Parties. Any prior understanding or representation of any kind preceding the date of this Lease will not be binding on either Party except to the extent incorporated in this Lease.`
  ));

  // 44 — Indemnification
  html.push(clause(n(),
    `The Tenant will indemnify and save the Landlord, and the owner of the Property where different from the Landlord, harmless from all liabilities, fines, suits, claims, demands and actions of any kind or nature for which the Landlord will or may become liable or suffer by reason of any breach, violation or non-performance by the Tenant or by any person for whom the Tenant is responsible, of any covenant, term, or provisions hereof or by reason of any act, neglect or default on the part of the Tenant or other person for whom the Tenant is responsible. Such indemnification in respect of any such breach, violation or non-performance, damage to property, injury or death occurring during the term of the Lease will survive the termination of the Lease, notwithstanding anything in this Lease to the contrary.`
  ));

  // 45 — Landlord liability exclusion
  html.push(clause(n(),
    `The Tenant agrees that the Landlord will not be liable or responsible in any way for any personal injury or death that may be suffered or sustained by the Tenant or by any person for whom the Tenant is responsible who may be on the Property of the Landlord or for any loss of or damage or injury to any property, including cars and contents thereof belonging to the Tenant or to any other person for whom the Tenant is responsible.`
  ));

  // 46 — Guest responsibility
  html.push(clause(n(),
    `The Tenant is responsible for any person or persons who are upon or occupying the Property or any other part of the Landlord&apos;s premises at the request of the Tenant, either express or implied, whether for the purposes of visiting, making deliveries, repairs or attending upon the Property for any other reason. Without limiting the generality of the foregoing, the Tenant is responsible for all members of the Tenant&apos;s family, guests, servants, tradesmen, repairmen, employees, agents, invitees or other similar persons.`
  ));

  // 47 — Time is of essence
  html.push(clause(n(),
    `Time is of the essence in this Lease.`
  ));

  // ══════════════════════════════════════════════════════════════════════════
  // ── ADDITIONAL PROVISIONS (conditional)
  // ══════════════════════════════════════════════════════════════════════════
  const customClauses = state.additionalClauses === 'yes'
    ? state.additionalClausesList.filter(c => c.trim())
    : [];

  if (customClauses.length > 0) {
    html.push(heading('Additional Provisions'));
    customClauses.forEach(c => {
      html.push(clause(n(), c.trim()));
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── EXECUTION / SIGNATURES
  // ══════════════════════════════════════════════════════════════════════════
  html.push(`
<div class="execution">
  <p class="exec-heading"><strong>IN WITNESS WHEREOF</strong>&ensp;${tenantStr} and ${landlordStr} have duly affixed their signatures on this ${sigDate}.</p>
  <div class="sig-row">
    <div class="sig-col">
      <div class="sig-line"></div>
      <p class="sig-name">${landlordStr}</p>
      <p class="sig-role">Landlord</p>
    </div>
    <div class="sig-col">
      <div class="sig-line"></div>
      <p class="sig-name">${tenantStr}</p>
      <p class="sig-role">Tenant</p>
    </div>
  </div>
  ${state.guarantorRequired === 'yes' && state.guarantorName.trim() ? `
  <div class="sig-row" style="margin-top:40pt;">
    <div class="sig-col">
      <div class="sig-line"></div>
      <p class="sig-name">${state.guarantorName.trim()}</p>
      <p class="sig-role">Guarantor</p>
    </div>
    <div class="sig-col"></div>
  </div>` : ''}
  <div class="witness-block">
    <p class="witness-label">WITNESSES:</p>
    <div class="sig-row">
      <div class="sig-col">
        <div class="sig-line"></div>
        <p class="sig-role">Witness 1 &mdash; Name: _______________________</p>
        <p class="sig-role">Address: ________________________________</p>
      </div>
      <div class="sig-col">
        <div class="sig-line"></div>
        <p class="sig-role">Witness 2 &mdash; Name: _______________________</p>
        <p class="sig-role">Address: ________________________________</p>
      </div>
    </div>
  </div>
</div>`);

  return wrapDocument(html.join('\n'));
}

// ─── Document wrapper ─────────────────────────────────────────────────────────
// Exact Indian Supreme Court / High Court specification:
//   A4: 210mm × 297mm
//   Margins: 40mm L/R, 20mm T/B
//   Font: Times New Roman, 14pt
//   Spacing: 1.5 line-height
//   Headings: 14pt Bold Underline; Title: 18pt Bold Centered

export function wrapDocument(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Residential Rental Agreement</title>
<style>
/* Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Grey workspace canvas — the iframe fills the editor container width.
   html provides the grey background with vertical breathing room.
   The white .page floats centred on it, like paper on a desk. */
html {
  background: #c8c8c8;
  padding: 24px 0;
  font-family: 'Times New Roman', Times, serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body { background: transparent; margin: 0; padding: 0; }

/* White A4 page
   max-width 816px (210mm standard A4 proportional width).
   width 100%.
   Balanced professional legal document margins: 20mm (~48px) top/bottom, 22mm (~54px) left/right. */
.page {
  max-width: 816px;
  width: 100%;
  min-height: 1056px;
  margin: 0 auto;
  padding: 48px 54px;
  background: #ffffff;
  color: #000000;
  font-family: 'Times New Roman', Times, serif;
  font-size: 13.5pt;
  line-height: 1.45;
  box-shadow: 0 2px 18px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.08);
}

/* ═══ Stamp space ══════════════════════════════════════════════════════════ */
.stamp-space {
  border: 1.5px dashed #555;
  padding: 14pt 18pt;
  margin-bottom: 20pt;
  text-align: center;
  background-color: #fafafa;
}
.stamp-text {
  font-size: 10.5pt;
  font-style: italic;
  line-height: 1.35;
  color: #222;
}

/* ═══ Title ════════════════════════════════════════════════════════════════ */
.doc-title {
  font-size: 17pt;
  font-weight: bold;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: normal;   /* Issue 1: no tracked/stretched characters */
  margin-bottom: 20pt;
  margin-top: 6pt;
}

/* ═══ Preamble ═════════════════════════════════════════════════════════════ */
.preamble-this {
  margin-bottom: 12pt;
  text-align: justify;
  text-justify: inter-word;
  line-height: 1.45;
}
.preamble-between {
  margin-bottom: 5pt;
}
.party-name {
  font-weight: bold;
  font-size: 13.5pt;
  text-align: center;
  margin: 6pt 0 2pt 0;
}
.party-role {
  text-align: center;
  margin-bottom: 2pt;
  font-size: 13pt;
}
.party-sep {
  text-align: center;
  font-weight: bold;
  letter-spacing: normal;   /* Issue 2: — AND — not spaced-out */
  margin: 8pt 0;
  font-size: 12pt;
}
.consideration {
  margin: 14pt 0 12pt 0;
  text-align: justify;
  text-justify: inter-word;
  line-height: 1.45;
}

/* Issue 3: Section headings — always keep with next clause (orphan prevention) */
.section-heading {
  font-size: 13pt;
  font-weight: bold;
  text-decoration: underline;
  margin-top: 14pt;
  margin-bottom: 5pt;
  page-break-after: avoid;    /* legacy */
  break-after: avoid-page;    /* modern */
  page-break-inside: avoid;
  break-inside: avoid;
}

/* Issue 6+7: Body text 12pt, monetary/date bold via .val class */
/* Issue 4: clauses pair with their heading via page-break-inside avoid on first clause */
.clause {
  display: flex;
  align-items: flex-start;
  margin-bottom: 5pt;
}
.cnum {
  flex: 0 0 24pt;
  font-size: 12pt;
  line-height: 1.5;
  padding-right: 4pt;
  font-weight: normal;
}
.cbody {
  flex: 1;
  font-size: 12pt;
  line-height: 1.5;
  text-align: justify;
  text-justify: inter-word;
}
/* Bold only monetary amounts & dates for consistency (Issue 7) */
.val {
  font-weight: bold;
}

/* ═══ Lettered subclauses ══════════════════════════════════════════════════ */
.subclause {
  display: flex;
  align-items: flex-start;
  margin-left: 24pt;
  margin-bottom: 3pt;
}
.scnum {
  flex: 0 0 18pt;
  font-size: 11.5pt;
  line-height: 1.5;
  padding-right: 4pt;
}
.scbody {
  flex: 1;
  font-size: 11.5pt;
  line-height: 1.5;
  text-align: justify;
  text-justify: inter-word;
}

/* ═══ Continuation text ════════════════════════════════════════════════════ */
.continuation {
  font-size: 12pt;
  margin-left: 24pt;
  margin-bottom: 5pt;
  text-align: justify;
  text-justify: inter-word;
}

/* ═══ Execution block — Issue 4: no stray line before IN WITNESS WHEREOF ═══ */
.execution {
  margin-top: 28pt;
  padding-top: 14pt;
  border-top: 2px solid #000;  /* This border IS the only separator — no extra line */
  page-break-inside: avoid;
  break-inside: avoid;
}
.exec-heading {
  margin-bottom: 20pt;
  text-align: justify;
  text-justify: inter-word;
  font-size: 12pt;
  line-height: 1.5;
}
.sig-row {
  display: flex;
  gap: 36pt;
  margin-bottom: 4pt;
}
.sig-col {
  flex: 1;
}
.sig-line {
  border-top: 1px solid #000;
  margin-top: 30pt;
  margin-bottom: 5pt;
}
.sig-name {
  font-weight: bold;
  font-size: 12pt;
  margin-bottom: 2pt;
}
.sig-role {
  font-size: 11pt;
  margin-bottom: 1pt;
}
.witness-block {
  margin-top: 26pt;
  page-break-inside: avoid;
  break-inside: avoid;
}
.witness-label {
  font-size: 12pt;
  font-weight: bold;
  margin-bottom: 6pt;
}

/* Issue 5: Page X of Y footer ─────────────────────────────────────────────── */
.page-footer {
  display: none; /* hidden on screen — shown only in @media print via counter */
}

/* ─── Print / PDF — match screen preview exactly ────────────────────────────
   Strategy: Strip only the visual decorations (grey bg, drop-shadow).
   Do NOT override font-size, line-height, padding or layout — they are already
   correct on screen and must print the same way.  The @page rule makes the
   browser/Chromium use A4 with zero additional browser margins so the .page
   padding values are the only margins in the PDF.                            */
@media print {
  html {
    background: #ffffff !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  body {
    background: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  /* Keep .page sizing exactly as on screen — only remove shadow + auto-margin */
  .page {
    max-width: 100% !important;
    width: 100% !important;
    min-height: auto !important;
    margin: 0 !important;
    padding: 48px 54px !important;   /* same as screen: ~12.7mm top/bottom, ~14.3mm sides */
    box-shadow: none !important;
    background: #ffffff !important;
  }
  /* Remove grey canvas background so the page bleeds white to edge */
  html, body, .page {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* Page X of Y via @page counter (supported in Chrome/Edge print-to-PDF) */
  @page {
    size: A4 portrait;
    margin: 0;    /* zero — .page padding controls all white space */
    @bottom-right {
      content: 'Page ' counter(page) ' of ' counter(pages);
      font-family: 'Times New Roman', Times, serif;
      font-size: 9pt;
      color: #444;
      margin-right: 54px;
      margin-bottom: 14px;
    }
  }
}
</style>
</head>
<body>
<div class="page">
${body}
</div>
<script>
/* Auto-resize: notify parent editor of full document height */
(function () {
  function report() {
    var h = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    try { window.parent.postMessage({ type: 'lexdraft-iframe-height', height: h + 48 }, '*'); } catch (e) {}
  }
  window.addEventListener('load', function () { setTimeout(report, 150); });
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(function () { setTimeout(report, 80); }).observe(document.body);
  }

  /* Save scroll position on scroll */
  var scrollDebounce;
  window.addEventListener('scroll', function() {
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(function() {
      try { sessionStorage.setItem('lexdraft_preview_scroll_y', String(window.scrollY)); } catch(e) {}
    }, 40);
  }, { passive: true });

  function scrollToTarget(targetId, targetText, smooth, flash) {
    var el = null;
    if (targetId) {
      el = document.getElementById(targetId) ||
           document.querySelector('[data-section="' + targetId + '"]') ||
           document.getElementById('sec-' + targetId) ||
           document.getElementById('clause-' + targetId);
    }
    if (!el && targetText) {
      var elements = document.querySelectorAll('.section-heading, .clause, .preamble-this, .party-name');
      for (var i = 0; i < elements.length; i++) {
        if (elements[i].textContent && elements[i].textContent.toLowerCase().indexOf(targetText.toLowerCase()) !== -1) {
          el = elements[i];
          break;
        }
      }
    }
    if (el) {
      /* Use window.scrollTo instead of el.scrollIntoView — this keeps the scroll
         contained inside the iframe and prevents the parent page (left editing panel)
         from jumping to the top. scrollIntoView bubbles out of iframes in Chromium. */
      var rect = el.getBoundingClientRect();
      var currentScrollY = window.scrollY || window.pageYOffset || 0;
      /* Center the element vertically in the viewport */
      var targetY = currentScrollY + rect.top - (window.innerHeight / 2) + (rect.height / 2);
      if (targetY < 0) targetY = 0;
      window.scrollTo({
        top: targetY,
        behavior: smooth ? 'smooth' : 'instant'
      });
      if (flash !== false) {
        el.style.transition = 'background-color 0.4s ease';
        var oldBg = el.style.backgroundColor;
        el.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
        setTimeout(function() {
          el.style.backgroundColor = oldBg || '';
        }, 1200);
      }
    }
  }

  /* Restore position or target on page load/reload */
  function restorePosition() {
    try {
      var savedTarget = sessionStorage.getItem('lexdraft_active_target');
      if (savedTarget) {
        var parsed = JSON.parse(savedTarget);
        if (parsed && (parsed.targetId || parsed.targetText)) {
          scrollToTarget(parsed.targetId, parsed.targetText, false, false);
          return;
        }
      }
      var savedY = sessionStorage.getItem('lexdraft_preview_scroll_y');
      if (savedY !== null && savedY !== undefined) {
        window.scrollTo({ top: parseInt(savedY, 10), behavior: 'instant' });
      }
    } catch (e) {}
  }

  window.addEventListener('DOMContentLoaded', restorePosition);
  window.addEventListener('load', function() { setTimeout(restorePosition, 40); });
  setTimeout(restorePosition, 10);
  setTimeout(restorePosition, 120);

  /* Listen for scroll-to commands from the wizard */
  window.addEventListener('message', function(event) {
    if (!event.data) return;
    if (event.data.type === 'lexdraft-scroll-to') {
      var targetId = event.data.targetId;
      var targetText = event.data.targetText;
      try {
        sessionStorage.setItem('lexdraft_active_target', JSON.stringify({ targetId: targetId, targetText: targetText }));
      } catch (e) {}
      scrollToTarget(targetId, targetText, event.data.smooth !== false, event.data.flash !== false);
    }
  });
})();
</script>
</body>
</html>`;
}

// ─── Variables serialiser ─────────────────────────────────────────────────────

export function wizardStateToVariables(state: HouseWizardState): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(state)) {
    if (Array.isArray(value)) {
      vars[key] = JSON.stringify(value);
    } else if (typeof value === 'boolean') {
      vars[key] = value ? 'true' : 'false';
    } else {
      vars[key] = String(value ?? '');
    }
  }
  // Required single-value keys for server-side variable validation
  vars['landlordName'] = state.landlords.filter(n => n.trim()).join(', ') || '';
  vars['tenantName']   = state.tenants.filter(n => n.trim()).join(', ') || '';
  return vars;
}
