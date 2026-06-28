/* One-shot merge of rider.onboarding.review + rider.pending + rider.goOnline i18n keys.
 * Idempotent: overwrites each sub-block. */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const enPath = path.join(ROOT, 'packages/i18n/locales/en.json')
const nePath = path.join(ROOT, 'packages/i18n/locales/ne.json')

const reviewEn = {
  title: 'Review & submit',
  subtitle: 'Check your details before submitting for verification.',
  comingSoon: 'Review step continues here.',
  sectionPersonal: 'Personal details',
  sectionVehicle: 'Vehicle details',
  sectionDocuments: 'Documents',
  edit: 'Edit',
  editAria: 'Edit personal details',
  editVehicleAria: 'Edit vehicle details',
  editDocumentsAria: 'Edit documents',
  personalName: 'Name',
  personalDob: 'Date of birth',
  personalGender: 'Gender',
  personalCity: 'City',
  personalZone: 'Zone',
  personalEmergency: 'Emergency contact',
  vehicleType: 'Vehicle type',
  vehicleMakeModel: 'Make / model',
  vehiclePlate: 'Plate number',
  vehicleColor: 'Color',
  docsCount: 'documents uploaded',
  docsUploaded: 'Uploaded',
  docsNotUploaded: 'Not uploaded',
  genderMale: 'Male',
  genderFemale: 'Female',
  genderOther: 'Other',
  genderPreferNotToSay: 'Prefer not to say',
  consentTitle: 'Your agreements',
  consentRiderAgreement: 'I have read and agree to the Rider Agreement',
  consentDataProcessing: 'I consent to Chinooz processing my documents and data for verification',
  consentRequired: 'Please accept all agreements to continue',
  submit: 'Submit for verification',
  submitAria: 'Submit your application for verification',
  submitting: 'Submitting...',
  submittedTitle: 'Application submitted!',
  submittedBody: 'Your application is now under review. We will notify you once approved.',
  back: 'Back',
  backAria: 'Go back to Documents step',
  saving: 'Saving...',
  dirtyTitle: 'Leave without saving?',
  dirtyBody: 'You have unsaved changes. They will be kept in your draft.',
  dirtyStay: 'Stay',
  dirtyLeave: 'Leave',
}

const reviewNe = {
  title: 'समीक्षा र पेश',
  subtitle: 'पेश गर्नु अघि आफ्नो विवरण जाँच्नुहोस्।',
  comingSoon: 'समीक्षा चरण यहाँ जारी छ।',
  sectionPersonal: 'व्यक्तिगत विवरण',
  sectionVehicle: 'सवारी विवरण',
  sectionDocuments: 'कागजात',
  edit: 'सम्पादन',
  editAria: 'व्यक्तिगत विवरण सम्पादन गर्नुहोस्',
  editVehicleAria: 'सवारी विवरण सम्पादन गर्नुहोस्',
  editDocumentsAria: 'कागजात सम्पादन गर्नुहोस्',
  personalName: 'नाम',
  personalDob: 'जन्म मिति',
  personalGender: 'लिङ्ग',
  personalCity: 'शहर',
  personalZone: 'क्षेत्र',
  personalEmergency: 'आपतकालीन सम्पर्क',
  vehicleType: 'सवारी प्रकार',
  vehicleMakeModel: 'ब्रान्ड / मोडेल',
  vehiclePlate: 'नम्बर प्लेट',
  vehicleColor: 'रङ',
  docsCount: 'कागजात अपलोड भए',
  docsUploaded: 'अपलोड भयो',
  docsNotUploaded: 'अपलोड भएको छैन',
  genderMale: 'पुरुष',
  genderFemale: 'महिला',
  genderOther: 'अन्य',
  genderPreferNotToSay: 'नभन्ने रोज्नुहोस्',
  consentTitle: 'तपाईंका सहमतिहरू',
  consentRiderAgreement: 'मैले सवारी सम्झौता पढें र सहमत छु',
  consentDataProcessing: 'म चिनुजले मेरा कागजात र डाटा प्रमाणीकरणको लागि प्रशोधन गर्न सहमत छु',
  consentRequired: 'निरन्तरताको लागि सबै सम्झौताहरू स्वीकार गर्नुहोस्',
  submit: 'प्रमाणीकरणको लागि पेश गर्नुहोस्',
  submitAria: 'तपाईंको आवेदन प्रमाणीकरणको लागि पेश गर्नुहोस्',
  submitting: 'पेश गर्दै...',
  submittedTitle: 'आवेदन पेश भयो!',
  submittedBody: 'तपाईंको आवेदन अब समीक्षामा छ। स्वीकृत भएपछि हामी सूचित गर्नेछौं।',
  back: 'पछाडि',
  backAria: 'कागजात चरणमा फर्कनुहोस्',
  saving: 'सेभ गर्दै...',
  dirtyTitle: 'सेभ नगरी छोड्ने?',
  dirtyBody: 'तपाईंका सेभ नभएका परिवर्तनहरू ड्राफ्टमा राखिनेछन्।',
  dirtyStay: 'बस्नुहोस्',
  dirtyLeave: 'छोड्नुहोस्',
}

