/* One-shot merge of rider.auth/onboarding/pending i18n keys into en + ne.
 * Idempotent: overwrites only the three sub-blocks. Run from repo root. */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const enPath = path.join(ROOT, 'packages/i18n/locales/en.json')
const nePath = path.join(ROOT, 'packages/i18n/locales/ne.json')

const authEn = {
  phoneTitle: 'Enter your phone number',
  phoneSignupSubtitle: "We'll send a code to verify your number and start riding.",
  phoneLoginSubtitle: 'Welcome back. Enter your number to sign in to ride.',
  continue: 'Continue',
  sending: 'Sending...',
  alreadySent: 'Code already sent — check your messages',
  termsPrefix: 'By continuing, you agree to our',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  and: 'and',
  riderAgreement: 'Rider Agreement',
  otpTitle: 'Verify your number',
  otpSignupSubtitle: 'Enter the 6-digit code sent to',
  otpLoginSubtitle: 'Enter the 6-digit code sent to',
  verify: 'Verify',
  verifying: 'Verifying...',
  resend: 'Resend code',
  resendIn: 'Resend in {{seconds}}s',
  invalidCode: 'Invalid code. Try again.',
  changeNumber: 'Change number',
  codeSent: 'Code sent!',
  devBanner: 'DEV MODE — use OTP 123456',
  successTitle: 'Verified!',
  successSignup: 'Setting up your rider account...',
  successLogin: 'Welcome back! Taking you to ride...',
  successPending: 'Account under review. Hang tight!',
  digitAria: 'Digit {{n}} of 6',
  digitValueAria: 'Digit {{n}} entered: {{value}}',
  phoneAria: 'Phone number, 10 digits, Nepal +977',
  phoneLabel: 'Phone number',
  phoneHelper: '10-digit mobile number starting with 97 or 98',
  resendAria: 'Resend verification code',
  resendDisabled: 'Resend code (available in {{seconds}}s)',
  errorAnnounce: 'Verification failed. Please check the code and try again.',
  successAnnounce: 'Verification successful.',
  otpLabel: 'Verification code',
  otpHelper: 'Enter the 6-digit code we sent',
}

const authNe = {
  phoneTitle: 'आफ्नो फोन नम्बर राख्नुहोस्',
  phoneSignupSubtitle: 'हामी तपाईंको नम्बर रुचाउन कोड पठाउँछौं र राइड सुरु गर्छौं।',
  phoneLoginSubtitle: 'फेरि स्वागत छ। राइड गर्न साइन इन गर्न आफ्नो नम्बर राख्नुहोस्।',
  continue: 'जारी राख्नुहोस्',
  sending: 'पठाइँदै...',
  alreadySent: 'कोड पहिले नै पठाइयो — सन्देश जाँच्नुहोस्',
  termsPrefix: 'जारी राखेर तपाईं हाम्रो सहमत हुनुहुन्छ',
  terms: 'सेवा सर्त',
  privacy: 'गोपनीयता नीति',
  and: 'र',
  riderAgreement: 'राइडर सम्झौता',
  otpTitle: 'आफ्नो नम्बर रुचाउनुहोस्',
  otpSignupSubtitle: 'पठाइएको ६-अंक कोड राख्नुहोस्',
  otpLoginSubtitle: 'पठाइएको ६-अंक कोड राख्नुहोस्',
  verify: 'रुजु गर्नुहोस्',
  verifying: 'रुजु गर्दै...',
  resend: 'कोड फेरि पठाउनुहोस्',
  resendIn: '{{seconds}}सेकोडमा फेरि पठाउनुहोस्',
  invalidCode: 'गलत कोड। फेरि प्रयास गर्नुहोस्।',
  changeNumber: 'नम्बर परिवर्तन गर्नुहोस्',
  codeSent: 'कोड पठाइयो!',
  devBanner: 'DEV मोड — OTP 123456 प्रयोग गर्नुहोस्',
  successTitle: 'रुजु भयो!',
  successSignup: 'तपाईंको राइडर खाता सेट गर्दै...',
  successLogin: 'फेरि स्वागत छ! राइडमा लग्दै...',
  successPending: 'खाता समीक्षामा छ। बस्नुहोस्!',
  digitAria: '६ मध्ये अंक {{n}}',
  digitValueAria: 'अंक {{n}} राखियो: {{value}}',
  phoneAria: 'फोन नम्बर, १० अंक, नेपाल +९७७',
  phoneLabel: 'फोन नम्बर',
  phoneHelper: '९७ वा ९८ बाट सुरु हुने १०-अंक मोबाइल नम्बर',
  resendAria: 'रुजु कोड फेरि पठाउनुहोस्',
  resendDisabled: 'कोड फेरि पठाउनुहोस् ({{seconds}}सेकोडमा उपलब्ध)',
  errorAnnounce: 'रुजु असफल। कोड जाँचेर फेरि प्रयास गर्नुहोस्।',
  successAnnounce: 'रुजु सफल भयो।',
  otpLabel: 'रुजु कोड',
  otpHelper: 'हामीले पठाएको ६-अंक कोड राख्नुहोस्',
}

const onboardingEn = {
  title: 'Become a Chinooz rider',
  subtitle: "A few steps and you're on the road.",
  comingSoon: 'Rider onboarding continues here.',
}
const onboardingNe = {
  title: 'चिनुज राइडर बन्नुहोस्',
  subtitle: 'केही चरण र तपाईं बाटोमा हुनुहुन्छ।',
  comingSoon: 'राइडर अनबोर्डिङ यहाँ जारी छ।',
}

const pendingEn = {
  title: 'Account under review',
  subtitle: "We're verifying your details. This usually takes 1–2 business days.",
  hint: "We'll notify you the moment you're approved to go online.",
  logout: 'Sign out',
  logoutAria: 'Sign out and return to the welcome screen',
  contactSupport: 'Contact support',
}
const pendingNe = {
  title: 'खाता समीक्षामा',
  subtitle: 'हामी तपाईंको विवरण रुजु गर्दैछौं। यसमा सामान्यतया १-२ व्यावसायिक दिन लाग्छ।',
  hint: 'तपाईं अनलाइन जान स्वीकृत भएपछि हामीले सूचित गर्नेछौं।',
  logout: 'साइन आउट',
  logoutAria: 'साइन आउट गरेर स्वागत स्क्रिनमा फर्कनुहोस्',
  contactSupport: 'समर्थनसँग सम्पर्क गर्नुहोस्',
}

function merge(file, auth, onboarding, pending) {
  const raw = fs.readFileSync(file, 'utf8')
  const json = JSON.parse(raw)
  if (!json.rider || typeof json.rider !== 'object') json.rider = {}
  json.rider.auth = auth
  json.rider.onboarding = onboarding
  json.rider.pending = pending
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8')
  console.log('merged', path.basename(file))
}

merge(enPath, authEn, onboardingEn, pendingEn)
merge(nePath, authNe, onboardingNe, pendingNe)
console.log('done')
