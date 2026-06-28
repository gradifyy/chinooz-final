/* One-shot merge of rider.onboarding.documents i18n keys into en + ne.
 * Idempotent: overwrites only the rider.onboarding.documents sub-block. */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const enPath = path.join(ROOT, 'packages/i18n/locales/en.json')
const nePath = path.join(ROOT, 'packages/i18n/locales/ne.json')

const docsEn = {
  title: 'Document verification',
  subtitle: 'Upload your documents so we can verify your identity.',
  trustTitle: 'Your documents are safe with us',
  trustBody: 'We use your documents only to verify your identity and approve your account. They are encrypted, never shared with third parties, and you can request deletion at any time.',
  idFrontLabel: 'Citizenship / National ID — front',
  idFrontGuidance: 'Place the front of your ID on a flat surface. Ensure all text is clear and readable, with no glare.',
  idBackLabel: 'Citizenship / National ID — back',
  idBackGuidance: 'Photograph the back of your ID. Make sure all details are visible.',
  licenseLabel: 'Driving license',
  licenseGuidance: 'Photograph the front of your license. All text and your photo must be clearly visible.',
  registrationLabel: 'Vehicle registration (Blue Book)',
  registrationGuidance: 'Photograph the first page of your Blue Book. Ensure the plate number and chassis are readable.',
  selfieLabel: 'Selfie',
  selfieGuidance: 'Face the camera in good lighting. Remove sunglasses and hats. Look directly at the camera.',
  capture: 'Capture',
  upload: 'Upload',
  replace: 'Replace',
  retake: 'Retake',
  captureAria: 'Capture photo with camera',
  uploadAria: 'Upload photo from gallery',
  replaceAria: 'Replace uploaded photo',
  statusNotUploaded: 'Not uploaded',
  statusUploaded: 'Uploaded',
  statusPending: 'Pending review',
  requiredTag: 'Required',
  optionalTag: 'Optional',
  ifMotorized: 'Required for motorized vehicles',
  guidanceTitle: 'Photo tips',
  guidanceGoodLight: 'Use good, natural lighting',
  guidanceFlatSurface: 'Place document on a flat, dark surface',
  guidanceFillFrame: 'Fill the frame — no edges cut off',
  guidanceNoGlare: 'Avoid glare and reflections',
  guidanceSteady: 'Hold steady or tap to focus',
  next: 'Next',
  nextAria: 'Save and continue to Review step',
  back: 'Back',
  backAria: 'Go back to Vehicle details',
  saving: 'Saving...',
  saved: 'Progress saved',
  validationMissing: 'Please upload all required documents',
  validationIdFront: 'Please upload the front of your ID',
  validationIdBack: 'Please upload the back of your ID',
  validationLicense: 'Please upload your driving license',
  validationRegistration: 'Please upload your vehicle registration',
  validationSelfie: 'Please upload a selfie',
  dirtyTitle: 'Leave without saving?',
  dirtyBody: 'You have unsaved uploads. They will be kept in your draft so you can resume later.',
  dirtyStay: 'Stay',
  dirtyLeave: 'Leave',
  reviewTitle: 'Review & submit',
  reviewComingSoon: 'Review step continues here.',
}

