/* One-shot merge of rider.onboarding.vehicle i18n keys into en + ne.
 * Idempotent: overwrites only the rider.onboarding.vehicle sub-block. */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const enPath = path.join(ROOT, 'packages/i18n/locales/en.json')
const nePath = path.join(ROOT, 'packages/i18n/locales/ne.json')

const vehicleEn = {
  title: 'Vehicle details',
  subtitle: 'What will you ride for Chinooz?',
  comingSoon: 'Vehicle step continues here.',
  typeLabel: 'Vehicle type',
  typeBicycle: 'Bicycle',
  typeMotorbike: 'Motorbike',
  typeScooter: 'Scooter',
  typeBicycleNote: 'No plate needed. Great for short, eco-friendly trips in your zone.',
  typeMotorbikeNote: 'Plate and license required. Best for longer, faster deliveries.',
  typeScooterNote: 'Plate and license required. Easy to ride, lower fuel costs.',
  typeRequired: 'Please select a vehicle type',
  makeModelLabel: 'Make / model (optional)',
  makeModelPlaceholder: 'Honda CB Shine',
  makeModelHelper: 'The brand and model of your vehicle',
  plateLabel: 'Plate number',
  platePlaceholder: 'BA 1 PA 2024',
  plateHelper: 'Nepali plate format — auto capitalized',
  plateRequired: 'Plate number is required for motorized vehicles',
  plateOptional: 'Not required for bicycles',
  colorLabel: 'Color',
  colorPlaceholder: 'Black, Red, Blue...',
  colorHelper: 'The main color of your vehicle',
  requirementsTitle: 'Requirements',
  reqBicycle: 'No plate or license needed. Just a working bicycle and a helmet.',
  reqMotorized: 'Valid license, registration plate, and a helmet are required.',
  next: 'Next',
  nextAria: 'Save and continue to Documents step',
  back: 'Back',
  backAria: 'Go back to Personal details',
  saving: 'Saving...',
  saved: 'Progress saved',
  validationType: 'Please select a vehicle type',
  validationPlate: 'Plate number is required for motorized vehicles',
  validationColor: 'Color is required',
  dirtyTitle: 'Leave without saving?',
  dirtyBody: 'You have unsaved changes. They will be kept in your draft so you can resume later.',
  dirtyStay: 'Stay',
  dirtyLeave: 'Leave',
}

const vehicleNe = {
  title: 'सवारी विवरण',
  subtitle: 'चिनुजको लागि तपाईं के चलाउनुहुन्छ?',
  comingSoon: 'सवारी चरण यहाँ जारी छ।',
  typeLabel: 'सवारी प्रकार',
  typeBicycle: 'साइकल',
  typeMotorbike: 'मोटरबाइक',
  typeScooter: 'स्कुटर',
  typeBicycleNote: 'नम्बर प्लेट चाहिँदैन। आफ्नो जोनमा छोटो, वातावरणमैत्री यात्राको लागि उपयुक्त।',
  typeMotorbikeNote: 'प्लेट र लाइसेन्स चाहिन्छ। लामो, छिटो डेलिभरीको लागि उत्तम।',
  typeScooterNote: 'प्लेट र लाइसेन्स चाहिन्छ। चलाउन सजिलो, कम इन्धन खर्च।',
  typeRequired: 'कृपया सवारी प्रकार छान्नुहोस्',
  makeModelLabel: 'ब्रान्ड / मोडेल (वैकल्पिक)',
  makeModelPlaceholder: 'Honda CB Shine',
  makeModelHelper: 'तपाईंको सवारीको ब्रान्ड र मोडेल',
  plateLabel: 'नम्बर प्लेट',
  platePlaceholder: 'BA 1 PA 2024',
  plateHelper: 'नेपाली प्लेट ढाँचा — स्वतः क्यापिटल',
  plateRequired: 'मोटरयुक्त सवारीको लागि नम्बर प्लेट आवश्यक छ',
  plateOptional: 'साइकलको लागि चाहिँदैन',
  colorLabel: 'रङ',
  colorPlaceholder: 'कालो, रातो, निलो...',
  colorHelper: 'तपाईंको सवारीको मुख्य रङ',
  requirementsTitle: 'आवश्यकताहरू',
  reqBicycle: 'प्लेट वा लाइसेन्स चाहिँदैन। एउटा चल्ने साइकल र हेल्मेट मात्र।',
  reqMotorized: 'मान्य लाइसेन्स, दर्ता प्लेट, र हेल्मेट आवश्यक छ।',
  next: 'अर्को',
  nextAria: 'सेभ गरेर कागजात चरणमा जानुहोस्',
  back: 'पछाडि',
  backAria: 'व्यक्तिगत विवरणमा फर्कनुहोस्',
  saving: 'सेभ गर्दै...',
  saved: 'प्रगति सेभ भयो',
  validationType: 'कृपया सवारी प्रकार छान्नुहोस्',
  validationPlate: 'मोटरयुक्त सवारीको लागि नम्बर प्लेट आवश्यक छ',
  validationColor: 'रङ आवश्यक छ',
  dirtyTitle: 'सेभ नगरी छोड्ने?',
  dirtyBody: 'तपाईंका सेभ नभएका परिवर्तनहरू ड्राफ्टमा राखिनेछन् ताकि पछि फेरि सुरु गर्न सकिन्छ।',
  dirtyStay: 'बस्नुहोस्',
  dirtyLeave: 'छोड्नुहोस्',
}

function merge(file, vehicle) {
  const raw = fs.readFileSync(file, 'utf8')
  const json = JSON.parse(raw)
  if (!json.rider || typeof json.rider !== 'object') json.rider = {}
  if (!json.rider.onboarding || typeof json.rider.onboarding !== 'object') json.rider.onboarding = {}
  json.rider.onboarding.vehicle = vehicle
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8')
  console.log('merged', path.basename(file))
}

merge(enPath, vehicleEn)
merge(nePath, vehicleNe)
console.log('done')
