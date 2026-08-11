// src/config/agreements/houseRentalConfig.ts
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  SINGLE SOURCE OF TRUTH FOR THE HOUSE RENTAL AGREEMENT ENGINE           ║
// ║                                                                          ║
// ║  To add/remove/modify a clause, question, variable or conditional rule:  ║
// ║  Edit THIS file ONLY.                                                    ║
// ║  The React wizard (HouseRentalWizard.tsx) and                           ║
// ║  the compiler (HouseAgreementCompiler.ts) read from this config.         ║
// ║  They NEVER need to be modified for agreement content changes.           ║
// ╚══════════════════════════════════════════════════════════════════════════╝

import {
  WizardTab,
  DocumentClause,
  HouseWizardState,
} from '../../types/houseWizardTypes';

// ─── Indian States & UTs ──────────────────────────────────────────────────────
export const INDIAN_STATES: { value: string; label: string; courts: string }[] = [
  { value: 'AN', label: 'Andaman & Nicobar Islands', courts: 'Port Blair' },
  { value: 'AP', label: 'Andhra Pradesh', courts: 'Amaravati / Vijayawada' },
  { value: 'AR', label: 'Arunachal Pradesh', courts: 'Itanagar' },
  { value: 'AS', label: 'Assam', courts: 'Guwahati' },
  { value: 'BR', label: 'Bihar', courts: 'Patna' },
  { value: 'CH', label: 'Chandigarh', courts: 'Chandigarh' },
  { value: 'CT', label: 'Chhattisgarh', courts: 'Raipur' },
  { value: 'DN', label: 'Dadra & Nagar Haveli and Daman & Diu', courts: 'Daman' },
  { value: 'DL', label: 'Delhi', courts: 'New Delhi' },
  { value: 'GA', label: 'Goa', courts: 'Panaji' },
  { value: 'GJ', label: 'Gujarat', courts: 'Ahmedabad' },
  { value: 'HR', label: 'Haryana', courts: 'Chandigarh' },
  { value: 'HP', label: 'Himachal Pradesh', courts: 'Shimla' },
  { value: 'JK', label: 'Jammu & Kashmir', courts: 'Jammu / Srinagar' },
  { value: 'JH', label: 'Jharkhand', courts: 'Ranchi' },
  { value: 'KA', label: 'Karnataka', courts: 'Bengaluru' },
  { value: 'KL', label: 'Kerala', courts: 'Thiruvananthapuram' },
  { value: 'LA', label: 'Ladakh', courts: 'Leh' },
  { value: 'LD', label: 'Lakshadweep', courts: 'Kavaratti' },
  { value: 'MP', label: 'Madhya Pradesh', courts: 'Bhopal' },
  { value: 'MH', label: 'Maharashtra', courts: 'Mumbai' },
  { value: 'MN', label: 'Manipur', courts: 'Imphal' },
  { value: 'ML', label: 'Meghalaya', courts: 'Shillong' },
  { value: 'MZ', label: 'Mizoram', courts: 'Aizawl' },
  { value: 'NL', label: 'Nagaland', courts: 'Kohima' },
  { value: 'OD', label: 'Odisha', courts: 'Cuttack / Bhubaneswar' },
  { value: 'PY', label: 'Puducherry', courts: 'Puducherry' },
  { value: 'PB', label: 'Punjab', courts: 'Chandigarh' },
  { value: 'RJ', label: 'Rajasthan', courts: 'Jaipur' },
  { value: 'SK', label: 'Sikkim', courts: 'Gangtok' },
  { value: 'TN', label: 'Tamil Nadu', courts: 'Chennai' },
  { value: 'TG', label: 'Telangana', courts: 'Hyderabad' },
  { value: 'TR', label: 'Tripura', courts: 'Agartala' },
  { value: 'UP', label: 'Uttar Pradesh', courts: 'Lucknow / Prayagraj' },
  { value: 'UK', label: 'Uttarakhand', courts: 'Nainital' },
  { value: 'WB', label: 'West Bengal', courts: 'Kolkata' },
];

// ─── FAQ Content ──────────────────────────────────────────────────────────────
export const FAQ_CONTENT: Record<string, string> = {
  location: `<strong>Why is customising the rental agreement according to location important?</strong><br/>Each state and union territory in India has its own Rent Control Act and specific rules for rental agreements. Customising to your location ensures your agreement complies with local law.`,
  leaseTerms: `<strong>What are the types of tenancies?</strong><br/><strong>Fixed Term</strong> — Ends on a specific date. Provides certainty; rent and terms cannot change during the term.<br/><br/><strong>Automatic Renewal</strong> — No set end date. Renews automatically until one party gives notice to terminate.<br/><br/><strong>Why 11 months?</strong><br/>In India, agreements for less than 12 months typically do not require registration under the Registration Act, 1908, saving time and stamp duty costs.`,
  propertyAddress: `<strong>Can I save my answers and return later?</strong><br/>Yes. Your answers are saved automatically as you proceed through each tab.`,
  furnishings: `<strong>What are furnishings?</strong><br/>Furnishings are furniture, appliances, and movable items (e.g. curtains, carpets, beds, refrigerators) that are included with the property and add to the tenant's comfort.`,
  landlord: `<strong>Who is the landlord?</strong><br/>The landlord is the person or entity who owns the property and rents it out in exchange for rent.<br/><br/><strong>What is a property manager?</strong><br/>A property manager deals with the tenant on behalf of the landlord, typically for a fee.`,
  tenant: `<strong>How is an occupant different from a tenant?</strong><br/>A tenant signs the rental agreement and is responsible for paying rent. An occupant lives on the property but has not signed the agreement (e.g. family members).`,
  guarantor: `<strong>What is a guarantor?</strong><br/>A guarantor agrees to be liable to the landlord for any breach by the tenant. If the tenant fails to pay rent, the landlord can recover from the guarantor. A guarantor is NOT one of the tenants.`,
  rent: `<strong>Are there rules about how much to charge for rent?</strong><br/>Different states have different rent control laws. Some states have "fair rent" rules. Ensure your rent amount complies with your local Rent Control Act.`,
  deposit: `<strong>What is a rental deposit?</strong><br/>A rental or security deposit is a sum paid by the tenant to guarantee they will fulfil their obligations. It must be refunded at the end of the tenancy, less lawful deductions for unpaid rent or damage beyond normal wear and tear.`,
  termination: `<strong>Why does the landlord need to give notice before entering the property?</strong><br/>Once rented, the property is the tenant's home. The landlord generally has no right to enter without notice except in genuine emergencies. Typically 24–48 hours written notice is considered reasonable.`,
  utilities: `<strong>What are additional charges?</strong><br/>Additional charges are costs for utilities and services such as electricity, water, sanitation, and property tax. Different states have different rules on what landlords may charge tenants. Ensure any charge you include is permitted by local law.`,
  improvements: `<strong>What are landlord improvements?</strong><br/>Landlord improvements are extra work done to the property by the landlord, typically before the tenant moves in. This can range from repainting to complex renovations. Be specific about what work is to be done, materials, and completion deadlines.`,
  contactAddress: `<strong>What is the address for notice?</strong><br/>The address for notice is where the other party can send legal notices during and after the rental. The tenant's notice address during the tenancy is the leased property. After the tenancy ends, a separate post-tenancy address is needed.`,
  inspection: `<strong>What is an inspection report?</strong><br/>An inspection report is a written record of the property's condition at the start and end of the tenancy. It protects both parties — the tenant is not charged for pre-existing damage, and the landlord can document any new damage caused by the tenant.`,
  additionalClauses: `<strong>When should I include an additional clause?</strong><br/>Include an additional clause for any terms unique to your situation not covered by the standard questionnaire.<br/><br/><strong>How should I write my clause?</strong><br/>Use plain language, limit each clause to one paragraph, and use defined terms from the agreement (Tenant, Landlord, Property, etc.).`,
};

