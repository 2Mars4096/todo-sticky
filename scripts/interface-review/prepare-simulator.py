"""Prepare an external, isolated Flutter integration test. It renders the production widgets on the real simulator runtime."""
from pathlib import Path
import argparse,os,subprocess
ROOT=Path(__file__).resolve().parents[2]
dest=Path('/Volumes/data/codex-tmp/dockit-simulator-engine-review');dest.mkdir(exist_ok=True)
subprocess.run(['rsync','-a','--exclude','build','--exclude','.dart_tool','--exclude','Pods','--exclude','ephemeral','--exclude','.gradle','--exclude','.symlinks',str(ROOT/'phone')+'/',str(dest)+'/'],check=True)
pub=dest/'pubspec.yaml';s=pub.read_text().replace('dev_dependencies:\n','dev_dependencies:\n  integration_test:\n    sdk: flutter\n',1);pub.write_text(s)
# Install beside the ordinary exported Dockit app for this dedicated simulator.
pb=dest/'ios/Runner.xcodeproj/project.pbxproj';pb.write_text(pb.read_text().replace('work.pipedreams.dockit','work.pipedreams.dockit.matrixfixture'))
source=(ROOT/'phone/test/review_element_matrix.dart').read_text()
source="import 'package:integration_test/integration_test.dart';\nimport 'package:path_provider/path_provider.dart';\n"+source
source=source.replace("void main() {\n  final dir = Platform.environment['DOCKIT_REVIEW_DIR']!;", """void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();""")
source=source.replace("for (final platform in [TargetPlatform.android,TargetPlatform.iOS])","for (final platform in [TargetPlatform.iOS])")
source=source.replace("      final tagName=platform.name;", """      final base=await getApplicationSupportDirectory();
      final outputDirectory=Directory(base.path+'/dockit-review');
      outputDirectory.createSync(recursive:true);
      final dir=outputDirectory.path;
      final tagName='simulator';""")
a=source.index("      debugDefaultTargetPlatformOverride=platform;");b=source.index("      Future<void> settle()",a)
source=source[:a]+source[b:]
source=source.replace("await tester.pump(const Duration(milliseconds:350));","await tester.pump(const Duration(milliseconds:100));")
source=source.replace("await tester.pump(const Duration(milliseconds:250))","await tester.pump(const Duration(milliseconds:80))")
source=source.replace("      debugDefaultTargetPlatformOverride=null;","")
source=source.replace('timeout:const Timeout(Duration(minutes:20))','timeout:const Timeout(Duration(minutes:35))')
f=dest/'integration_test/review_elements_test.dart';f.parent.mkdir(exist_ok=True);f.write_text(source)
print(dest)
