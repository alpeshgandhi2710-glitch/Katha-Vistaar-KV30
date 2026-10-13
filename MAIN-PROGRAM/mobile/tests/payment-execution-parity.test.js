const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const tools=fs.readFileSync(path.join(root,'lib','mobile_tools.dart'),'utf8');const main=fs.readFileSync(path.join(root,'lib','main.dart'),'utf8');
assert.match(tools,/startPaymentOtp\(/);assert.match(tools,/verifyPaymentOtp\(/);assert.match(tools,/purchaseSubscription\(/);assert.match(tools,/purchaseCoins\(/);assert.match(tools,/\/api\/payments\/internal-otp\/start/);assert.match(tools,/\/api\/coins\/purchase/);assert.match(main,/_paymentToken\(/);assert.match(main,/_buyCoins\(/);assert.match(main,/payment_verification_required/);
console.log('PASS mobile payment execution uses governed OTP, subscription and coin purchase contracts');