// ─── Renewal term options ─────────────────────────────────────────────────────
export const RENEWAL_TERM_OPTIONS = [
  { value: '11months', label: '11 Months' },
  { value: '1month', label: '1 Month' },
  { value: '3months', label: '3 Months' },
  { value: '6months', label: '6 Months' },
  { value: '1year', label: '1 Year' },
  { value: 'other', label: 'Other' },
];

export const RENEWAL_TERM_LABELS: Record<string, string> = {
  '11months': '11 months',
  '1month': '1 month',
  '3months': '3 months',
  '6months': '6 months',
  '1year': '1 year',
  'other': '',
};

// ─── Wizard Tabs & Questions ──────────────────────────────────────────────────
// To add a new question: add an entry to the relevant group's `questions` array.
// To change conditional logic: update the `showIf` function.
// The React wizard reads this and renders all inputs automatically.

export const HOUSE_WIZARD_TABS: WizardTab[] = [
  // ══════════ TAB 1: General ══════════
  {
    id: 'general',
    label: 'General',
    groups: [
      {
        id: 'location',
        title: 'Property Location',
        faqKey: 'location',
        questions: [
          {
            id: 'governingLaw',
            label: 'State / Union Territory',
            type: 'radio', // rendered as dropdown in UI
            options: INDIAN_STATES.map(s => ({ value: s.value, label: s.label })),
            required: true,
            placeholder: 'Select state or union territory',
          },
          {
            id: 'governingLawLabel',
            label: 'Governing Law (courts)',
            type: 'readonly',
            helpText: 'Auto-populated from state selection',
          },
        ],
      },
      {
        id: 'rentalDetails',
        title: 'Rental Details',
        faqKey: 'leaseTerms',
        questions: [
          {
            id: 'leaseTermType',
            label: 'Does your rental end on a set end date?',
            type: 'radio',
            options: [
              { value: 'fixedTerm', label: 'Ends on a set date (Fixed Term)' },
              { value: 'automaticRenewal', label: 'Has no set end date (Automatic Renewal)' },
            ],
            required: true,
          },
          {
            id: 'leaseStartDate',
            label: 'Rental start date',
            type: 'date',
            required: true,
          },
          {
            id: 'fixedEndDateEnd',
            label: 'Rental end date',
            type: 'date',
            required: true,
            showIf: (s) => s.leaseTermType === 'fixedTerm',
          },
          {
            id: 'possessionDate',
            label: 'Possession / move-in date',
            type: 'date',
            required: true,
          },
          {
            id: 'renewalTermType',
            label: 'Renewal term',
            type: 'radio',
            options: RENEWAL_TERM_OPTIONS,
            showIf: (s) => s.leaseTermType === 'automaticRenewal',
          },
          {
            id: 'renewalTermOther',
            label: 'Specify renewal term',
            type: 'text',
            placeholder: 'e.g. 2 months',
            showIf: (s) => s.leaseTermType === 'automaticRenewal' && s.renewalTermType === 'other',
          },
        ],
      },
    ],
  },

  // ══════════ TAB 2: Property ══════════
  {
    id: 'property',
    label: 'Property',
    groups: [
      {
        id: 'propertyAddress',
        title: 'Property Address',
        faqKey: 'propertyAddress',
        questions: [
          {
            id: 'propertyAddress',
            label: 'Rental property address',
            type: 'textarea',
            required: true,
            placeholder: 'e.g. Street Address, Locality, City/Town, State, PIN Code',
          },
          {
            id: 'propertyPhoto',
            label: 'Will photos of the property be attached to the final document?',
            type: 'yesno',
          },
          {
            id: 'furtherDescribe',
            label: 'Would you like to provide additional details about the property?',
            type: 'yesno',
          },
          {
            id: 'describeProperty',
            label: 'Additional property details',
            type: 'textarea',
            placeholder: 'Describe any additional details about the property...',
            showIf: (s) => s.furtherDescribe === 'yes',
          },
        ],
      },
      {
        id: 'propertyDetails',
        title: 'Property Details',
        faqKey: 'furnishings',
        questions: [
          {
            id: 'furnished',
            label: 'Is the house furnished?',
            type: 'radio',
            options: [
              { value: 'fully', label: 'Fully Furnished' },
              { value: 'semi', label: 'Semi-Furnished' },
              { value: 'unfurnished', label: 'Unfurnished' },
            ],
            required: true,
          },
          {
            id: 'showFurnishedList',
            label: 'Would you like to list the furnishings included?',
            type: 'yesno',
            showIf: (s) => s.furnished !== 'unfurnished',
          },
          {
            id: 'furnishedList',
            label: 'List of furnishings included',
            type: 'textarea',
            placeholder: 'e.g. 2 ACs, refrigerator, washing machine, modular kitchen, sofa set, dining table, 2 beds with mattresses...',
            showIf: (s) => s.furnished !== 'unfurnished' && s.showFurnishedList === 'yes',
          },
        ],
      },
    ],
  },

  // ══════════ TAB 3: Parties ══════════
  {
    id: 'parties',
    label: 'Parties',
    groups: [
      {
        id: 'landlordInfo',
        title: 'Landlord Information',
        faqKey: 'landlord',
        questions: [
          {
            id: 'landlordType',
            label: 'Landlord type',
            type: 'radio',
            options: [
              { value: 'individual', label: 'Individual' },
              { value: 'company', label: 'Company / Organisation' },
            ],
            required: true,
          },
          {
            id: 'landlords',
            label: 'Landlord full name',
            type: 'repeater',
            required: true,
            placeholder: 'Enter full legal name',
          },
          {
            id: 'propertyManager',
            label: 'Is there a property manager?',
            type: 'yesno',
          },
          {
            id: 'propertyManagerName',
            label: 'Property manager full name',
            type: 'text',
            placeholder: 'Enter property manager\'s full name',
            showIf: (s) => s.propertyManager === 'yes',
          },
          {
            id: 'landlordPhone',
            label: 'Landlord\'s phone number',
            type: 'text',
            placeholder: '+91 98765 43210',
          },
          {
            id: 'landlordEmail',
            label: 'Landlord\'s email address',
            type: 'text',
            placeholder: 'landlord@example.com',
          },
          {
            id: 'landlordAddress',
            label: 'Landlord\'s permanent address',
            type: 'textarea',
            placeholder: 'Full permanent residential address',
          },
          {
            id: 'rentAddressSameLandlord',
            label: 'Where should rent payments be sent?',
            type: 'radio',
            options: [
              { value: 'yes', label: 'Same as landlord\'s address' },
              { value: 'no', label: 'Different address' },
            ],
          },
          {
            id: 'rentAddress',
            label: 'Rent payment address',
            type: 'textarea',
            placeholder: 'Enter the address where rent should be sent',
            showIf: (s) => s.rentAddressSameLandlord === 'no',
          },
        ],
      },
      {
        id: 'tenantInfo',
        title: 'Tenant Information',
        faqKey: 'tenant',
        questions: [
          {
            id: 'tenants',
            label: 'Tenant full name',
            type: 'repeater',
            required: true,
            placeholder: 'Enter full legal name',
          },
          {
            id: 'otherOccupants',
            label: 'Are there other occupants not signing the agreement?',
            type: 'yesnodns',
          },
          {
            id: 'otherOccupantsList',
            label: 'List of other occupants',
            type: 'textarea',
            placeholder: 'Names of other people who will reside on the property',
            showIf: (s) => s.otherOccupants === 'yes',
          },
          {
            id: 'tenantPhone',
            label: 'Tenant\'s phone number',
            type: 'text',
            placeholder: '+91 98765 43210',
          },
          {
            id: 'tenantEmail',
            label: 'Tenant\'s email address',
            type: 'text',
            placeholder: 'tenant@example.com',
          },
          {
            id: 'tenantCurrentAddress',
            label: 'Tenant\'s current address',
            type: 'textarea',
            placeholder: 'Current residential address of the tenant',
          },
        ],
      },
      {
        id: 'guarantorInfo',
        title: 'Guarantor Information',
        faqKey: 'guarantor',
        questions: [
          {
            id: 'guarantorRequired',
            label: 'Is a guarantor required?',
            type: 'yesno',
          },
          {
            id: 'guarantorType',
            label: 'Guarantor type',
            type: 'radio',
            options: [
              { value: 'individual', label: 'Individual' },
              { value: 'company', label: 'Company / Organisation' },
            ],
            showIf: (s) => s.guarantorRequired === 'yes',
          },
          {
            id: 'guarantorName',
            label: 'Guarantor full name',
            type: 'text',
            placeholder: 'Enter full legal name',
            required: true,
            showIf: (s) => s.guarantorRequired === 'yes',
          },
          {
            id: 'guarantorAddress',
            label: 'Guarantor\'s address',
            type: 'textarea',
            placeholder: 'Full permanent address of the guarantor',
            showIf: (s) => s.guarantorRequired === 'yes',
          },
        ],
      },
    ],
  },

  // ══════════ TAB 4: Terms ══════════
  {
    id: 'terms',
    label: 'Terms',
    groups: [
      {
        id: 'rent',
        title: 'Rent',
        faqKey: 'rent',
        questions: [
          {
            id: 'rent',
            label: 'How much is the rent?',
            type: 'number',
            required: true,
            placeholder: '0',
          },
          {
            id: 'rentPaymentPeriod',
            label: 'How often is rent paid?',
            type: 'radio',
            options: [
              { value: 'monthly', label: 'Monthly' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'daily', label: 'Daily' },
            ],
            required: true,
          },
          {
            id: 'rentPayDay',
            label: 'What day is rent due?',
            type: 'text',
            placeholder: 'e.g. 5 (5th of every month)',
          },
          {
            id: 'rentPaidByCheque',
            label: 'Cheque',
            type: 'checkbox',
          },
          {
            id: 'rentPaidByCash',
            label: 'Cash',
            type: 'checkbox',
          },
          {
            id: 'rentPaidByBank',
            label: 'Bank Transfer (NEFT/RTGS/IMPS)',
            type: 'checkbox',
          },
          {
            id: 'bankAccountName',
            label: 'Bank account name',
            type: 'text',
            placeholder: 'Account holder name',
            showIf: (s) => s.rentPaidByBank,
          },
          {
            id: 'bankAccountNumber',
            label: 'Bank account number',
            type: 'text',
            placeholder: 'Account number',
            showIf: (s) => s.rentPaidByBank,
          },
          {
            id: 'rentPaidByOnline',
            label: 'Online / UPI',
            type: 'checkbox',
          },
          {
            id: 'rentPaidByOther',
            label: 'Other method',
            type: 'checkbox',
          },
          {
            id: 'rentPaidByOtherDescription',
            label: 'Describe other payment method',
            type: 'text',
            placeholder: 'Describe payment method',
            showIf: (s) => s.rentPaidByOther,
          },
        ],
      },
      {
        id: 'deposit',
        title: 'Deposit Details',
        faqKey: 'deposit',
        questions: [
          {
            id: 'securityDeposit',
            label: 'Is there a rental / security deposit?',
            type: 'yesno',
          },
          {
            id: 'securityDepositAmount',
            label: 'Deposit amount (₹)',
            type: 'number',
            placeholder: '0',
            required: true,
            showIf: (s) => s.securityDeposit === 'yes',
          },
          {
            id: 'specifyDepositDeadline',
            label: 'Would you like to specify a deadline for returning the deposit?',
            type: 'yesno',
            showIf: (s) => s.securityDeposit === 'yes',
          },
          {
            id: 'specifySecurityDepositDeadline',
            label: 'Deposit return deadline',
            type: 'text',
            placeholder: 'e.g. 30 days after the tenancy ends',
            showIf: (s) => s.securityDeposit === 'yes' && s.specifyDepositDeadline === 'yes',
          },
        ],
      },
      {
        id: 'useOfProperty',
        title: 'Use of Property',
        questions: [
          {
            id: 'pets',
            label: 'Are pets allowed?',
            type: 'radio',
            options: [
              { value: 'withconsent', label: 'Yes, with the Landlord\'s written consent' },
              { value: 'yes', label: 'Yes, pets are permitted' },
              { value: 'no', label: 'No, pets are not allowed' },
            ],
          },
          {
            id: 'smoking',
            label: 'Is smoking allowed on the property?',
            type: 'yesno',
          },
          {
            id: 'subletting',
            label: 'Can the tenant sublet the property?',
            type: 'yesno',
          },
        ],
      },
      {
        id: 'termination',
        title: 'Termination',
        faqKey: 'termination',
        questions: [
          {
            id: 'terminationNotice',
            label: 'Is notice required to end the rental?',
            type: 'yesnodns',
          },
          {
            id: 'noticeNumber',
            label: 'How much notice is required?',
            type: 'number',
            placeholder: '1',
            showIf: (s) => s.terminationNotice === 'yes',
          },
          {
            id: 'noticePeriodUnit',
            label: 'Notice period unit',
            type: 'radio',
            options: [
              { value: 'days', label: 'Days' },
              { value: 'weeks', label: 'Weeks' },
              { value: 'months', label: 'Months' },
            ],
            showIf: (s) => s.terminationNotice === 'yes',
          },
          {
            id: 'noticeToEnter',
            label: 'Does the landlord need to give notice before entering the property?',
            type: 'yesnodns',
          },
          {
            id: 'terminationNoticeTime',
            label: 'How much notice before entering?',
            type: 'number',
            placeholder: '24',
            showIf: (s) => s.noticeToEnter === 'yes',
          },
          {
            id: 'terminationNoticeTimeUnit',
            label: 'Entry notice unit',
            type: 'radio',
            options: [
              { value: 'hours', label: 'Hours' },
              { value: 'days', label: 'Days' },
            ],
            showIf: (s) => s.noticeToEnter === 'yes',
          },
        ],
      },
      {
        id: 'utilities',
        title: 'Additional Charges',
        faqKey: 'utilities',
        questions: [
          {
            id: 'utilElectricity',
            label: 'Electricity',
            type: 'utility_grid',
          },
          {
            id: 'utilWater',
            label: 'Water',
            type: 'utility_grid',
          },
          {
            id: 'utilSanitation',
            label: 'Sanitation',
            type: 'utility_grid',
          },
          {
            id: 'utilDrainage',
            label: 'Drainage',
            type: 'utility_grid',
          },
          {
            id: 'utilAC',
            label: 'Air Conditioning',
            type: 'utility_grid',
          },
          {
            id: 'utilPropertyTax',
            label: 'Property Tax',
            type: 'utility_grid',
          },
          {
            id: 'utilStorage',
            label: 'Storage',
            type: 'utility_grid',
          },
          {
            id: 'utilOther',
            label: 'Other',
            type: 'utility_grid',
          },
          {
            id: 'listUtilOther',
            label: 'Describe other utilities',
            type: 'text',
            placeholder: 'e.g. Generator, Cable TV, Internet',
            showIf: (s) => s.utilOther !== 'dns',
          },
        ],
      },
    ],
  },

  // ══════════ TAB 5: Final Details ══════════
  {
    id: 'finalDetails',
    label: 'Final Details',
    groups: [
      {
        id: 'improvements',
        title: 'Landlord Improvements',
        faqKey: 'improvements',
        questions: [
          {
            id: 'landlordImprovements',
            label: 'Will the landlord make improvements to the property before move-in?',
            type: 'yesno',
          },
          {
            id: 'listLandlordImprovements',
            label: 'Describe the improvements',
            type: 'textarea',
            placeholder: 'List improvements, materials, and completion dates...',
            showIf: (s) => s.landlordImprovements === 'yes',
          },
        ],
      },
      {
        id: 'contactAddress',
        title: 'Contact Address',
        faqKey: 'contactAddress',
        questions: [
          {
            id: 'tenantAddressNotices',
            label: 'Does the tenant have a separate address for official notices (other than the rental property)?',
            type: 'yesno',
          },
          {
            id: 'tenantNoticeAddress',
            label: 'Tenant\'s address for notices',
            type: 'textarea',
            placeholder: 'Address to send notices after tenancy ends',
            showIf: (s) => s.tenantAddressNotices === 'yes',
          },
          {
            id: 'landlordNoticeAddress',
            label: 'Landlord\'s address for notices',
            type: 'textarea',
            placeholder: 'Address to send notices to the landlord',
          },
        ],
      },
      {
        id: 'miscellaneous',
        title: 'Miscellaneous',
        faqKey: 'inspection',
        questions: [
          {
            id: 'inspectionReport',
            label: 'Will there be a property inspection report at the start and end of the tenancy?',
            type: 'yesnodns',
          },
          {
            id: 'stampPaperSpace',
            label: 'Is there stamp paper space needed for execution?',
            type: 'yesno',
          },
        ],
      },
      {
        id: 'additionalClauses',
        title: 'Additional Clauses',
        faqKey: 'additionalClauses',
        questions: [
          {
            id: 'additionalClauses',
            label: 'Would you like to add any additional clauses?',
            type: 'yesno',
          },
          {
            id: 'additionalClausesList',
            label: 'Additional clause',
            type: 'repeater',
            placeholder: 'Write your custom clause here...',
            showIf: (s) => s.additionalClauses === 'yes',
          },
        ],
      },
    ],
  },

  // ══════════ TAB 6: Signing ══════════
  {
    id: 'signing',
    label: 'Signing',
    groups: [
      {
        id: 'signingDetails',
        title: 'Signing Details',
        questions: [
          {
            id: 'signingDateType',
            label: 'When will the agreement be signed?',
            type: 'radio',
            options: [
              { value: 'specific', label: 'On a specific date' },
              { value: 'undetermined', label: 'Date to be determined' },
            ],
          },
          {
            id: 'longformDate',
            label: 'Signing date',
            type: 'date',
            showIf: (s) => s.signingDateType === 'specific',
          },
          {
            id: 'signingCity',
            label: 'Where will the agreement be signed?',
            type: 'text',
            placeholder: 'e.g. Bengaluru',
            required: true,
          },
        ],
      },
    ],
  },
];

