/* One-shot merge of rider.onboarding.states i18n keys into en + ne.
 * Idempotent: overwrites only the rider.onboarding.states sub-block. */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const enPath = path.join(ROOT, 'packages/i18n/locales/en.json')
const nePath = path.join(ROOT, 'packages/i18n/locales/ne.json')

const statesEn = {
  loadingStepper: 'Loading steps...',
  loadingStepperAria: 'Loading onboarding steps',
  loadingDocuments: 'Loading documents...',
  loadingDocumentsAria: 'Loading document checklist',
  loadingReview: 'Loading review...',
  loadingReviewAria: 'Loading your application summary',
  loadingPending: 'Checking your application status...',
  loadingPendingAria: 'Checking application status',
  loadingGoOnline: 'Loading checklist...',
  loadingGoOnlineAria: 'Loading go-online checklist',
  errorTitle: 'Something went wrong',
  errorBody: 'We could not complete this step. Your progress is saved.',
  errorRetry: 'Retry',
  errorRetryAria: 'Retry loading this step',
  errorSubmitTitle: 'Submission failed',
  errorSubmitBody: 'We could not submit your application. Your details are preserved. Please try again.',
  errorSubmitRetry: 'Try again',
  errorSubmitRetryAria: 'Retry submission',
  errorOtpExpired: 'This code has expired. Please request a new one.',
  errorOtpTooMany: 'Too many attempts. Please wait a moment and try again.',
  errorOtpInvalid: 'Invalid code. Please check and try again.',
  errorPhoneInvalid: 'Please enter a valid Nepali phone number.',
  errorPhoneTaken: 'This number is already registered. Try logging in instead.',
  errorUploadTitle: 'Upload failed',
  errorUploadBody: 'We could not upload this document. Your other uploads are safe. Please try again.',
  errorUploadRetry: 'Retry upload',
  errorUploadRetryAria: 'Retry uploading this document',
  errorOfflineTitle: 'You are offline',
  errorOfflineBody: 'You are not connected to the internet. Your progress is saved and will sync when you reconnect.',
  errorOfflineQueued: 'Your changes are queued and will be submitted when you are back online.',
  errorSessionTitle: 'Session expired',
  errorSessionBody: 'Your session has expired for security. Please log in again to continue. Your progress is saved.',
  errorSessionLogin: 'Log in again',
  errorSessionLoginAria: 'Log in again to resume onboarding',
  emptyDocsTitle: 'No documents uploaded yet',
  emptyDocsBody: 'Upload your documents above to get verified and start earning.',
  emptyDocsUpload: 'Upload first document',
  emptyDocsUploadAria: 'Start uploading your first document',
  resumeTitle: 'Welcome back!',
  resumeBody: 'You were in the middle of onboarding. Pick up where you left off.',
  resumeContinue: 'Continue',
  resumeContinueAria: 'Continue onboarding from where you left off',
  resumeStartOver: 'Start over',
  resumeStartOverAria: 'Start onboarding from the beginning',
  rejectedDocTitle: 'Document needs attention',
  rejectedDocBody: 'This document was not accepted. Please review the reason and retake.',
  rejectedDocRetake: 'Retake photo',
  rejectedDocRetakeAria: 'Retake this document photo',
  progressSaved: 'Progress saved',
  progressSavedBody: 'Your progress is safely stored. You can resume anytime.',
}

