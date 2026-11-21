require 'xcodeproj'
require 'fileutils'
dir=File.expand_path(ARGV.fetch(0));name='DockitElementReview'
project=Xcodeproj::Project.open(File.join(dir,'Runner.xcodeproj'))
app=project.targets.find{|t|t.name=='Runner'}
t=project.targets.find{|x|x.name==name} || project.new_target(:ui_test_bundle,name,:ios,'15.0')
t.add_dependency(app) unless t.dependencies.any?
group=project.main_group.find_subpath(name,true)
FileUtils.mkdir_p(File.join(dir,name))
FileUtils.cp(File.join(__dir__,'DockitElements.swift'),File.join(dir,name,'DockitElements.swift'))
group.set_path(name);ref=group.files.find{|f|f.path=='DockitElements.swift'}|| group.new_file('DockitElements.swift')
t.add_file_references([ref]) unless t.source_build_phase.files_references.include?(ref)
t.build_configurations.each{|cfg|cfg.build_settings.update('PRODUCT_BUNDLE_IDENTIFIER'=>'work.pipedreams.dockit.elementreviewtests','PRODUCT_NAME'=>'DockitElementReview','PRODUCT_MODULE_NAME'=>'DockitElementReview','TEST_TARGET_NAME'=>'Runner','SWIFT_VERSION'=>'5.0','GENERATE_INFOPLIST_FILE'=>'YES','TARGETED_DEVICE_FAMILY'=>'1','IPHONEOS_DEPLOYMENT_TARGET'=>'15.0')}
project.save
scheme=Xcodeproj::XCScheme.new;scheme.add_build_target(app);scheme.add_test_target(t);scheme.set_launch_target(app);scheme.save_as(project.path,name,true)
