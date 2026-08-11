// src/types/houseWizardTypes.ts
// Type definitions for the House Residential Rental Agreement Wizard.
// These types are consumed by houseRentalConfig.ts, HouseAgreementCompiler.ts,
// and HouseRentalWizard.tsx. Modifying here never requires changing the UI.

export type UtilityResponsibility = 'landlord' | 'tenant' | 'dns';
export type YesNo = 'yes' | 'no';
export type YesNoDns = 'yes' | 'no' | 'dns';
export type LeaseTermType = 'fixedTerm' | 'automaticRenewal';
export type LandlordType = 'individual' | 'company';
export type FurnishedLevel = 'fully' | 'semi' | 'unfurnished';
export type PetsPolicy = 'withconsent' | 'yes' | 'no';
export type RentPeriod = 'monthly' | 'weekly' | 'daily';
export type NoticePeriodUnit = 'days' | 'weeks' | 'months';
export type EntryNoticeUnit = 'hours' | 'days';

export type HouseTabId =
  | 'general'
  | 'property'
  | 'parties'
  | 'terms'
  | 'finalDetails'
  | 'signing';

// ─── Complete wizard state shape ──────────────────────────────────────────────
// Every question in all 6 tabs maps to one key here.
// The compiler and config both reference this single type.

export interface HouseWizardState {
  // ── TAB 1: General ──────────────────────────────────────────────────────
  governingLaw: string;              // Indian state/UT key (e.g. 'KA' for Karnataka)
  governingLawLabel: string;         // Human-readable state name (e.g. 'Karnataka')
  leaseTermType: LeaseTermType;
  leaseStartDate: string;            // ISO date string
  fixedEndDateEnd: string;           // ISO date — only used when leaseTermType === 'fixedTerm'
  possessionDate: string;            // ISO date
  renewalTermType: string;           // e.g. '11months', '1month', '1year', 'other'
  renewalTermOther: string;          // free-text if renewalTermType === 'other'

  // ── TAB 2: Property ──────────────────────────────────────────────────────
  propertyAddress: string;
  propertyPhoto: YesNo;
  furtherDescribe: YesNo;
  describeProperty: string;
  furnished: FurnishedLevel;
  furnishedList: string;             // listed inventory, shown if furnishedList toggle = yes
  showFurnishedList: YesNo;         // toggle to reveal furnishedList textarea

  // ── TAB 3: Parties ───────────────────────────────────────────────────────
  // Landlord
  landlordType: LandlordType;
  landlords: string[];               // array of landlord full names (min 1, repeater adds more)
  propertyManager: YesNo;
  propertyManagerName: string;
  landlordPhone: string;
  landlordEmail: string;
  landlordAddress: string;
  rentAddressSameLandlord: YesNo;
  rentAddress: string;

  // Tenant
  tenants: string[];                 // array of tenant full names (min 1, repeater adds more)
  otherOccupants: YesNoDns;
  otherOccupantsList: string;
  tenantPhone: string;
  tenantEmail: string;
  tenantCurrentAddress: string;

  // Guarantor
  guarantorRequired: YesNo;
  guarantorType: LandlordType;
  guarantorName: string;
  guarantorAddress: string;

  // ── TAB 4: Terms ─────────────────────────────────────────────────────────
  // Rent
  rent: number;
  rentPaymentPeriod: RentPeriod;
  rentPayDay: string;
  rentPaidByCheque: boolean;
  rentPaidByCash: boolean;
  rentPaidByBank: boolean;
  bankAccountName: string;
  bankAccountNumber: string;
  rentPaidByOnline: boolean;
  rentPaidByOther: boolean;
  rentPaidByOtherDescription: string;

  // Deposit
  securityDeposit: YesNo;
  securityDepositAmount: number;
  specifyDepositDeadline: YesNo;
  specifySecurityDepositDeadline: string;

  // Use of property
  pets: PetsPolicy;
  smoking: YesNo;
  subletting: YesNo;

  // Termination
  terminationNotice: YesNoDns;
  noticeNumber: number;
  noticePeriodUnit: NoticePeriodUnit;
  noticeToEnter: YesNoDns;
  terminationNoticeTime: number;
  terminationNoticeTimeUnit: EntryNoticeUnit;

  // Utilities grid
  utilElectricity: UtilityResponsibility;
  utilWater: UtilityResponsibility;
  utilSanitation: UtilityResponsibility;
  utilDrainage: UtilityResponsibility;
  utilAC: UtilityResponsibility;
  utilPropertyTax: UtilityResponsibility;
  utilStorage: UtilityResponsibility;
  utilOther: UtilityResponsibility;
  listUtilOther: string;