const docsNe = {
  title: 'कागजात प्रमाणीकरण',
  subtitle: 'आफ्नो परिचय प्रमाणित गर्न कागजात अपलोड गर्नुहोस्।',
  trustTitle: 'तपाईंका कागजात हामीसँग सुरक्षित छन्',
  trustBody: 'हामी तपाईंका कागजात केवल तपाईंको परिचय प्रमाणित गर्न र खाता स्वीकृत गर्न प्रयोग गर्छौं। यी एन्क्रिप्ट गरिएका छन्, तेस्रो पक्षसँग साझा गरिँदैन, र तपाईंले जुनसुकै बेला मेटाउन अनुरोध गर्न सक्नुहुन्छ।',
  idFrontLabel: 'नागरिकता / राष्ट्रिय परिचयपत्र — अगाडि',
  idFrontGuidance: 'आफ्नो परिचयपत्र अगाडि पट्टि समतल सतहमा राख्नुहोस्। सबै लिखित स्पष्ट र पढ्न सकिने हुनुपर्छ, चमक नहुने गरी।',
  idBackLabel: 'नागरिकता / राष्ट्रिय परिचयपत्र — पछाडि',
  idBackGuidance: 'परिचयपत्रको पछाडि तस्बिर खिच्नुहोस्। सबै विवरण स्पष्ट देखिनुपर्छ।',
  licenseLabel: 'सवारी चलाउने अनुमतिपत्र',
  licenseGuidance: 'अनुमतिपत्रको अगाडि तस्बिर खिच्नुहोस्। सबै लिखित र तपाईंको फोटो स्पष्ट देखिनुपर्छ।',
  registrationLabel: 'सवारी दर्ता (ब्लु बुक)',
  registrationGuidance: 'ब्लु बुकको पहिलो पृष्ठ तस्बिर खिच्नुहोस्। नम्बर प्लेट र चेसिस नम्बर पढ्न सकिने हुनुपर्छ।',
  selfieLabel: 'सेल्फी',
  selfieGuidance: 'राम्रो उज्यालोमा क्यामेरातर्फ हेर्नुहोस्। चश्मा र टोपी हटाउनुहोस्। सीधा क्यामेरातर्फ हेर्नुहोस्।',
  capture: 'खिच्नुहोस्',
  upload: 'अपलोड',
  replace: 'बदल्नुहोस्',
  retake: 'फेरि खिच्नुहोस्',
  captureAria: 'क्यामेराबाट फोटो खिच्नुहोस्',
  uploadAria: 'ग्यालरीबाट फोटो अपलोड गर्नुहोस्',
  replaceAria: 'अपलोड गरिएको फोटो बदल्नुहोस्',
  statusNotUploaded: 'अपलोड भएको छैन',
  statusUploaded: 'अपलोड भयो',
  statusPending: 'समीक्षा बाँकी',
  requiredTag: 'आवश्यक',
  optionalTag: 'वैकल्पिक',
  ifMotorized: 'मोटरयुक्त सवारीको लागि आवश्यक',
  guidanceTitle: 'फोटो सुझाव',
  guidanceGoodLight: 'राम्रो, प्राकृतिक उज्यालो प्रयोग गर्नुहोस्',
  guidanceFlatSurface: 'कागजात समतल, अँध्यारो सतहमा राख्नुहोस्',
  guidanceFillFrame: 'फ्रेम भर्नुहोस् — कुनै छेउ कट्नु हुँदैन',
  guidanceNoGlare: 'चमक र प्रतिबिम्बबाट बच्नुहोस्',
  guidanceSteady: 'स्थिर राख्नुहोस् वा फोकस गर्न ट्याप गर्नुहोस्',
  next: 'अर्को',
  nextAria: 'सेभ गरेर समीक्षा चरणमा जानुहोस्',
  back: 'पछाडि',
  backAria: 'सवारी विवरणमा फर्कनुहोस्',
  saving: 'सेभ गर्दै...',
  saved: 'प्रगति सेभ भयो',
  validationMissing: 'कृपया सबै आवश्यक कागजात अपलोड गर्नुहोस्',
  validationIdFront: 'कृपया परिचयपत्रको अगाडि अपलोड गर्नुहोस्',
  validationIdBack: 'कृपया परिचयपत्रको पछाडि अपलोड गर्नुहोस्',
  validationLicense: 'कृपया सवारी चलाउने अनुमतिपत्र अपलोड गर्नुहोस्',
  validationRegistration: 'कृपया सवारी दर्ता अपलोड गर्नुहोस्',
  validationSelfie: 'कृपया सेल्फी अपलोड गर्नुहोस्',
  dirtyTitle: 'सेभ नगरी छोड्ने?',
  dirtyBody: 'तपाईंका सेभ नभएका अपलोडहरू ड्राफ्टमा राखिनेछन् ताकि पछि फेरि सुरु गर्न सकिन्छ।',
  dirtyStay: 'बस्नुहोस्',
  dirtyLeave: 'छोड्नुहोस्',
  reviewTitle: 'समीक्षा र पेश',
  reviewComingSoon: 'समीक्षा चरण यहाँ जारी छ।',
}

function merge(file, docs) {
  const raw = fs.readFileSync(file, 'utf8')
  const json = JSON.parse(raw)
  if (!json.rider || typeof json.rider !== 'object') json.rider = {}
  if (!json.rider.onboarding || typeof json.rider.onboarding !== 'object') json.rider.onboarding = {}
  json.rider.onboarding.documents = docs
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8')
  console.log('merged', path.basename(file))
}

merge(enPath, docsEn)
merge(nePath, docsNe)
console.log('done')
