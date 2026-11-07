// Troca o nome Valorize por Brio nos textos visiveis do app. Rode na pasta valorize-app.
const fs = require('fs');
const files = [
  'src/screens/auth/ResetPasswordScreen.tsx',
  'src/screens/auth/LoginScreen.tsx',
  'src/screens/account/PaymentHistoryScreen.tsx',
  'src/screens/access/AccessBlockedScreen.tsx',
  'app.json',
  'scripts/pwa-postbuild.js',
];
let total = 0;
for (const f of files) {
  if (!fs.existsSync(f)) { console.log('NAO ACHEI: ' + f); continue; }
  const s = fs.readFileSync(f, 'utf8');
  const n = (s.match(/Valorize/g) || []).length;
  if (n) fs.writeFileSync(f, s.replace(/Valorize/g, 'Brio'));
  console.log(f + ': ' + n + ' troca(s)');
  total += n;
}
console.log('Total: ' + total + ' (esperado: 10)');