const statesNe = {
  loadingStepper: 'चरणहरू लोड हुँदै...',
  loadingStepperAria: 'अनबोर्डिङ चरणहरू लोड हुँदै',
  loadingDocuments: 'कागजात लोड हुँदै...',
  loadingDocumentsAria: 'कागजात चेकलिस्ट लोड हुँदै',
  loadingReview: 'समीक्षा लोड हुँदै...',
  loadingReviewAria: 'तपाईंको आवेदन सारांश लोड हुँदै',
  loadingPending: 'तपाईंको आवेदन स्थिति जाँच हुँदै...',
  loadingPendingAria: 'आवेदन स्थिति जाँच हुँदै',
  loadingGoOnline: 'चेकलिस्ट लोड हुँदै...',
  loadingGoOnlineAria: 'अनलाइन जाने चेकलिस्ट लोड हुँदै',
  errorTitle: 'केही गडबड भयो',
  errorBody: 'हामीले यो चरण पूरा गर्न सकेनौं। तपाईंको प्रगति सेभ छ।',
  errorRetry: 'फेरि प्रयास गर्नुहोस्',
  errorRetryAria: 'यो चरण फेरि लोड गर्नुहोस्',
  errorSubmitTitle: 'पेश गर्न असफल',
  errorSubmitBody: 'हामीले तपाईंको आवेदन पेश गर्न सकेनौं। तपाईंको विवरणहरू सुरक्षित छन्। कृपया फेरि प्रयास गर्नुहोस्।',
  errorSubmitRetry: 'फेरि प्रयास गर्नुहोस्',
  errorSubmitRetryAria: 'पेश गर्न फेरि प्रयास गर्नुहोस्',
  errorOtpExpired: 'यो कोड म्याद सकियो। कृपया नयाँ अनुरोध गर्नुहोस्।',
  errorOtpTooMany: 'धेरै पटक प्रयास भयो। कृपया एकछिन पर्खनुहोस् र फेरि प्रयास गर्नुहोस्।',
  errorOtpInvalid: 'अमान्य कोड। कृपया जाँच्नुहोस् र फेरि प्रयास गर्नुहोस्।',
  errorPhoneInvalid: 'कृपया मान्य नेपाली फोन नम्बर लेख्नुहोस्।',
  errorPhoneTaken: 'यो नम्बर पहिले नै दर्ता छ। लगइन गर्न प्रयास गर्नुहोस्।',
  errorUploadTitle: 'अपलोड असफल',
  errorUploadBody: 'हामीले यो कागजात अपलोड गर्न सकेनौं। तपाईंका अन्य अपलोडहरू सुरक्षित छन्। कृपया फेरि प्रयास गर्नुहोस्।',
  errorUploadRetry: 'अपलोड फेरि प्रयास',
  errorUploadRetryAria: 'यो कागजात फेरि अपलोड गर्नुहोस्',
  errorOfflineTitle: 'तपाईं अफलाइन हुनुहुन्छ',
  errorOfflineBody: 'तपाईं इन्टरनेटमा जडित हुनुभएको छैन। तपाईंको प्रगति सेभ छ र फेरि जडान हुँदा सिंक हुनेछ।',
  errorOfflineQueued: 'तपाईंका परिवर्तनहरू लाइनमा छन् र अनलाइन फर्किएपछि पेश हुनेछन्।',
  errorSessionTitle: 'सत्र म्याद सकियो',
  errorSessionBody: 'सुरक्षाको लागि तपाईंको सत्र म्याद सकियो। निरन्तरताको लागि फेरि लगइन गर्नुहोस्। तपाईंको प्रगति सेभ छ।',
  errorSessionLogin: 'फेरि लगइन गर्नुहोस्',
  errorSessionLoginAria: 'अनबोर्डिङ फेरि सुरु गर्न लगइन गर्नुहोस्',
  emptyDocsTitle: 'अहिले कुनै कागजात अपलोड भएको छैन',
  emptyDocsBody: 'प्रमाणित हुन र कमाउन सुरु गर्न माथि आफ्ना कागजात अपलोड गर्नुहोस्।',
  emptyDocsUpload: 'पहिलो कागजात अपलोड गर्नुहोस्',
  emptyDocsUploadAria: 'आफ्नो पहिलो कागजात अपलोड सुरु गर्नुहोस्',
  resumeTitle: 'फेरि स्वागत छ!',
  resumeBody: 'तपाईं अनबोर्डिङको बीचमा हुनुहुन्थ्यो। जहाँ छोड्नुभएको थियो त्यहीबाट निरन्तरता दिनुहोस्।',
  resumeContinue: 'निरन्तरता दिनुहोस्',
  resumeContinueAria: 'जहाँ छोड्नुभएको थियो त्यहीबाट अनबोर्डिङ निरन्तरता दिनुहोस्',
  resumeStartOver: 'फेरि सुरु गर्नुहोस्',
  resumeStartOverAria: 'सुरुबाट अनबोर्डिङ सुरु गर्नुहोस्',
  rejectedDocTitle: 'कागजातमा ध्यान दिनुहोस्',
  rejectedDocBody: 'यो कागजात स्वीकार भएन। कृपया कारण हेर्नुहोस् र फेरि खिच्नुहोस्।',
  rejectedDocRetake: 'फोटो फेरि खिच्नुहोस्',
  rejectedDocRetakeAria: 'यो कागजात फोटो फेरि खिच्नुहोस्',
  progressSaved: 'प्रगति सेभ भयो',
  progressSavedBody: 'तपाईंको प्रगति सुरक्षित छ। जुनसुकै बेला फेरि सुरु गर्न सक्नुहुन्छ।',
}

function merge(file, states) {
  const raw = fs.readFileSync(file, 'utf8')
  const json = JSON.parse(raw)
  if (!json.rider || typeof json.rider !== 'object') json.rider = {}
  if (!json.rider.onboarding || typeof json.rider.onboarding !== 'object') json.rider.onboarding = {}
  json.rider.onboarding.states = states
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8')
  console.log('merged', path.basename(file))
}

merge(enPath, statesEn)
merge(nePath, statesNe)
console.log('done')