  // ── TAB 5: Final Details ─────────────────────────────────────────────────
  landlordImprovements: YesNo;
  listLandlordImprovements: string;

  tenantAddressNotices: YesNo;
  tenantNoticeAddress: string;
  landlordNoticeAddress: string;

  inspectionReport: YesNoDns;
  stampPaperSpace: YesNo;

  additionalClauses: YesNo;
  additionalClausesList: string[];   // repeater: each item is one custom clause

  // ── TAB 6: Signing ───────────────────────────────────────────────────────
  signingDateType: 'specific' | 'undetermined';
  longformDate: string;              // ISO date — used when signingDateType === 'specific'
  signingCity: string;
}

// ─── Configuration interfaces ─────────────────────────────────────────────────
// These are consumed by houseRentalConfig.ts to build the engine's schema.

export interface WizardQuestion {
  id: keyof HouseWizardState | string; // maps to a HouseWizardState key
  label: string;
  type:
    | 'text'
    | 'number'
    | 'date'
    | 'radio'
    | 'checkbox'
    | 'yesno'
    | 'dns'
    | 'yesnodns'
    | 'textarea'
    | 'repeater'
    | 'utility_grid'
    | 'readonly';
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  showIf?: (state: HouseWizardState) => boolean;
  helpText?: string;
}

export interface WizardGroup {
  id: string;
  title: string;
  faqKey?: string;
  questions: WizardQuestion[];
}

export interface WizardTab {
  id: HouseTabId;
  label: string;
  groups: WizardGroup[];
}

export interface DocumentClause {
  id: string;
  sectionNumber?: number;           // undefined for preamble / parties / execution
  heading?: string;                 // e.g. '1. PROPERTY'
  showIf?: (state: HouseWizardState) => boolean;
  compile: (state: HouseWizardState) => string; // returns formatted HTML
}

// ─── Default wizard state ─────────────────────────────────────────────────────
// Used to initialise the wizard. All fields have safe defaults.

export const DEFAULT_HOUSE_WIZARD_STATE: HouseWizardState = {
  governingLaw: '',
  governingLawLabel: '',
  leaseTermType: 'fixedTerm',
  leaseStartDate: new Date().toISOString().split('T')[0],
  fixedEndDateEnd: new Date(Date.now() + 11 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  possessionDate: new Date().toISOString().split('T')[0],
  renewalTermType: '11months',
  renewalTermOther: '',

  propertyAddress: '',
  propertyPhoto: 'no',
  furtherDescribe: 'no',
  describeProperty: '',
  furnished: 'unfurnished',
  furnishedList: '',
  showFurnishedList: 'no',

  landlordType: 'individual',
  landlords: [''],
  propertyManager: 'no',
  propertyManagerName: '',
  landlordPhone: '',
  landlordEmail: '',
  landlordAddress: '',
  rentAddressSameLandlord: 'yes',
  rentAddress: '',

  tenants: [''],
  otherOccupants: 'dns',
  otherOccupantsList: '',
  tenantPhone: '',
  tenantEmail: '',
  tenantCurrentAddress: '',

  guarantorRequired: 'no',
  guarantorType: 'individual',
  guarantorName: '',
  guarantorAddress: '',

  rent: 0,
  rentPaymentPeriod: 'monthly',
  rentPayDay: '5',
  rentPaidByCheque: true,
  rentPaidByCash: true,
  rentPaidByBank: false,
  bankAccountName: '',
  bankAccountNumber: '',
  rentPaidByOnline: false,
  rentPaidByOther: false,
  rentPaidByOtherDescription: '',

  securityDeposit: 'no',
  securityDepositAmount: 0,
  specifyDepositDeadline: 'no',
  specifySecurityDepositDeadline: '',

  pets: 'withconsent',
  smoking: 'no',
  subletting: 'no',

  terminationNotice: 'dns',
  noticeNumber: 1,
  noticePeriodUnit: 'months',
  noticeToEnter: 'dns',
  terminationNoticeTime: 24,
  terminationNoticeTimeUnit: 'hours',

  utilElectricity: 'tenant',
  utilWater: 'tenant',
  utilSanitation: 'tenant',
  utilDrainage: 'tenant',
  utilAC: 'tenant',
  utilPropertyTax: 'tenant',
  utilStorage: 'tenant',
  utilOther: 'dns',
  listUtilOther: '',

  landlordImprovements: 'no',
  listLandlordImprovements: '',

  tenantAddressNotices: 'no',
  tenantNoticeAddress: '',
  landlordNoticeAddress: '',

  inspectionReport: 'dns',
  stampPaperSpace: 'no',

  additionalClauses: 'no',
  additionalClausesList: [''],

  signingDateType: 'specific',
  longformDate: new Date().toISOString().split('T')[0],
  signingCity: '',
};
