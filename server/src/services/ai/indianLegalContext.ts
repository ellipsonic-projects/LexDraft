// ─── Indian Legal Context Registry ──────────────────────────────────────────
// Authoritative legal frameworks, drafting conventions, and statutory references
// for specialized Indian legal drafting in LexDraft.

export interface IndianLegalFramework {
  governingLaws: string[];
  keyStatutes: Array<{ source: string; reference: string; summary: string }>;
  draftingConventions: string[];
  mandatoryDisclosures: string[];
}

export function getIndianLegalContext(
  documentType?: string,
  jurisdiction?: string,
  sectionName?: string
): {
  documentCategory: string;
  detectedJurisdiction: string;
  framework: IndianLegalFramework;
  promptGuidance: string;
} {
  const docLower = (documentType || '').toLowerCase();
  const jurLower = (jurisdiction || '').toLowerCase();
  const secLower = (sectionName || '').toLowerCase();

  // Detect state jurisdiction (Default to Pan-India)
  let state = 'India (Pan-India Jurisdiction)';
  if (jurLower.includes('karnataka') || jurLower.includes('bengaluru') || jurLower.includes('bangalore')) {
    state = 'Karnataka, India';
  } else if (jurLower.includes('maharashtra') || jurLower.includes('mumbai') || jurLower.includes('pune')) {
    state = 'Maharashtra, India';
  } else if (jurLower.includes('delhi') || jurLower.includes('ncr')) {
    state = 'Delhi (NCT), India';
  } else if (jurLower.includes('tamil nadu') || jurLower.includes('chennai')) {
    state = 'Tamil Nadu, India';
  } else if (jurLower.includes('telangana') || jurLower.includes('hyderabad')) {
    state = 'Telangana, India';
  }

  // 1. Property / Lease / Rental Agreement
  if (
    docLower.includes('lease') ||
    docLower.includes('rental') ||
    docLower.includes('tenancy') ||
    docLower.includes('premises') ||
    secLower.includes('rent') ||
    secLower.includes('demised')
  ) {
    return {
      documentCategory: 'Property & Real Estate Lease',
      detectedJurisdiction: state,
      framework: {
        governingLaws: [
          'Transfer of Property Act, 1882 (Chapter V - Leases)',
          'Registration Act, 1908 (Section 17 - Compulsory Registration for Leases >= 11 months)',
          'Indian Stamp Act, 1899 / Karnataka Stamp Act, 1957 (Article 30)',
          state.includes('Karnataka') ? 'Karnataka Rent Control Act, 2001' : 'Applicable State Rent Control Legislation'
        ],
        keyStatutes: [
          {
            source: 'Transfer of Property Act, 1882',
            reference: 'Section 108',
            summary: 'Rights and liabilities of Lessor and Lessee in absence of contract to the contrary.'
          },
          {
            source: 'Registration Act, 1908',
            reference: 'Section 17(1)(d)',
            summary: 'Leases of immovable property from year to year or exceeding 11 months require compulsory registration.'
          }
        ],
        draftingConventions: [
          'Use formal party titles: "LESSOR (LANDLORD)" and "LESSEE (TENANT)".',
          'Express monthly rent in Indian Rupees (₹ / INR) with clear due date (e.g. "on or before the 5th of each calendar month").',
          'Specify interest-free refundable security deposit clearly.',
          'Define notice period in calendar months (e.g. "2 (two) calendar months written notice").',
          'Demised Premises description must specify complete postal address and schedule details.'
        ],
        mandatoryDisclosures: [
          'State stamp duty and registration requirement applicability for leases exceeding 11 months.'
        ]
      },
      promptGuidance: `Apply formal Indian real estate and property drafting style (Transfer of Property Act 1882 framework). Use precise Indian legal phrasing such as "Demised Premises", "Lessor", "Lessee", "covenants to pay rent", "yielding and paying", and "free of interest refundable security deposit".`
    };
  }

  // 2. Employment & Service Agreements
  if (
    docLower.includes('employment') ||
    docLower.includes('job') ||
    docLower.includes('service') ||
    docLower.includes('consultant') ||
    secLower.includes('salary') ||
    secLower.includes('termination')
  ) {
    return {
      documentCategory: 'Employment & Commercial Services',
      detectedJurisdiction: state,
      framework: {
        governingLaws: [
          'Indian Contract Act, 1872 (Section 27 - Agreements in restraint of trade)',
          'Industrial Employment (Standing Orders) Act, 1946',
          'Applicable State Shops and Commercial Establishments Act',
          'Information Technology Act, 2000 (Data Privacy & IP Protection)'
        ],
        keyStatutes: [
          {
            source: 'Indian Contract Act, 1872',
            reference: 'Section 27',
            summary: 'Void agreements in restraint of trade, profession, or business. Post-employment non-competes must be drafted with careful legal nuance.'
          },
          {
            source: 'Indian Contract Act, 1872',
            reference: 'Section 73',
            summary: 'Compensation for loss or damage caused by breach of contract.'
          }
        ],
        draftingConventions: [
          'Use party titles: "EMPLOYER / COMPANY" and "EMPLOYEE / CONSULTANT".',
          'Specify probation period, notice period, and severance terms precisely.',
          'Ensure Intellectual Property assignment clauses explicitly state assignment without geographical limit.',
          'Use clear Indian dispute resolution and governing law clauses.'
        ],
        mandatoryDisclosures: [
          'Note that post-employment non-compete covenants are generally unenforceable under Section 27 of Indian Contract Act 1872.'
        ]
      },
      promptGuidance: `Apply formal Indian employment law drafting standards (Indian Contract Act 1872 & IT Act 2000). Use precise Indian commercial legal terms such as "Employee", "Company", "Intellectual Property Rights", "Confidential Information", and "Restraint of Trade safeguard".`
    };
  }

  // 3. Non-Disclosure & Confidentiality Agreements (NDA)
  if (
    docLower.includes('nda') ||
    docLower.includes('confidential') ||
    docLower.includes('secrecy') ||
    secLower.includes('disclosure')
  ) {
    return {
      documentCategory: 'Non-Disclosure & Confidentiality Agreement',
      detectedJurisdiction: state,
      framework: {
        governingLaws: [
          'Indian Contract Act, 1872',
          'Information Technology Act, 2000 (Section 43A, Section 72A)',
          'Specific Relief Act, 1963 (Injunctions & Injunctive Relief)'
        ],
        keyStatutes: [
          {
            source: 'Specific Relief Act, 1963',
            reference: 'Section 38 & 39',
            summary: 'Perpetual and mandatory injunctions to prevent breach of obligation or breach of confidence.'
          },
          {
            source: 'Information Technology Act, 2000',
            reference: 'Section 43A & 72A',
            summary: 'Compensation for failure to protect sensitive personal data and penalty for breach of confidentiality.'
          }
        ],
        draftingConventions: [
          'Use party titles: "DISCLOSING PARTY" and "RECEIVING PARTY".',
          'Clearly define "Confidential Information" with standard exclusions (public knowledge, prior possession, independent development).',
          'Include explicit right to seek equitable & injunctive relief under Specific Relief Act 1963.'
        ],
        mandatoryDisclosures: []
      },
      promptGuidance: `Apply formal Indian commercial NDA drafting standards. Emphasize injunctive relief under the Specific Relief Act 1963, clear definition of Confidential Information, and robust survival obligations.`
    };
  }

  // 4. Default Commercial Contracts & Agreements
  return {
    documentCategory: 'General Indian Commercial Contract',
    detectedJurisdiction: state,
    framework: {
      governingLaws: [
        'Indian Contract Act, 1872',
        'Specific Relief Act, 1963',
        'Arbitration and Conciliation Act, 1996',
        'Commercial Courts Act, 2015'
      ],
      keyStatutes: [
        {
          source: 'Indian Contract Act, 1872',
          reference: 'Section 10',
          summary: 'All agreements are contracts if made by free consent of parties competent to contract for a lawful consideration.'
        },
        {
          source: 'Arbitration and Conciliation Act, 1996',
          reference: 'Section 7',
          summary: 'Arbitration agreement must be in writing to submit present or future disputes to arbitration.'
        }
      ],
      draftingConventions: [
        'Use formal Indian legal preamble: "THIS AGREEMENT is entered into on this [Date] at [Place] BY AND BETWEEN..."',
        'Use clear numbering, defined terms in Title Case, and unambiguous obligations ("shall" for mandatory duties).',
        'Include standard boilerplate: Indemnity, Severability, Governing Law, and Arbitration.'
      ],
      mandatoryDisclosures: []
    },
    promptGuidance: `Apply formal Indian commercial legal drafting style under the Indian Contract Act 1872. Use precise legal terms like "Party", "Parties", "Whereas", "In consideration of", "Indemnify and hold harmless", and "Exclusive jurisdiction of courts in India".`
  };
}