const pendingEn = {
  title: 'Account under review',
  subtitle: "We're verifying your details. This usually takes 1–2 business days.",
  hint: "We'll notify you the moment you're approved to go online.",
  logout: 'Sign out',
  logoutAria: 'Sign out and return to the welcome screen',
  contactSupport: 'Contact support',
  verificationTitle: 'Verification status',
  estimatedTime: 'Estimated time: ~{{hours}} hours',
  itemIdentity: 'Identity documents',
  itemLicense: 'Driving license',
  itemVehicle: 'Vehicle registration',
  itemSelfie: 'Selfie verification',
  statusVerified: 'Verified',
  statusPending: 'Pending review',
  statusRejected: 'Needs attention',
  rejectionReason: 'Some documents need attention before we can approve your account.',
  rejectionLicense: 'License photo is unclear. Please retake in good lighting.',
  rejectionSelfie: 'Selfie does not match your ID. Please retake without sunglasses or hat.',
  resubmit: 'Resubmit documents',
  resubmitAria: 'Go back and resubmit your documents',
  resubmitBody: 'Fix the issues above and resubmit. You will go back to the document upload step.',
  approvedTitle: 'You are approved!',
  approvedBody: 'Your account is verified. Complete the go-online checklist to start earning.',
  goOnline: 'Go online checklist',
  goOnlineAria: 'View the go-online checklist',
}

const pendingNe = {
  title: 'खाता समीक्षामा',
  subtitle: 'हामी तपाईंको विवरण रुजु गर्दैछौं। यसमा सामान्यतया १-२ व्यावसायिक दिन लाग्छ।',
  hint: 'तपाईं अनलाइन जान स्वीकृत भएपछि हामीले सूचित गर्नेछौं।',
  logout: 'साइन आउट',
  logoutAria: 'साइन आउट गरेर स्वागत स्क्रिनमा फर्कनुहोस्',
  contactSupport: 'समर्थनसँग सम्पर्क गर्नुहोस्',
  verificationTitle: 'प्रमाणीकरण स्थिति',
  estimatedTime: 'अनुमानित समय: ~{{hours}} घण्टा',
  itemIdentity: 'परिचय कागजात',
  itemLicense: 'सवारी चलाउने अनुमतिपत्र',
  itemVehicle: 'सवारी दर्ता',
  itemSelfie: 'सेल्फी प्रमाणीकरण',
  statusVerified: 'रुजु भयो',
  statusPending: 'समीक्षा बाँकी',
  statusRejected: 'ध्यान दिनुहोस्',
  rejectionReason: 'तपाईंको खाता स्वीकृत गर्नु अघि केही कागजातमा ध्यान दिनुपर्ने छ।',
  rejectionLicense: 'अनुमतिपत्रको फोटो स्पष्ट छैन। राम्रो उज्यालोमा फेरि खिच्नुहोस्।',
  rejectionSelfie: 'सेल्फी तपाईंको परिचयपत्रसँग मेल खाँदैन। चश्मा वा टोपी बिना फेरि खिच्नुहोस्।',
  resubmit: 'कागजात फेरि पेश गर्नुहोस्',
  resubmitAria: 'फर्केर कागजात फेरि पेश गर्नुहोस्',
  resubmitBody: 'माथिका समस्याहरू ठीक गरेर फेरि पेश गर्नुहोस्। तपाईं कागजात अपलोड चरणमा फर्कनुहुनेछ।',
  approvedTitle: 'तपाईं स्वीकृत हुनुभयो!',
  approvedBody: 'तपाईंको खाता प्रमाणित भयो। कमाउन सुरु गर्न अनलाइन जाने चेकलिस्ट पूरा गर्नुहोस्।',
  goOnline: 'अनलाइन जाने चेकलिस्ट',
  goOnlineAria: 'अनलाइन जाने चेकलिस्ट हेर्नुहोस्',
}

