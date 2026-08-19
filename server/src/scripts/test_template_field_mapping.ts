import { compileHouseAgreement } from '../../../src/utils/HouseAgreementCompiler';
import { HouseWizardState } from '../../../src/types/houseWizardTypes';

async function runAudit() {
  console.log('================================================================');
  console.log('  STARTING AUTOMATED TEMPLATE FIELD-MAPPING AUDIT');
  console.log('================================================================\n');

  // Base state with unique strings for every field
  const baseState: HouseWizardState = {
    governingLaw: 'KA', // Karnataka
    governingLawLabel: 'Karnataka',
    leaseTermType: 'fixedTerm',
    leaseStartDate: '2026-09-01',
    fixedEndDateEnd: '2027-07-31',
    possessionDate: '2026-09-01',
    renewalTermType: '11months',
    renewalTermOther: 'TEST_RENEWAL_TERM_OTHER_999',

    propertyAddress: 'TEST_PROPERTY_ADDRESS_123',
    propertyPhoto: 'yes',
    furtherDescribe: 'yes',
    describeProperty: 'TEST_DESCRIBE_PROPERTY_456',
    furnished: 'fully',
    furnishedList: 'TEST_FURNISHED_LIST_789',
    showFurnishedList: 'yes',

    landlordType: 'individual',
    landlords: ['TEST_LANDLORD_NAME_AAA', 'TEST_LANDLORD_NAME_BBB'],
    propertyManager: 'yes',
    propertyManagerName: 'TEST_PROPERTY_MANAGER_NAME_CCC',
    landlordPhone: 'TEST_LANDLORD_PHONE_DDD',
    landlordEmail: 'TEST_LANDLORD_EMAIL_EEE',
    landlordAddress: 'TEST_LANDLORD_ADDRESS_FFF',
    rentAddressSameLandlord: 'no',
    rentAddress: 'TEST_RENT_ADDRESS_GGG',

    tenants: ['TEST_TENANT_NAME_XXX', 'TEST_TENANT_NAME_YYY'],
    otherOccupants: 'yes',
    otherOccupantsList: 'TEST_OTHER_OCCUPANTS_LIST_ZZZ',
    tenantPhone: 'TEST_TENANT_PHONE_111',
    tenantEmail: 'TEST_TENANT_EMAIL_222',
    tenantCurrentAddress: 'TEST_TENANT_CURRENT_ADDRESS_333',

    guarantorRequired: 'yes',
    guarantorType: 'individual',
    guarantorName: 'TEST_GUARANTOR_NAME_444',
    guarantorAddress: 'TEST_GUARANTOR_ADDRESS_555',

    rent: 99999,
    rentPaymentPeriod: 'monthly',
    rentPayDay: '10',
    rentPaidByCheque: true,
    rentPaidByCash: true,
    rentPaidByBank: true,
    bankAccountName: 'TEST_BANK_ACCOUNT_NAME_666',
    bankAccountNumber: 'TEST_BANK_ACCOUNT_NUMBER_777',
    rentPaidByOnline: true,
    rentPaidByOther: true,
    rentPaidByOtherDescription: 'TEST_RENT_PAY_OTHER_888',

    securityDeposit: 'yes',
    securityDepositAmount: 88888,
    specifyDepositDeadline: 'yes',
    specifySecurityDepositDeadline: 'TEST_DEPOSIT_DEADLINE_999',

    pets: 'yes',
    smoking: 'yes',
    subletting: 'yes',

    terminationNotice: 'yes',
    noticeNumber: 5,
    noticePeriodUnit: 'months',
    noticeToEnter: 'yes',
    terminationNoticeTime: 48,
    terminationNoticeTimeUnit: 'hours',

    utilElectricity: 'landlord',
    utilWater: 'tenant',
    utilSanitation: 'landlord',
    utilDrainage: 'tenant',
    utilAC: 'landlord',
    utilPropertyTax: 'tenant',
    utilStorage: 'landlord',
    utilOther: 'tenant',
    listUtilOther: 'TEST_UTIL_OTHER_LABEL_FFF',

    landlordImprovements: 'yes',
    listLandlordImprovements: 'TEST_LANDLORD_IMPROVEMENTS_GGG',

    tenantAddressNotices: 'yes',
    tenantNoticeAddress: 'TEST_TENANT_NOTICE_ADDRESS_HHH',
    landlordNoticeAddress: 'TEST_LANDLORD_NOTICE_ADDRESS_III',

    inspectionReport: 'yes',
    stampPaperSpace: 'yes',

    additionalClauses: 'yes',
    additionalClausesList: ['TEST_ADDITIONAL_CLAUSE_JJJ', 'TEST_ADDITIONAL_CLAUSE_KKK'],

    signingDateType: 'specific',
    longformDate: '2026-08-19',
    signingCity: 'TEST_SIGNING_CITY_LLL',
  };

  // Run compilation
  console.log('🏃 Compiling document with all options enabled...');
  const html = compileHouseAgreement(baseState);

  // Define assertions for all mapped fields
  const assertions = [
    { label: 'Property Address', key: 'propertyAddress', value: baseState.propertyAddress, expected: true },
    { label: 'Property Photo Clause', key: 'propertyPhoto', value: 'attached to this Lease as Schedule A', expected: true },
    { label: 'Additional Property Details', key: 'describeProperty', value: baseState.describeProperty, expected: true },
    { label: 'Furnished List', key: 'furnishedList', value: baseState.furnishedList, expected: true },
    { label: 'Landlord Names', key: 'landlords', value: 'TEST_LANDLORD_NAME_AAA and TEST_LANDLORD_NAME_BBB', expected: true },
    { label: 'Property Manager Name', key: 'propertyManagerName', value: baseState.propertyManagerName, expected: true },
    { label: 'Landlord Notice Address', key: 'landlordNoticeAddress', value: baseState.landlordNoticeAddress, expected: true },
    { label: 'Landlord Phone', key: 'landlordPhone', value: baseState.landlordPhone, expected: true },
    { label: 'Landlord Email', key: 'landlordEmail', value: baseState.landlordEmail, expected: true },
    { label: 'Tenant Names', key: 'tenants', value: 'TEST_TENANT_NAME_XXX and TEST_TENANT_NAME_YYY', expected: true },
    { label: 'Tenant Phone', key: 'tenantPhone', value: baseState.tenantPhone, expected: true },
    { label: 'Tenant Email', key: 'tenantEmail', value: baseState.tenantEmail, expected: true },
    { label: 'Other Occupants List', key: 'otherOccupantsList', value: baseState.otherOccupantsList, expected: true },
    { label: 'Guarantor Name', key: 'guarantorName', value: baseState.guarantorName, expected: true },
    { label: 'Guarantor Address', key: 'guarantorAddress', value: baseState.guarantorAddress, expected: true },
    { label: 'Rent Account Name', key: 'bankAccountName', value: baseState.bankAccountName, expected: true },
    { label: 'Rent Account Number', key: 'bankAccountNumber', value: baseState.bankAccountNumber, expected: true },
    { label: 'Rent Other Method Description', key: 'rentPaidByOtherDescription', value: baseState.rentPaidByOtherDescription, expected: true },
    { label: 'Security Deposit Deadline', key: 'specifySecurityDepositDeadline', value: baseState.specifySecurityDepositDeadline, expected: true },
    { label: 'Custom Clauses List', key: 'additionalClausesList', value: 'TEST_ADDITIONAL_CLAUSE_JJJ', expected: true },
    { label: 'Landlord Improvements List', key: 'listLandlordImprovements', value: baseState.listLandlordImprovements, expected: true },
    { label: 'Signing City', key: 'signingCity', value: baseState.signingCity, expected: true },
  ];

  let failed = 0;
  console.log('\n📊 Auditing active field assertions:');
  for (const ass of assertions) {
    const present = html.includes(ass.value);
    if (present === ass.expected) {
      console.log(`✅ Passed: ${ass.label} matches expectation.`);
    } else {
      console.error(`❌ Failed: ${ass.label} (value: "${ass.value}") was ${present ? 'found' : 'not found'} but expected ${ass.expected ? 'present' : 'absent'}.`);
      failed++;
    }
  }

  // Test negative cases for conditional fields
  console.log('\n🧪 Testing disabled conditional cases...');
  const disabledState: HouseWizardState = {
    ...baseState,
    propertyPhoto: 'no',
    furtherDescribe: 'no',
    showFurnishedList: 'no',
    propertyManager: 'no',
    otherOccupants: 'no',
    guarantorRequired: 'no',
    rentPaidByBank: false,
    rentPaidByOther: false,
    securityDeposit: 'no',
    additionalClauses: 'no',
    landlordImprovements: 'no',
    tenantAddressNotices: 'no',
    inspectionReport: 'no',
  };

  const disabledHtml = compileHouseAgreement(disabledState);
  const disabledAssertions = [
    { label: 'Property Photo Clause (Disabled)', value: 'attached to this Lease as Schedule A', expected: false },
    { label: 'Additional Property Details (Disabled)', value: baseState.describeProperty, expected: false },
    { label: 'Furnished List (Disabled)', value: baseState.furnishedList, expected: false },
    { label: 'Property Manager (Disabled)', value: 'acting as property manager on behalf of the Landlord', expected: false },
    { label: 'Other Occupants (Disabled)', value: baseState.otherOccupantsList, expected: false },
    { label: 'Guarantor (Disabled)', value: baseState.guarantorName, expected: false },
    { label: 'Rent Account Info (Disabled)', value: baseState.bankAccountNumber, expected: false },
    { label: 'Security Deposit Section (Disabled)', value: 'Security Deposit', expected: false },
    { label: 'Custom Clauses (Disabled)', value: 'TEST_ADDITIONAL_CLAUSE_JJJ', expected: false },
    { label: 'Landlord Improvements (Disabled)', value: baseState.listLandlordImprovements, expected: false },
  ];

  for (const ass of disabledAssertions) {
    const present = disabledHtml.includes(ass.value);
    if (present === ass.expected) {
      console.log(`✅ Passed (Negative): ${ass.label} matches expectation.`);
    } else {
      console.error(`❌ Failed (Negative): ${ass.label} was ${present ? 'found' : 'not found'} but expected ${ass.expected ? 'present' : 'absent'}.`);
      failed++;
    }
  }

  console.log('\n================================================================');
  if (failed === 0) {
    console.log('🎉 ALL AUDIT AND FIELD-MAPPING TEST CASES PASSED SUCCESSFULLY!');
  } else {
    console.error(`❌ AUDIT FAILED: ${failed} mapping mismatches found.`);
    process.exit(1);
  }
  console.log('================================================================\n');
}

runAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