// ─── Document Clause Definitions ──────────────────────────────────────────────
// To add a clause: add one entry below. The compiler will pick it up automatically.
// To remove a clause: delete its entry. Nothing else changes.
// showIf === undefined means the clause ALWAYS appears.

const fmtDate = (iso: string): string => {
  if (!iso) return '___________';
  const d = new Date(iso);
  const day = d.getDate();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${day}${day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} day of ${months[d.getMonth()]}, ${d.getFullYear()}`;
};

const fmtCurrency = (n: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);

const utilLabel = (v: string): string =>
  v === 'landlord' ? 'Landlord' : v === 'tenant' ? 'Tenant' : '—';

export const HOUSE_DOCUMENT_CLAUSES: DocumentClause[] = [
  // ── STAMP PAPER SPACE (conditional — appears at very top if selected) ──
  {
    id: 'stamp_paper_space',
    showIf: (s) => s.stampPaperSpace === 'yes',
    compile: () => `
      <div style="border: 2px solid #000; padding: 40px; text-align: center; margin-bottom: 40px; min-height: 200px;">
        <p style="font-size: 14px; color: #666;">[STAMP PAPER SPACE]</p>
        <p style="font-size: 12px; color: #999;">Affix stamp paper of appropriate value as required under the Indian Stamp Act, 1899 and applicable state stamp duty laws.</p>
      </div>`,
  },

  // ── TITLE ──
  {
    id: 'title',
    compile: () => `<h1 style="text-align:center; font-size:20px; font-weight:bold; letter-spacing:2px; margin-bottom:8px;">RESIDENTIAL RENTAL AGREEMENT</h1>
    <p style="text-align:center; font-size:13px; color:#555; margin-bottom:24px;">(House)</p>`,
  },

  // ── PREAMBLE ──
  {
    id: 'preamble',
    compile: (s) => {
      const stateInfo = INDIAN_STATES.find(st => st.value === s.governingLaw);
      const city = s.signingCity || s.signingDateType === 'specific' ? (s.signingCity || '___________') : '___________';
      const dateStr = s.signingDateType === 'specific' ? fmtDate(s.longformDate) : '___ day of ___________, ______';
      return `<p>This Residential Rental Agreement is made and executed on this <strong>${dateStr}</strong>, at <strong>${city}</strong>, <strong>${stateInfo?.label || '___________'}</strong>, India.</p>
      <p><strong>BETWEEN:</strong></p>`;
    },
  },

  // ── PARTIES ──
  {
    id: 'parties',
    compile: (s) => {
      const landlordNames = s.landlords.filter(n => n.trim()).join(' and ');
      const tenantNames = s.tenants.filter(n => n.trim()).join(' and ');
      const rentPayAddr = s.rentAddressSameLandlord === 'yes' ? (s.landlordAddress || '___________') : (s.rentAddress || '___________');

      let html = `<p><strong>LANDLORD:</strong> <strong>${landlordNames || '___________'}</strong>`;
      if (s.landlordAddress) html += `, residing at ${s.landlordAddress}`;
      html += `, hereinafter referred to as the <strong>"Landlord"</strong> (which expression shall, unless repugnant to the context, include their heirs, executors, administrators, and permitted assigns), of the <strong>FIRST PART</strong>;</p>`;

      if (s.propertyManager === 'yes' && s.propertyManagerName) {
        html += `<p><strong>PROPERTY MANAGER:</strong> <strong>${s.propertyManagerName}</strong>, acting as property manager on behalf of the Landlord;</p>`;
      }

      html += `<p style="margin: 12px 0;"><strong>AND</strong></p>`;

      html += `<p><strong>TENANT:</strong> <strong>${tenantNames || '___________'}</strong>`;
      if (s.tenantCurrentAddress) html += `, currently residing at ${s.tenantCurrentAddress}`;
      html += `, hereinafter referred to as the <strong>"Tenant"</strong> (which expression shall, unless repugnant to the context, include their successors and permitted assigns), of the <strong>SECOND PART</strong>;</p>`;

      if (s.guarantorRequired === 'yes' && s.guarantorName) {
        html += `<p style="margin: 12px 0;"><strong>AND</strong></p>`;
        html += `<p><strong>GUARANTOR:</strong> <strong>${s.guarantorName}</strong>`;
        if (s.guarantorAddress) html += `, residing at ${s.guarantorAddress}`;
        html += `, hereinafter referred to as the <strong>"Guarantor"</strong>, of the <strong>THIRD PART</strong>.</p>`;
      }

      html += `<p>The Landlord, Tenant${s.guarantorRequired === 'yes' ? ', and Guarantor' : ''} are hereinafter collectively referred to as the <strong>"Parties"</strong>.</p>`;
      html += `<p>The Landlord agrees to let and the Tenant agrees to take on rent the property described herein, on the following terms and conditions:</p>`;
      return html;
    },
  },

  // ── 1. PROPERTY ──
  {
    id: 'property',
    sectionNumber: 1,
    heading: '1. PROPERTY',
    compile: (s) => {
      let html = `<h2>1. PROPERTY</h2>`;
      html += `<p>The Landlord hereby lets and the Tenant hereby takes on rent the residential House situated at: <strong>${s.propertyAddress || '___________'}</strong> (hereinafter referred to as the <strong>"Property"</strong>).</p>`;

      if (s.furnished !== 'unfurnished') {
        const level = s.furnished === 'fully' ? 'Fully Furnished' : 'Semi-Furnished';
        html += `<p>The Property is rented on a <strong>${level}</strong> basis.`;
        if (s.showFurnishedList === 'yes' && s.furnishedList.trim()) {
          html += ` The following items of furniture and fittings are included with the Property: <strong>${s.furnishedList}</strong>.`;
        }
        html += `</p>`;
      }

      if (s.propertyPhoto === 'yes') {
        html += `<p>Photographs of the Property are attached to this Agreement as <strong>Schedule A</strong> and form part of this Agreement.</p>`;
      }

      if (s.furtherDescribe === 'yes' && s.describeProperty.trim()) {
        html += `<p><strong>Additional Property Details:</strong> ${s.describeProperty}</p>`;
      }

      return html;
    },
  },

  // ── 2. TERM ──
  {
    id: 'term',
    sectionNumber: 2,
    heading: '2. TERM',
    compile: (s) => {
      let html = `<h2>2. TERM</h2>`;

      if (s.leaseTermType === 'fixedTerm') {
        html += `<p>The tenancy shall commence on <strong>${fmtDate(s.leaseStartDate)}</strong> and shall end on <strong>${fmtDate(s.fixedEndDateEnd)}</strong> (the <strong>"Term"</strong>), unless sooner terminated in accordance with the terms of this Agreement.</p>`;
      } else {
        const renewalLabel = s.renewalTermType === 'other' ? s.renewalTermOther : RENEWAL_TERM_LABELS[s.renewalTermType] || s.renewalTermType;
        html += `<p>The tenancy shall commence on <strong>${fmtDate(s.leaseStartDate)}</strong> and shall continue on an automatic renewal basis, renewing every <strong>${renewalLabel || '___________'}</strong>, until terminated by either Party in accordance with the terms of this Agreement.</p>`;
      }

      html += `<p>The Tenant shall take possession of the Property on <strong>${fmtDate(s.possessionDate)}</strong> (the <strong>"Possession Date"</strong>).</p>`;
      return html;
    },
  },

  // ── 3. RENT ──
  {
    id: 'rent',
    sectionNumber: 3,
    heading: '3. RENT',
    compile: (s) => {
      let html = `<h2>3. RENT</h2>`;
      const period = s.rentPaymentPeriod === 'monthly' ? 'month' : s.rentPaymentPeriod === 'weekly' ? 'week' : 'day';
      html += `<p>The Tenant shall pay to the Landlord a rent of <strong>${fmtCurrency(s.rent)}</strong> per <strong>${period}</strong>`;
      if (s.rentPayDay) html += `, due on or before the <strong>${s.rentPayDay}${['11','12','13'].includes(s.rentPayDay) ? 'th' : s.rentPayDay.endsWith('1') ? 'st' : s.rentPayDay.endsWith('2') ? 'nd' : s.rentPayDay.endsWith('3') ? 'rd' : 'th'}</strong> day of each ${period}`;
      html += `.</p>`;

      const methods: string[] = [];
      if (s.rentPaidByCheque) methods.push('Cheque');
      if (s.rentPaidByCash) methods.push('Cash');
      if (s.rentPaidByBank) methods.push('Bank Transfer (NEFT/RTGS/IMPS)');
      if (s.rentPaidByOnline) methods.push('Online / UPI');
      if (s.rentPaidByOther && s.rentPaidByOtherDescription) methods.push(s.rentPaidByOtherDescription);

      if (methods.length > 0) {
        html += `<p>Rent shall be paid by: <strong>${methods.join(', ')}</strong>.</p>`;
      }

      if (s.rentPaidByBank && (s.bankAccountName || s.bankAccountNumber)) {
        html += `<p>Bank Transfer Details: Account Name: <strong>${s.bankAccountName || '___________'}</strong>, Account Number: <strong>${s.bankAccountNumber || '___________'}</strong>.</p>`;
      }

      const payAddr = s.rentAddressSameLandlord === 'yes' ? (s.landlordAddress || '___________') : (s.rentAddress || '___________');
      html += `<p>Rent shall be paid to the Landlord at: <strong>${payAddr}</strong>.</p>`;
      return html;
    },
  },

  // ── 4. RENTAL DEPOSIT (conditional) ──
  {
    id: 'deposit',
    sectionNumber: 4,
    heading: '4. RENTAL DEPOSIT',
    showIf: (s) => s.securityDeposit === 'yes',
    compile: (s) => {
      let html = `<h2>4. RENTAL DEPOSIT</h2>`;
      html += `<p>The Tenant has paid / shall pay to the Landlord a refundable rental deposit of <strong>${fmtCurrency(s.securityDepositAmount)}</strong> (the <strong>"Deposit"</strong>) upon the signing of this Agreement.</p>`;
      html += `<p>The Deposit is held by the Landlord as security for the Tenant's performance of their obligations under this Agreement. The Landlord shall not use the Deposit to cover normal wear and tear to the Property.</p>`;

      if (s.specifyDepositDeadline === 'yes' && s.specifySecurityDepositDeadline.trim()) {
        html += `<p>The Landlord shall refund the Deposit to the Tenant within <strong>${s.specifySecurityDepositDeadline}</strong> of the end of the tenancy, less any lawful deductions for unpaid rent or damage to the Property caused by the Tenant beyond normal wear and tear.</p>`;
      } else {
        html += `<p>The Landlord shall refund the Deposit to the Tenant within a reasonable time after the end of the tenancy, less any lawful deductions for unpaid rent or damage beyond normal wear and tear.</p>`;
      }
      return html;
    },
  },

  // ── 5. USE OF PROPERTY ──
  {
    id: 'useOfProperty',
    sectionNumber: 5,
    heading: '5. USE OF PROPERTY',
    compile: (s) => {
      let html = `<h2>5. USE OF PROPERTY</h2>`;
      html += `<p>The Tenant shall use the Property exclusively as a private residential dwelling and for no other purpose without the prior written consent of the Landlord.</p>`;

      // Subletting
      if (s.subletting === 'yes') {
        html += `<p><strong>Subletting:</strong> The Tenant may sublet the Property or any part thereof with the prior written consent of the Landlord.</p>`;
      } else {
        html += `<p><strong>Subletting:</strong> The Tenant shall not sublet the Property or any part thereof, or assign this Agreement, without the prior written consent of the Landlord. Any unauthorised subletting shall be grounds for immediate termination of this Agreement.</p>`;
      }

      // Pets
      if (s.pets === 'withconsent') {
        html += `<p><strong>Pets:</strong> The Tenant may keep pets on the Property only with the prior written consent of the Landlord. The Tenant shall be responsible for any damage caused by pets.</p>`;
      } else if (s.pets === 'yes') {
        html += `<p><strong>Pets:</strong> The Tenant is permitted to keep pets on the Property.</p>`;
      } else {
        html += `<p><strong>Pets:</strong> No pets of any kind shall be kept on the Property without the express prior written consent of the Landlord.</p>`;
      }

      // Smoking
      if (s.smoking === 'yes') {
        html += `<p><strong>Smoking:</strong> Smoking is permitted on the Property.</p>`;
      } else {
        html += `<p><strong>Smoking:</strong> Smoking of any substance is strictly prohibited inside the Property.</p>`;
      }

      html += `<p>The Tenant shall maintain the Property in a clean and tidy condition, and shall not make any structural alterations or additions to the Property without the prior written consent of the Landlord.</p>`;
      return html;
    },
  },

  // ── 6. ADDITIONAL CHARGES / UTILITIES ──
  {
    id: 'utilities',
    sectionNumber: 6,
    heading: '6. ADDITIONAL CHARGES',
    compile: (s) => {
      let html = `<h2>6. ADDITIONAL CHARGES</h2>`;
      html += `<p>The responsibility for the following charges is allocated as specified:</p>`;
      html += `<table style="width:100%; border-collapse:collapse; margin: 12px 0;">`;
      html += `<thead><tr style="background:#f3f4f6;"><th style="text-align:left;padding:8px;border:1px solid #ddd;">Utility / Service</th><th style="text-align:center;padding:8px;border:1px solid #ddd;">Paid By</th></tr></thead>`;
      html += `<tbody>`;

      const rows: { label: string; val: string }[] = [
        { label: 'Electricity', val: s.utilElectricity },
        { label: 'Water', val: s.utilWater },
        { label: 'Sanitation', val: s.utilSanitation },
        { label: 'Drainage', val: s.utilDrainage },
        { label: 'Air Conditioning', val: s.utilAC },
        { label: 'Property Tax', val: s.utilPropertyTax },
        { label: 'Storage', val: s.utilStorage },
      ];

      if (s.utilOther !== 'dns') {
        rows.push({ label: `Other (${s.listUtilOther || 'Other Utilities'})`, val: s.utilOther });
      }

      rows.forEach((row, i) => {
        if (row.val === 'dns') return;
        html += `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">`;
        html += `<td style="padding:8px;border:1px solid #ddd;">${row.label}</td>`;
        html += `<td style="text-align:center;padding:8px;border:1px solid #ddd;font-weight:600;">${utilLabel(row.val)}</td>`;
        html += `</tr>`;
      });

      html += `</tbody></table>`;
      return html;
    },
  },

  // ── 7. TERMINATION / NOTICE (conditional) ──
  {
    id: 'termination',
    sectionNumber: 7,
    heading: '7. TERMINATION AND NOTICE',
    compile: (s) => {
      let html = `<h2>7. TERMINATION AND NOTICE</h2>`;

      if (s.terminationNotice === 'yes') {
        html += `<p>Either Party may terminate this Agreement by giving <strong>${s.noticeNumber} ${s.noticePeriodUnit}</strong> written notice to the other Party. Notice shall be delivered to the address for notices specified in this Agreement.</p>`;
      } else if (s.terminationNotice === 'no') {
        html += `<p>This Agreement may be terminated in accordance with applicable law. No specific notice period has been agreed upon by the Parties.</p>`;
      } else {
        html += `<p>This Agreement may be terminated in accordance with applicable state Rent Control laws and the Transfer of Property Act, 1882.</p>`;
      }

      if (s.noticeToEnter === 'yes') {
        html += `<p><strong>Landlord's Right to Enter:</strong> The Landlord shall give the Tenant at least <strong>${s.terminationNoticeTime} ${s.terminationNoticeTimeUnit}</strong> written notice before entering the Property, except in the case of a genuine emergency.</p>`;
      } else if (s.noticeToEnter === 'dns') {
        html += `<p><strong>Landlord's Right to Enter:</strong> The Landlord may enter the Property upon giving reasonable notice to the Tenant, except in genuine emergencies.</p>`;
      }

      return html;
    },
  },

  // ── 8. LANDLORD IMPROVEMENTS (conditional) ──
  {
    id: 'landlordImprovements',
    sectionNumber: 8,
    heading: '8. LANDLORD IMPROVEMENTS',
    showIf: (s) => s.landlordImprovements === 'yes',
    compile: (s) => {
      let html = `<h2>8. LANDLORD IMPROVEMENTS</h2>`;
      html += `<p>The Landlord agrees to complete the following improvements to the Property prior to the Tenant taking possession:</p>`;
      html += `<p>${s.listLandlordImprovements || '___________'}</p>`;
      return html;
    },
  },

  // ── 9. INSPECTION REPORT (conditional) ──
  {
    id: 'inspectionReport',
    sectionNumber: 9,
    heading: '9. INSPECTION REPORT',
    showIf: (s) => s.inspectionReport === 'yes',
    compile: () => `
      <h2>9. INSPECTION REPORT</h2>
      <p>An Inspection Report recording the condition of the Property shall be completed by both Parties at the commencement of the tenancy and again at the end of the tenancy. The Inspection Report shall form part of this Agreement and shall be used to determine the condition of the Property and to settle any dispute regarding the Deposit deductions.</p>`,
  },

  // ── 10. GOVERNING LAW ──
  {
    id: 'governingLaw',
    sectionNumber: 10,
    heading: '10. GOVERNING LAW AND JURISDICTION',
    compile: (s) => {
      const stateInfo = INDIAN_STATES.find(st => st.value === s.governingLaw);
      const stateName = stateInfo?.label || '___________';
      const courts = stateInfo?.courts || s.signingCity || '___________';
      return `<h2>10. GOVERNING LAW AND JURISDICTION</h2>
      <p>This Agreement shall be governed by and construed in accordance with the laws of India, including the Transfer of Property Act, 1882, the Indian Contract Act, 1872, and the applicable Rent Control legislation of the State of <strong>${stateName}</strong>.</p>
      <p>Any disputes arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the competent courts at <strong>${courts}</strong>.</p>`;
    },
  },

  // ── 11. ADDITIONAL CLAUSES (conditional, repeating) ──
  {
    id: 'additionalClauses',
    sectionNumber: 11,
    heading: '11. ADDITIONAL CLAUSES',
    showIf: (s) => s.additionalClauses === 'yes' && s.additionalClausesList.some(c => c.trim()),
    compile: (s) => {
      const clauses = s.additionalClausesList.filter(c => c.trim());
      let html = `<h2>11. ADDITIONAL CLAUSES</h2>`;
      clauses.forEach((clause, i) => {
        html += `<p><strong>11.${i + 1}</strong> ${clause}</p>`;
      });
      return html;
    },
  },

  // ── 12. CONTACT ADDRESS FOR NOTICES ──
  {
    id: 'contactAddress',
    sectionNumber: 12,
    heading: '12. CONTACT ADDRESS FOR NOTICES',
    compile: (s) => {
      const tenantNoticeAddr = s.tenantAddressNotices === 'yes' && s.tenantNoticeAddress.trim()
        ? s.tenantNoticeAddress
        : s.propertyAddress || '___________';
      const landlordNoticeAddr = s.landlordNoticeAddress.trim() || s.landlordAddress || '___________';

      return `<h2>12. CONTACT ADDRESS FOR NOTICES</h2>
      <p>All notices under this Agreement shall be in writing and delivered to the following addresses:</p>
      <p><strong>Landlord:</strong> ${landlordNoticeAddr}</p>
      <p><strong>Tenant:</strong> ${tenantNoticeAddr}</p>`;
    },
  },

  // ── EXECUTION BLOCK ──
  {
    id: 'execution',
    compile: (s) => {
      const landlordNames = s.landlords.filter(n => n.trim());
      const tenantNames = s.tenants.filter(n => n.trim());
      const dateStr = s.signingDateType === 'specific' ? fmtDate(s.longformDate) : '___ day of ___________, ______';
      const city = s.signingCity || '___________';

      let html = `<hr style="margin: 40px 0; border: 1px solid #000;"/>`;
      html += `<p><strong>IN WITNESS WHEREOF</strong>, the Parties have executed this Residential Rental Agreement on this <strong>${dateStr}</strong>, at <strong>${city}</strong>.</p>`;

      html += `<table style="width:100%; margin-top:40px;">`;
      html += `<tr>`;

      // Landlord block(s)
      html += `<td style="vertical-align:top; width:50%; padding-right:20px;">`;
      landlordNames.forEach((name) => {
        html += `<p><strong>LANDLORD:</strong></p>
        <p style="margin-top:40px; border-top:1px solid #000; padding-top:4px;">${name}</p>
        <p style="margin-top:20px;">Date: ___________</p><br/>`;
      });
      html += `</td>`;

      // Tenant block(s)
      html += `<td style="vertical-align:top; width:50%; padding-left:20px;">`;
      tenantNames.forEach((name) => {
        html += `<p><strong>TENANT:</strong></p>
        <p style="margin-top:40px; border-top:1px solid #000; padding-top:4px;">${name}</p>
        <p style="margin-top:20px;">Date: ___________</p><br/>`;
      });
      html += `</td>`;

      html += `</tr>`;

      // Guarantor block
      if (s.guarantorRequired === 'yes' && s.guarantorName) {
        html += `<tr><td colspan="2" style="padding-top:20px;">`;
        html += `<p><strong>GUARANTOR:</strong></p>
        <p style="margin-top:40px; border-top:1px solid #000; padding-top:4px; width:200px;">${s.guarantorName}</p>
        <p style="margin-top:20px;">Date: ___________</p>`;
        html += `</td></tr>`;
      }

      // Witness blocks
      html += `<tr><td colspan="2" style="padding-top:40px;">`;
      html += `<p><strong>WITNESSES:</strong></p>`;
      html += `<table style="width:100%; margin-top:20px;"><tr>`;
      html += `<td style="width:50%;padding-right:20px;"><p style="margin-top:40px; border-top:1px solid #000; padding-top:4px;">Witness 1</p><p>Name: ___________</p><p>Address: ___________</p></td>`;
      html += `<td style="width:50%;padding-left:20px;"><p style="margin-top:40px; border-top:1px solid #000; padding-top:4px;">Witness 2</p><p>Name: ___________</p><p>Address: ___________</p></td>`;
      html += `</tr></table>`;
      html += `</td></tr>`;

      html += `</table>`;
      return html;
    },
  },
];

// ─── Template Variable Definitions (for DB seeding) ──────────────────────────
// These map wizard state fields to LexDraft TemplateVariable records.
// Used by seed.ts to register the template in the database.
export const HOUSE_TEMPLATE_SEED = {
  id: 'tpl_house_rental',
  name: 'Residential House Rental Agreement',
  category: 'Real Estate',
  description: 'A guided LawDepot-style wizard for creating legally structured Residential House Rental Agreements in India. Covers all standard clauses: term, rent, deposit, utilities, use of property, termination, and governing law — with full conditional question flow.',
  originalFileName: 'House_Rental_Agreement_Wizard_v1.0',
  contentTemplate: '<!-- WIZARD_GENERATED: This template is populated dynamically by the HouseRentalWizard. The contentTemplate field stores the compiled HTML at generation time. -->',
  version: '1.0',
};
