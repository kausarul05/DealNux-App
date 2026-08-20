// Single source of truth for the app version: app.json.
// android/app/build.gradle reads versionCode/versionName straight out of this
// file, and iOS buildNumber is kept in lock-step, so bumping here is all a
// release needs. Lives in its own file because the inline npm-script form was
// mangled by the shell on Windows.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app.json');
const json = JSON.parse(fs.readFileSync(file, 'utf8'));

json.expo.android.versionCode += 1;
json.expo.ios.buildNumber = String(json.expo.android.versionCode);

fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
console.log('versionCode ->', json.expo.android.versionCode);
