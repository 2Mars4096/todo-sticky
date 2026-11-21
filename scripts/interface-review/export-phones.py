from pathlib import Path
import tempfile,subprocess,hashlib,json,re,shutil,zipfile,plistlib,os
root=Path(__file__).resolve().parents[2];out=root/'output/clients';evidence=root/'output/interface-five';stage=Path('/Volumes/data/codex-tmp/dockit-phone-device-export')
tools=Path('/opt/homebrew/share/android-commandlinetools/build-tools/36.0.0')
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def apk(p):
 cert=subprocess.check_output([str(tools/'apksigner'),'verify','--print-certs',str(p)],text=True)
 badges=subprocess.check_output([str(tools/'aapt2'),'dump','badging',str(p)],text=True)
 name,code,version=re.search("package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'",badges).groups()
 return {'name':p.name,'package':name,'versionCode':int(code),'versionName':version,'signerSHA256':re.search(r'Signer #1 certificate SHA-256 digest: ([0-9a-f]+)',cert)[1],'nativeCode':re.search(r'native-code: (.*)',badges)[1],'apkSHA256':digest(p)}
prod=out/'android-release';prod.mkdir(exist_ok=True)
for src in (stage/'build/app/outputs/flutter-apk').glob('*-release.apk'):
 shutil.copy2(src,prod/src.name.replace('app-','Dockit-'))
old=apk(root/'todo-sticky-latest.apk');items=[apk(f)for f in sorted(prod.glob('*.apk'))];preview=apk(out/'Dockit-debug.apk');arm=next(item for item in items if 'arm64-v8a'in item['nativeCode'])
assert arm['signerSHA256']==old['signerSHA256'] and arm['package']==old['package'] and arm['versionCode']>old['versionCode']
before=evidence/'android-release-signing.json'
if before.exists() and not (evidence/'android-release-signing-pre-counter.json').exists():shutil.copy2(before,evidence/'android-release-signing-pre-counter.json')
before.write_text(json.dumps(dict(existingProduction=old,preview=preview,releaseAPKs=items,arm64MatchesOwner=True,arm64SameSigner=True,arm64VersionIncreases=True,previewIsSeparatePackage=True),indent=2))
device=out/'ios-device/Dockit.app';subprocess.run(['ditto',str(stage/'build/ios/iphoneos/Runner.app'),str(device)],check=True)
ipa=out/'ios-device/Dockit-unsigned.ipa'
with tempfile.TemporaryDirectory(dir='/Volumes/data/codex-tmp',prefix='dockit-final-ipa-')as td:
 payload=Path(td)/'Payload';payload.mkdir();subprocess.run(['ditto',str(device),str(payload/'Dockit.app')],check=True)
 temp=Path(td)/'Dockit.ipa';subprocess.run(['ditto','-ck','--norsrc','--keepParent',str(payload),str(temp)],check=True)
 shutil.copy2(temp,ipa)
with zipfile.ZipFile(ipa)as z:
 assert z.read('Payload/Dockit.app/Runner')==(device/'Runner').read_bytes()
 assert 'Payload/Dockit.app/Frameworks/App.framework/App' in z.namelist()
 assert not any(s.endswith('embedded.mobileprovision')for s in z.namelist())
def tree(p):
 h=hashlib.sha256()
 for f in sorted(p.rglob('*')):
  if f.is_file():h.update(str(f.relative_to(p)).encode());h.update(bytes.fromhex(digest(f)))
 return h.hexdigest()
apple=[]
for label,app in [('simulator-export',out/'ios-simulator/Dockit.app'),('cantonese-tested-simulator',out/'ios-simulator/Dockit-Cantonese-tested.app'),('initial-xctest-simulator',out/'ios-simulator/Dockit-tested.app'),('unsigned-device',device)]:
 info=plistlib.loads((app/'Info.plist').read_bytes());meta=subprocess.check_output(['xcrun','vtool','-show-build',str(app/'Runner')],text=True)
 platform=re.findall(r'\bplatform (IOS[A-Z]*)',meta)
 assert all(v==('IOS' if label=='unsigned-device'else'IOSSIMULATOR')for v in platform)and platform
 apple.append({'variant':label,'path':str(app.relative_to(root)),'platform':sorted(set(platform)),'bundleId':info['CFBundleIdentifier'],'version':info['CFBundleShortVersionString'],'build':info['CFBundleVersion'],'runnerSHA256':digest(app/'Runner'),'bundleTreeSHA256':tree(app)})
pluginVersion=json.loads((root/'plugin/package.json').read_text())['version']
receipt={'productionAndroid':arm,'otherAndroid':items,'preview':preview,'priorProductionAndroid':old,'apple':apple,'unsignedIPA':{'path':str(ipa.relative_to(root)),'sha256':digest(ipa),'signedForPhysicalInstallation':False},'pluginVersion':pluginVersion,'pluginSHA256':digest(evidence/f'diane-app-todo-plugin-{pluginVersion}.tgz')}
(evidence/'final-exports.json').write_text(json.dumps(receipt,indent=2));print('release arm64',arm['apkSHA256'],'unsigned IPA',digest(ipa))