const goOnlineEn = {
  title: 'Go online checklist',
  subtitle: 'Complete these steps to start earning with Chinooz.',
  itemProfile: 'Profile details complete',
  itemDocs: 'Documents verified',
  itemPayout: 'Bank / payout method added',
  itemVehicle: 'Vehicle ready',
  allComplete: 'All set! You are ready to go online.',
  startEarning: 'Start earning',
  startEarningAria: 'Start earning — go to the jobs board',
  completeItem: 'Complete',
  completeItemAria: 'Complete this step',
  celebrationTitle: 'Welcome to Chinooz!',
  celebrationBody: 'You are all set to start earning. Accept your first job and hit the road.',
  celebrationGo: 'Go to jobs',
  celebrationGoAria: 'Go to the jobs board',
}

const goOnlineNe = {
  title: 'अनलाइन जाने चेकलिस्ट',
  subtitle: 'चिनुजसँग कमाउन सुरु गर्न यी चरणहरू पूरा गर्नुहोस्।',
  itemProfile: 'प्रोफाइल विवरण पूरा',
  itemDocs: 'कागजात प्रमाणित',
  itemPayout: 'बैंक / भुक्तानी विधि थपियो',
  itemVehicle: 'सवारी तयार',
  allComplete: 'सबै तयार! तपाईं अनलाइन जान तयार हुनुहुन्छ।',
  startEarning: 'कमाउन सुरु गर्नुहोस्',
  startEarningAria: 'कमाउन सुरु गर्नुहोस् — जब बोर्डमा जानुहोस्',
  completeItem: 'पूरा गर्नुहोस्',
  completeItemAria: 'यो चरण पूरा गर्नुहोस्',
  celebrationTitle: 'चिनुजमा स्वागत छ!',
  celebrationBody: 'तपाईं कमाउन सुरु गर्न पूर्ण तयार हुनुहुन्छ। आफ्नो पहिलो जब स्वीकार गर्नुहोस् र सडकमा निस्कनुहोस्।',
  celebrationGo: 'जबमा जानुहोस्',
  celebrationGoAria: 'जब बोर्डमा जानुहोस्',
}

function merge(file, blocks) {
  const raw = fs.readFileSync(file, 'utf8')
  const json = JSON.parse(raw)
  if (!json.rider || typeof json.rider !== 'object') json.rider = {}
  if (!json.rider.onboarding || typeof json.rider.onboarding !== 'object') json.rider.onboarding = {}
  json.rider.onboarding.review = blocks.review
  json.rider.pending = blocks.pending
  json.rider.goOnline = blocks.goOnline
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8')
  console.log('merged', path.basename(file))
}

merge(enPath, { review: reviewEn, pending: pendingEn, goOnline: goOnlineEn })
merge(nePath, { review: reviewNe, pending: pendingNe, goOnline: goOnlineNe })
console.log('done')
